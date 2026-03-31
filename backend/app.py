"""
app.py – FastAPI application.
"""

import os
import hashlib
import io
import time
import json
import uuid
import re
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import data_store as ds
import rag as rag_module
import document_store as doc_module
from vectorstore import get_faq_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    ds.init_faqs()
    ds.init_users()
    from embeddings import preload_model
    preload_model()
    rag_module.init_faq_index()
    print("[App] Startup complete.")
    yield

app = FastAPI(title="AI FAQ RAG System", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173",
                   "http://localhost:5174","http://127.0.0.1:5174","*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


# ── Pydantic Models ───────────────────────────────────────────────────────────

class FAQCreate(BaseModel):
    question: str
    answer: str
    category: str
    company: str
    tags: list[str] = []

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    company: Optional[str] = None
    tags: Optional[list[str]] = None

class ChatRequest(BaseModel):
    query: str
    company: str = "All"
    user_id: str = "anonymous"
    history: list[dict] = []
    language_mode: str = "auto"   # "auto" | "en" | "hi"

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    email: str = ""

class ExpandRequest(BaseModel):
    question: str
    answer: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def faq_numeric_id(faq_id: str) -> int:
    return int(hashlib.md5(faq_id.encode()).hexdigest()[:8], 16) % (10**9)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "message": "AI FAQ RAG System v2 is running."}

# ── FAQ CRUD ──────────────────────────────────────────────────────────────────

@app.get("/api/faqs")
def list_faqs(company: str = Query(""), category: str = Query("")):
    faqs = ds.get_faqs()
    if company and company.lower() != "all":
        faqs = [f for f in faqs if f.get("company", "").lower() == company.lower()]
    if category:
        faqs = [f for f in faqs if f.get("category", "").lower() == category.lower()]
    return faqs

@app.post("/api/faqs", status_code=201)
def create_faq(body: FAQCreate):
    from embeddings import embed_one
    faq = ds.add_faq(body.question, body.answer, body.category, body.company, body.tags)
    vec = embed_one(faq["question"])
    get_faq_store().add_vector(faq_numeric_id(faq["id"]), vec)
    rag_module.clear_cache()
    return faq

@app.put("/api/faqs/{faq_id}")
def update_faq(faq_id: str, body: FAQUpdate):
    from embeddings import embed_one
    faq = ds.update_faq(faq_id, **{k: v for k, v in body.dict().items() if v is not None})
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    store = get_faq_store()
    store.remove_vector(faq_numeric_id(faq_id))
    vec = embed_one(faq["question"])
    store.add_vector(faq_numeric_id(faq["id"]), vec)
    rag_module.clear_cache()
    return faq

@app.delete("/api/faqs/{faq_id}")
def delete_faq(faq_id: str):
    ok = ds.delete_faq(faq_id)
    if not ok:
        raise HTTPException(status_code=404, detail="FAQ not found")
    get_faq_store().remove_vector(faq_numeric_id(faq_id))
    rag_module.clear_cache()
    return {"message": "Deleted"}

# ── Chat (non-streaming) ──────────────────────────────────────────────────────

@app.post("/api/chat")
def chat(body: ChatRequest):
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="Please enter a valid query.")
    start = time.time()
    result = rag_module.ask(body.query, company=body.company, history=body.history,
                            language_mode=body.language_mode)
    elapsed_ms = int((time.time() - start) * 1000)
    ds.add_history(user_id=body.user_id, question=body.query,
                   answer=result["answer"], company=body.company,
                   source=result["source"], response_time_ms=elapsed_ms)
    result["response_time_ms"] = elapsed_ms
    return result

# ── Chat (SSE streaming) ──────────────────────────────────────────────────────

@app.get("/api/chat_stream")
def chat_stream(query: str, company: str = "All", user_id: str = "anonymous",
               history: str = "[]", language_mode: str = "auto"):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Please enter a valid query.")
    try:
        hist = json.loads(history)
    except Exception:
        hist = []

    def event_generator():
        full_answer = []
        source = "llm"
        matched_faq = None
        source_file = None
        score = 0.0
        confidence = 0
        detected_lang = "en"
        start = time.time()

        for chunk in rag_module.ask_stream(query, company=company, history=hist,
                                           language_mode=language_mode):
            if isinstance(chunk, dict) and chunk.get("type") == "meta":
                source        = chunk.get("source", "llm")
                matched_faq   = chunk.get("matched_faq")
                source_file   = chunk.get("source_file")
                score         = chunk.get("score", 0.0)
                confidence    = chunk.get("confidence", 0)
                detected_lang = chunk.get("language", "en")
                meta_json = json.dumps({
                    "type": "meta", "source": source,
                    "matched_faq": matched_faq, "source_file": source_file,
                    "score": score, "confidence": confidence,
                    "language": detected_lang,
                    "cached": chunk.get("cached", False),
                })
                yield f"data: {meta_json}\n\n"
            elif isinstance(chunk, dict) and chunk.get("type") == "replace":
                # Hindi translation of the full answer — replace streamed English
                full_answer = [chunk["text"]]
                yield f"data: {json.dumps({'type': 'replace', 'text': chunk['text']})}\n\n"
            else:
                full_answer.append(str(chunk))
                yield f"data: {json.dumps({'type': 'token', 'text': str(chunk)})}\n\n"

        elapsed_ms = int((time.time() - start) * 1000)
        ds.add_history(user_id=user_id, question=query,
                       answer="".join(full_answer), company=company,
                       source=source, response_time_ms=elapsed_ms)
        yield f"data: {json.dumps({'type': 'done', 'response_time_ms': elapsed_ms, 'language': detected_lang})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ── AI Expansion (on-demand LLM explain) ──────────────────────────────────────

@app.post("/api/expand_answer")
def expand_answer(body: ExpandRequest):
    """
    User clicked 'Explain with AI' on a FAQ/document answer.
    Sends the original answer to the local LLM for a deeper, step-by-step explanation.
    """
    from llm import generate
    if not body.question.strip() or not body.answer.strip():
        raise HTTPException(status_code=400, detail="question and answer are required")

    prompt_context = (
        f"The following answer was retrieved from a FAQ database.\n\n"
        f"Question: {body.question}\n"
        f"Answer: {body.answer}\n\n"
        f"The user wants a more detailed explanation. "
        f"Provide a helpful, step-by-step explanation with examples or tips."
    )
    explanation = generate(body.question, context=prompt_context, history=[])
    return {"explanation": explanation}

# ── Users ─────────────────────────────────────────────────────────────────────

@app.get("/api/users")
def list_users():
    users = ds.get_users()
    return [{k: v for k, v in u.items() if k != "password"} for u in users]

@app.post("/api/users", status_code=201)
def create_user(body: UserCreate):
    return ds.add_user(body.username, body.password, body.role, body.email)

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str):
    ok = ds.delete_user(user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Deleted"}

# ── History ───────────────────────────────────────────────────────────────────

@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    return ds.get_history(user_id)

@app.get("/api/history")
def get_all_history():
    return ds.get_history()

# ── Bulk Import (CSV / Excel) ─────────────────────────────────────────────────

def _normalize_q(q: str) -> str:
    return re.sub(r"\s+", " ", q.lower().strip())

@app.post("/api/bulk_import")
async def bulk_import(file: UploadFile = File(...)):
    import pandas as pd
    from embeddings import embed

    start_time = time.time()
    content = await file.read()
    fname = file.filename.lower()

    # ── Read file with pandas ──────────────────────────────────────────────
    try:
        if fname.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content), dtype=str)
        else:
            df = pd.read_csv(io.StringIO(content.decode("utf-8", errors="replace")), dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    # Normalise column names
    df.columns = [c.strip().lower() for c in df.columns]
    required = {"question", "answer"}
    if not required.issubset(set(df.columns)):
        raise HTTPException(status_code=400,
                            detail=f"File must have columns: {required}. Found: {list(df.columns)}")

    df = df.fillna("")
    questions = df["question"].astype(str).str.strip().tolist()
    answers   = df["answer"].astype(str).str.strip().tolist()
    categories = df["category"].astype(str).str.strip().tolist() if "category" in df.columns else ["General"] * len(df)
    companies  = df["company"].astype(str).str.strip().tolist()  if "company"  in df.columns else ["Amazon"]  * len(df)
    tags_list  = df["tags"].astype(str).tolist()                 if "tags"     in df.columns else [""] * len(df)

    # ── Deduplication check ────────────────────────────────────────────────
    existing_faqs = ds.get_faqs()
    existing_norm = {_normalize_q(f["question"]) for f in existing_faqs}

    rows_to_add = []
    duplicates  = 0
    errors      = []

    for i, (q, a) in enumerate(zip(questions, answers)):
        if not q or not a:
            errors.append({"row": i + 2, "error": "Missing question or answer"})
            continue
        if _normalize_q(q) in existing_norm:
            duplicates += 1
            continue
        existing_norm.add(_normalize_q(q))   # prevent intra-file dupes too
        tags = [t.strip() for t in tags_list[i].split(",") if t.strip()] if i < len(tags_list) else []
        rows_to_add.append({
            "question": q, "answer": a,
            "category": categories[i] if categories[i] else "General",
            "company":  companies[i]  if companies[i]  else "Amazon",
            "tags": tags,
        })

    if not rows_to_add:
        elapsed = round(time.time() - start_time, 2)
        return {"imported": 0, "duplicates": duplicates, "errors": errors,
                "time_seconds": elapsed, "faqs": [],
                "message": f"No new FAQs to import ({duplicates} duplicates skipped)."}

    # ── Batch embed (local model, no API) ──────────────────────────────────
    texts = [f"Question: {r['question']} Answer: {r['answer']}" for r in rows_to_add]
    vecs  = embed(texts)   # (N, 384), batch_size=64 inside embed()

    # ── Save + index ───────────────────────────────────────────────────────
    store  = get_faq_store()
    added  = []
    for i, row in enumerate(rows_to_add):
        faq = ds.add_faq(row["question"], row["answer"],
                         row["category"], row["company"], row["tags"])
        store.add_vector(faq_numeric_id(faq["id"]), vecs[i])
        added.append(faq)

    rag_module.clear_cache()
    elapsed = round(time.time() - start_time, 2)

    return {
        "imported":       len(added),
        "duplicates":     duplicates,
        "errors":         errors,
        "time_seconds":   elapsed,
        "faqs":           added,
        "message":        f"OK Imported {len(added)} FAQs in {elapsed}s ({duplicates} duplicates skipped).",
    }

# ── Document Upload ───────────────────────────────────────────────────────────

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/upload_document")
async def upload_document(file: UploadFile = File(...), company: str = Form("All")):
    allowed = {".pdf", ".xlsx", ".xls"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    safe_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    contents  = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        num_chunks = doc_module.ingest(file_path, file.filename, company)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

    doc = ds.add_document(file.filename, company, num_chunks)
    return {"message": "Document ingested successfully", "document": doc, "chunks_indexed": num_chunks}

@app.get("/api/documents")
def list_documents():
    return ds.get_documents()

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    doc = ds.delete_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    num_deleted = doc_module.delete_document_chunks(doc["filename"])
    return {"message": "Deleted", "chunks_removed": num_deleted}

# ── Analytics ─────────────────────────────────────────────────────────────────

@app.get("/api/analytics")
def analytics():
    return ds.get_analytics()

# ── FAQ Suggestions ───────────────────────────────────────────────────────────

@app.get("/api/faq_suggestions")
def faq_suggestions():
    suggestions = ds.get_suggestions()
    return [s for s in suggestions if s.get("flagged") and not s.get("dismissed")]

@app.post("/api/faq_suggestions/{suggestion_id}/approve")
def approve_suggestion(suggestion_id: str, body: FAQCreate):
    from embeddings import embed_one
    ds.approve_suggestion(suggestion_id)
    faq = ds.add_faq(body.question, body.answer, body.category, body.company, body.tags)
    vec = embed_one(faq["question"])
    get_faq_store().add_vector(faq_numeric_id(faq["id"]), vec)
    rag_module.clear_cache()
    return {"message": "FAQ created from suggestion", "faq": faq}

@app.delete("/api/faq_suggestions/{suggestion_id}")
def dismiss_suggestion(suggestion_id: str):
    ds.dismiss_suggestion(suggestion_id)
    return {"message": "Dismissed"}

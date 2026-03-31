"""
document_store.py – Document ingestion pipeline for RAG.
Upload → Extract → Chunk (300 tokens / 50 overlap) → Embed → FAISS
"""

import os
import json
import uuid
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CHUNKS_FILE = os.path.join(DATA_DIR, "doc_chunks.json")
os.makedirs(DATA_DIR, exist_ok=True)


# ──────────────────────────────────────────────
# Text Extraction
# ──────────────────────────────────────────────

def extract_pdf_text(file_path: str) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts)
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}")


def extract_excel_text(file_path: str) -> str:
    try:
        import pandas as pd
        df = pd.read_excel(file_path, dtype=str)
        rows = []
        # Header
        rows.append(" | ".join(str(c) for c in df.columns))
        for _, row in df.iterrows():
            rows.append(" | ".join(str(v) for v in row.values))
        return "\n".join(rows)
    except Exception as e:
        raise RuntimeError(f"Excel extraction failed: {e}")


# ──────────────────────────────────────────────
# Chunking (300 tokens ≈ 300 words, 50 overlap)
# ──────────────────────────────────────────────

CHUNK_SIZE    = 300   # words (approx tokens for MiniLM tokenizer)
CHUNK_OVERLAP = 50

def chunk_text(text: str, source_file: str, company: str) -> list[dict]:
    words = text.split()
    chunks = []
    step = CHUNK_SIZE - CHUNK_OVERLAP
    for i in range(0, max(1, len(words)), step):
        chunk_words = words[i: i + CHUNK_SIZE]
        if not chunk_words:
            break
        chunk_text_str = " ".join(chunk_words)
        chunks.append({
            "chunk_id": str(uuid.uuid4()),
            "text": chunk_text_str,
            "source_file": source_file,
            "company": company,
            "word_start": i,
        })
    return chunks


# ──────────────────────────────────────────────
# Chunk metadata persistence
# ──────────────────────────────────────────────

def _load_chunks() -> list[dict]:
    if os.path.exists(CHUNKS_FILE):
        with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def _save_chunks(chunks: list[dict]):
    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)

def get_all_chunks() -> list[dict]:
    return _load_chunks()

def get_chunk_by_numeric_id(numeric_id: int) -> dict | None:
    chunks = _load_chunks()
    for c in chunks:
        if c.get("numeric_id") == numeric_id:
            return c
    return None


# ──────────────────────────────────────────────
# Ingest Pipeline
# ──────────────────────────────────────────────

def ingest(file_path: str, filename: str, company: str) -> int:
    """
    Full ingestion pipeline:
    1. Extract text from PDF / Excel
    2. Chunk into 300-token segments with 50-token overlap
    3. Embed each chunk
    4. Store in FAISS doc index (incremental)
    5. Persist chunk metadata to JSON

    Returns number of chunks indexed.
    """
    from embeddings import embed
    from vectorstore import get_doc_store

    # 1. Extract
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        text = extract_pdf_text(file_path)
    elif ext in (".xlsx", ".xls"):
        text = extract_excel_text(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    if not text.strip():
        raise ValueError("No text could be extracted from the file.")

    # 2. Chunk
    chunks = chunk_text(text, filename, company)

    # 3. Load existing chunks to assign numeric IDs
    existing = _load_chunks()
    next_id = max((c.get("numeric_id", 0) for c in existing), default=0) + 1

    doc_store = get_doc_store()

    new_chunks = []
    texts_to_embed = [c["text"] for c in chunks]

    # 4. Embed all at once (batch is faster)
    vecs = embed(texts_to_embed)  # shape (N, 384)

    for i, (chunk, vec) in enumerate(zip(chunks, vecs)):
        nid = next_id + i
        chunk["numeric_id"] = nid
        # 5. Add to FAISS doc store incrementally
        doc_store.add_vector(nid, vec)
        new_chunks.append(chunk)

    # 6. Persist metadata
    existing.extend(new_chunks)
    _save_chunks(existing)

    print(f"[DocStore] Ingested '{filename}': {len(new_chunks)} chunks indexed.")
    return len(new_chunks)

def delete_document_chunks(filename: str) -> int:
    """Removes all chunks for a given filename from the FAISS index and local metadata JSON."""
    from vectorstore import get_doc_store
    existing = _load_chunks()
    to_delete = [c for c in existing if c.get("source_file") == filename]
    
    if not to_delete:
        return 0
        
    doc_store = get_doc_store()
    for c in to_delete:
        if "numeric_id" in c:
            doc_store.remove_vector(c["numeric_id"])
            
    remaining = [c for c in existing if c.get("source_file") != filename]
    _save_chunks(remaining)
    print(f"[DocStore] Deleted '{filename}': {len(to_delete)} chunks removed.")
    return len(to_delete)

"""
rag.py – Unified RAG Pipeline (Cost-Optimized)

LLM-Last Strategy:
    Exact Match → Vector Search → BM25 → Hybrid Score → Threshold
    LLM only called when no DB match OR user clicks "Explain with AI"

Optimizations:
    - Query normalization (synonym map, lowercase)
    - Query cache with 10-minute TTL
    - LLM rate limiter (max 10 calls/min)
    - TOP_K = 3 (small prompt, fast, cheap)
    - Hybrid score = 0.7 * vector + 0.3 * BM25
"""

import os
import re
import time
import hashlib
import numpy as np
import sys

# Support `from utils.x import ...` when running from the backend dir
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from embeddings import embed_one
from vectorstore import get_faq_store, get_doc_store
from data_store import get_faqs, increment_hit, update_suggestion
from llm import generate, generate_stream
from utils.language import detect_lang
from utils.translation import to_english, to_hindi

# ── Config ────────────────────────────────────────────────────────────────────

RAG_THRESHOLD          = float(os.getenv("RAG_THRESHOLD", "0.75"))
DOC_THRESHOLD          = float(os.getenv("DOC_THRESHOLD", "0.30"))  # lower for documents (tabular/free-text)
COMPANY_BOOST          = 0.07   # subtle tiebreaker, not a score inflator
TOP_K                  = 3           # Keep LLM prompt small
MAX_LLM_CALLS_PER_MIN  = int(os.getenv("MAX_LLM_CALLS_PER_MIN", "10"))
CACHE_TTL              = 600         # 10 minutes

# ── Synonym map ───────────────────────────────────────────────────────────────

_SYNONYMS = {
    "parcel":               "order",
    "package":              "order",
    "shipment":             "order",
    "forgot password":      "reset password",
    "delivery not coming":  "delivery delay",
    "delivery not arrived": "delivery delay",
    "where is my order":    "track order",
    "where is my delivery": "track order",
    "track parcel":         "track order",
    "cancel":               "cancellation",
    "refund":               "return refund",
}

# ── Query Normalization ───────────────────────────────────────────────────────

def normalize_query(query: str) -> str:
    """Lowercase, strip punctuation, apply synonym map."""
    q = query.lower().strip()
    q = re.sub(r"[^\w\s]", "", q)          # remove punctuation
    q = re.sub(r"\s+", " ", q)             # collapse spaces
    for phrase, replacement in _SYNONYMS.items():
        q = q.replace(phrase, replacement)
    return q.strip()

# ── Query Cache (TTL = 10 min) ────────────────────────────────────────────────

_query_cache: dict[str, tuple] = {}   # key → (result_dict, timestamp)

def _cache_get(key: str) -> dict | None:
    if key in _query_cache:
        result, ts = _query_cache[key]
        if time.time() - ts < CACHE_TTL:
            print(f"[RAG] Cache HIT for: '{key[:40]}'")
            return result
        del _query_cache[key]   # expired
    return None

def _cache_set(key: str, result: dict):
    _query_cache[key] = (result, time.time())

def clear_cache():
    _query_cache.clear()

# ── LLM Rate Limiter ──────────────────────────────────────────────────────────

_llm_call_times: list[float] = []

def allow_llm_call() -> bool:
    """Sliding 60-second window. Returns False if limit exceeded."""
    now = time.time()
    _llm_call_times[:] = [t for t in _llm_call_times if now - t < 60]
    if len(_llm_call_times) < MAX_LLM_CALLS_PER_MIN:
        _llm_call_times.append(now)
        return True
    print(f"[RAG] LLM rate limit reached ({MAX_LLM_CALLS_PER_MIN}/min).")
    return False

_RATE_LIMIT_MSG = (
    "⚠️ The AI is temporarily busy due to high usage. "
    "Your question has been noted. Please try again in a minute, "
    "or rephrase to find a database answer."
)

# ── BM25 Helper ───────────────────────────────────────────────────────────────

def _bm25_score(query: str, texts: list[str]) -> np.ndarray:
    try:
        from rank_bm25 import BM25Okapi
        tokenized = [t.lower().split() for t in texts]
        bm25 = BM25Okapi(tokenized)
        scores = bm25.get_scores(query.lower().split())
        mx = scores.max() if scores.max() > 0 else 1.0
        return scores / mx
    except Exception:
        return np.zeros(len(texts))

# ── FAQ Search ────────────────────────────────────────────────────────────────

def _faq_numeric_id(faq_id: str) -> int:
    return int(hashlib.md5(faq_id.encode()).hexdigest()[:8], 16) % (10**9)


def _search_faqs(query: str, norm_query: str, company: str) -> dict | None:
    """
    1. Exact match on original query
    2. Vector search (TOP_K=3)
    3. BM25 re-rank
    4. Company boost
    5. Threshold check
    """
    faqs = get_faqs()
    if not faqs:
        return None

    # 1. Exact match (original + normalised)
    for faq in faqs:
        if (query.strip().lower() == faq["question"].strip().lower() or
                norm_query == normalize_query(faq["question"])):
            print(f"[RAG] EXACT MATCH: '{faq['question'][:50]}'")
            return {"faq": faq, "score": 1.0}

    # 2. Vector scores
    faq_store = get_faq_store()
    query_vec = embed_one(norm_query)
    raw_results = (faq_store.search(query_vec, k=len(faqs))
                   if faq_store.index.ntotal > 0 else [])
    vec_scores = {nid: sc for nid, sc in raw_results}

    # 3. BM25 scores
    texts = [f["question"] + " " + f["answer"] for f in faqs]
    bm25_sc = _bm25_score(norm_query, texts)

    best_score = -1.0
    best_faq = None

    all_vec_zero = max(vec_scores.values(), default=0.0) == 0.0

    for i, faq in enumerate(faqs):
        nid = _faq_numeric_id(faq["id"])
        vec_score = vec_scores.get(nid, 0.0)

        if all_vec_zero:
            hybrid = float(bm25_sc[i])
        else:
            hybrid = 0.7 * vec_score + 0.3 * float(bm25_sc[i])

        print(f"[RAG] '{faq['question'][:30]}' | Vec:{vec_score:.3f} BM25:{bm25_sc[i]:.3f} Hybrid:{hybrid:.3f}")

        # Company boost — only apply when base match is already meaningful
        if (hybrid >= 0.65
                and company and company.lower() not in ("all", "")
                and faq.get("company", "").lower() == company.lower()):
            hybrid += COMPANY_BOOST

        if hybrid > best_score:
            best_score = hybrid
            best_faq = faq

    print(f"[RAG] Best={best_score:.3f} Threshold={RAG_THRESHOLD}")

    if best_score >= RAG_THRESHOLD and best_faq:
        return {"faq": best_faq, "score": best_score}
    return None

# ── Document Search ───────────────────────────────────────────────────────────

def _search_docs(norm_query: str, company: str) -> dict | None:
    from document_store import get_all_chunks
    doc_store = get_doc_store()
    query_vec = embed_one(norm_query)
    raw_results = doc_store.search(query_vec, k=TOP_K)
    if not raw_results:
        return None

    all_chunks = get_all_chunks()
    id_map = {c["numeric_id"]: c for c in all_chunks if "numeric_id" in c}

    candidates = [(id_map[nid], sc) for nid, sc in raw_results if nid in id_map]
    if not candidates:
        return None

    texts = [c[0]["text"] for c in candidates]
    bm25_sc = _bm25_score(norm_query, texts)

    best_score = -1.0
    best_chunk = None
    for i, (chunk, vec_score) in enumerate(candidates):
        hybrid = 0.7 * vec_score + 0.3 * float(bm25_sc[i])
        if (hybrid >= 0.65
                and company and company.lower() not in ("all", "")
                and chunk.get("company", "").lower() == company.lower()):
            hybrid += COMPANY_BOOST
        if hybrid > best_score:
            best_score = hybrid
            best_chunk = chunk

    if best_score >= DOC_THRESHOLD and best_chunk:
        return {"chunk": best_chunk, "score": best_score}
    return None

# ── Public API ────────────────────────────────────────────────────────────────

def ask(query: str, company: str = "All", history: list[dict] = None,
        language_mode: str = "auto") -> dict:
    history = history or []

    # ── Language detection & query translation ────────────────────────────────
    if language_mode == "hi":
        user_lang = "hi"
    elif language_mode == "en":
        user_lang = "en"
    else:  # "auto"
        user_lang = detect_lang(query)

    search_query = to_english(query) if user_lang == "hi" else query
    norm_q = normalize_query(search_query)

    # Cache key uses original (translated) query so Hindi and English hits
    # share the same cache slot.
    cache_key = f"{norm_q}::{company.lower()}"
    cached = _cache_get(cache_key)
    if cached:
        answer = cached["answer"]
        if user_lang == "hi" and cached.get("language", "en") != "hi":
            answer = to_hindi(answer)
        return {**cached, "cached": True, "answer": answer, "language": user_lang}

    # 1. FAQ search
    faq_result = _search_faqs(search_query, norm_q, company)
    if faq_result:
        faq = faq_result["faq"]
        increment_hit(faq["id"])
        answer = faq["answer"]
        if user_lang == "hi":
            answer = to_hindi(answer)
        result = {
            "answer": answer,
            "source": "faq",
            "matched_faq": faq,
            "source_file": None,
            "score": faq_result["score"],
            "confidence": round(min(faq_result["score"], 1.0) * 100),
            "is_suggestion": False,
            "cached": False,
            "language": user_lang,
        }
        _cache_set(cache_key, result)
        return result

    # 2. Document search
    doc_result = _search_docs(norm_q, company)
    if doc_result:
        chunk = doc_result["chunk"]
        if not allow_llm_call():
            result = {
                "answer": _RATE_LIMIT_MSG,
                "source": "llm",
                "matched_faq": None,
                "source_file": None,
                "score": 0.0,
                "confidence": 0,
                "is_suggestion": False,
                "cached": False,
                "language": user_lang,
            }
            return result
        context = chunk["text"]
        answer = generate(search_query, context=context, history=history)
        # Translate LLM-generated answer to Hindi (model generates better in English)
        if user_lang == "hi":
            answer = to_hindi(answer)
        result = {
            "answer": answer,
            "source": "document",
            "matched_faq": None,
            "source_file": chunk.get("source_file"),
            "score": doc_result["score"],
            "confidence": round(min(doc_result["score"], 1.0) * 100),
            "is_suggestion": False,
            "cached": False,
            "language": user_lang,
        }
        _cache_set(cache_key, result)
        return result

    # Intercept basic greetings
    if norm_q in ("hi", "hello", "hey", "greetings", "good morning", "good evening",
                  "namaste", "namaskar", "नमस्ते"):
        if user_lang == "hi":
            greet = "नमस्ते! मैं आपका AI सहायक हूँ। आपके ऑर्डर या खाते के बारे में मैं आपकी कैसे मदद कर सकता हूँ?"
        else:
            greet = "Hello! I am your AI assistant. How can I help you with your orders or account today?"
        result = {
            "answer": greet, "source": "llm", "matched_faq": None,
            "source_file": None, "score": 1.0, "confidence": 100,
            "is_suggestion": False, "cached": False, "language": user_lang,
        }
        _cache_set(cache_key, result)
        return result

    # 3. LLM fallback
    update_suggestion(query)
    if not allow_llm_call():
        return {
            "answer": _RATE_LIMIT_MSG,
            "source": "llm",
            "matched_faq": None,
            "source_file": None,
            "score": 0.0,
            "confidence": 0,
            "is_suggestion": True,
            "cached": False,
            "language": user_lang,
        }
    answer = generate(search_query, context="", history=history)
    # Translate LLM-generated answer to Hindi
    if user_lang == "hi":
        answer = to_hindi(answer)
    return {
        "answer": answer,
        "source": "llm",
        "matched_faq": None,
        "source_file": None,
        "score": 0.0,
        "confidence": 0,
        "is_suggestion": True,
        "cached": False,
        "language": user_lang,
    }


def ask_stream(query: str, company: str = "All", history: list[dict] = None,
               language_mode: str = "auto"):
    """
    Streaming version. Yields:
        dict  {"type": "meta", ...}  – first
        str   token chunks
    """
    history = history or []

    # ── Language detection & query translation ────────────────────────────────
    if language_mode == "hi":
        user_lang = "hi"
    elif language_mode == "en":
        user_lang = "en"
    else:
        user_lang = detect_lang(query)

    search_query = to_english(query) if user_lang == "hi" else query
    norm_q = normalize_query(search_query)

    # Cache check — stream cached answer token by token
    cache_key = f"{norm_q}::{company.lower()}"
    cached = _cache_get(cache_key)
    if cached:
        answer = cached["answer"]
        if user_lang == "hi" and cached.get("language", "en") != "hi":
            answer = to_hindi(answer)
        yield {"type": "meta", "source": cached["source"],
               "matched_faq": cached.get("matched_faq"),
               "source_file": cached.get("source_file"),
               "score": cached.get("score", 0.0),
               "confidence": cached.get("confidence", 0),
               "language": user_lang, "cached": True}
        yield answer
        return

    # 1. FAQ
    faq_result = _search_faqs(search_query, norm_q, company)
    if faq_result:
        faq = faq_result["faq"]
        increment_hit(faq["id"])
        score = faq_result["score"]
        answer = faq["answer"]
        if user_lang == "hi":
            answer = to_hindi(answer)
        result = {
            "answer": answer, "source": "faq",
            "matched_faq": faq, "source_file": None,
            "score": score, "confidence": round(min(score, 1.0) * 100),
            "is_suggestion": False, "cached": False, "language": user_lang,
        }
        _cache_set(cache_key, result)
        yield {"type": "meta", "source": "faq", "matched_faq": faq,
               "source_file": None, "score": score,
               "confidence": result["confidence"], "language": user_lang, "cached": False}
        yield answer
        return

    # 2. Documents
    doc_result = _search_docs(norm_q, company)
    if doc_result:
        chunk = doc_result["chunk"]
        score = doc_result["score"]
        if not allow_llm_call():
            yield {"type": "meta", "source": "llm", "matched_faq": None,
                   "source_file": None, "score": 0.0, "confidence": 0,
                   "language": user_lang, "cached": False}
            yield _RATE_LIMIT_MSG
            return
        context = chunk["text"]
        yield {"type": "meta", "source": "document", "matched_faq": None,
               "source_file": chunk.get("source_file"), "score": score,
               "confidence": round(min(score, 1.0) * 100), "language": user_lang, "cached": False}
        full = []
        for token in generate_stream(search_query, context=context, history=history):
            full.append(token)
            yield token
        full_answer = "".join(full)
        # Translate completed LLM answer to Hindi
        if user_lang == "hi":
            full_answer = to_hindi(full_answer)
            # Yield translated answer as a replacement (frontend replaces streamed text)
            yield {"type": "replace", "text": full_answer}
        _cache_set(cache_key, {
            "answer": full_answer, "source": "document",
            "matched_faq": None, "source_file": chunk.get("source_file"),
            "score": score, "confidence": round(min(score, 1.0) * 100),
            "is_suggestion": False, "cached": False, "language": user_lang,
        })
        return

    # Intercept basic greetings
    if norm_q in ("hi", "hello", "hey", "greetings", "good morning", "good evening",
                  "namaste", "namaskar", "नमस्ते"):
        if user_lang == "hi":
            greet = "नमस्ते! मैं आपका AI सहायक हूँ। आपके ऑर्डर या खाते के बारे में मैं आपकी कैसे मदद कर सकता हूँ?"
        else:
            greet = "Hello! I am your AI assistant. How can I help you with your orders or account today?"
        yield {"type": "meta", "source": "llm", "matched_faq": None,
               "source_file": None, "score": 1.0, "confidence": 100,
               "language": user_lang, "cached": False}
        for word in greet.split(" "):
            yield word + " "
        _cache_set(cache_key, {
            "answer": greet, "source": "llm", "matched_faq": None,
            "source_file": None, "score": 1.0, "confidence": 100,
            "is_suggestion": False, "cached": False, "language": user_lang,
        })
        return

    # 3. LLM fallback
    update_suggestion(query)
    if not allow_llm_call():
        yield {"type": "meta", "source": "llm", "matched_faq": None,
               "source_file": None, "score": 0.0, "confidence": 0,
               "language": user_lang, "cached": False}
        yield _RATE_LIMIT_MSG
        return
    yield {"type": "meta", "source": "llm", "matched_faq": None,
           "source_file": None, "score": 0.0, "confidence": 0,
           "language": user_lang, "cached": False}
    full = []
    for token in generate_stream(search_query, context="", history=history):
        full.append(token)
        yield token
    # Translate completed LLM answer to Hindi
    if user_lang == "hi":
        full_answer = to_hindi("".join(full))
        yield {"type": "replace", "text": full_answer}


# ── Index init ────────────────────────────────────────────────────────────────

def init_faq_index():
    """Build FAQ vector index at startup if empty."""
    faq_store = get_faq_store()
    faqs = get_faqs()

    if faq_store.index.ntotal > 0:
        print(f"[RAG] FAQ index has {faq_store.index.ntotal} vectors.")
        return
    if not faqs:
        print("[RAG] No FAQs to index.")
        return

    from embeddings import embed
    questions = [f["question"] for f in faqs]
    vecs = embed(questions)
    ids = [_faq_numeric_id(f["id"]) for f in faqs]
    faq_store.build(ids, vecs)
    print(f"[RAG] Built FAQ index with {len(faqs)} entries.")

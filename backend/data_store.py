"""
data_store.py – JSON-backed singleton store for FAQs, Users, History,
                Chat Analytics, and FAQ Suggestions.
"""

import json
import os
import uuid
from datetime import datetime
from threading import Lock

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

FAQS_FILE    = os.path.join(DATA_DIR, "faqs.json")
USERS_FILE   = os.path.join(DATA_DIR, "users.json")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
DOCS_FILE    = os.path.join(DATA_DIR, "documents.json")
SUGGEST_FILE = os.path.join(DATA_DIR, "suggestions.json")
ANALYTICS_FILE = os.path.join(DATA_DIR, "analytics.json")

_lock = Lock()

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _load(path: str, default):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default

def _save(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ──────────────────────────────────────────────
# SEED DATA
# ──────────────────────────────────────────────

SEED_FAQS = [
    # Amazon
    {"id": "f001", "question": "How can I track my Amazon order?", "answer": "Go to Your Orders on Amazon and click 'Track Package' next to the relevant order. You can also use the tracking number with the courier's website.", "category": "Orders", "company": "Amazon", "tags": ["tracking", "order", "delivery"], "hit_count": 0},
    {"id": "f002", "question": "How do I return a product on Amazon?", "answer": "Go to Your Orders → select the item → click 'Return or Replace Items' → choose the reason and submit. A return label will be emailed to you.", "category": "Returns", "company": "Amazon", "tags": ["return", "refund", "replace"], "hit_count": 0},
    {"id": "f003", "question": "What is Amazon's refund policy?", "answer": "Most items sold on Amazon are eligible for refund within 30 days of delivery. Refunds are processed within 3–5 business days after the return is received.", "category": "Billing", "company": "Amazon", "tags": ["refund", "billing", "policy"], "hit_count": 0},
    {"id": "f004", "question": "How do I reset my Amazon account password?", "answer": "Go to Amazon.in → click 'Sign In' → 'Forgot your password?' → enter your email or mobile number → follow the OTP instructions.", "category": "Account", "company": "Amazon", "tags": ["password", "reset", "account"], "hit_count": 0},
    {"id": "f005", "question": "How can I contact Amazon customer support?", "answer": "You can contact Amazon support via: 1) Help → Contact Us on the website  2) Amazon app → Menu → Customer Service  3) Phone: 1800-3000-9009 (toll free)", "category": "Support", "company": "Amazon", "tags": ["contact", "support", "help"], "hit_count": 0},
    # Flipkart
    {"id": "f006", "question": "How do I track my Flipkart order?", "answer": "Open the Flipkart app or website → My Orders → select your order → click 'Track'. You'll see live courier updates.", "category": "Orders", "company": "Flipkart", "tags": ["tracking", "order", "delivery"], "hit_count": 0},
    {"id": "f007", "question": "What is Flipkart's return policy?", "answer": "Flipkart offers a 7-day return window on most products. To initiate, go to My Orders → select item → 'Return'. The pick-up is scheduled within 1–2 business days.", "category": "Returns", "company": "Flipkart", "tags": ["return", "refund", "policy"], "hit_count": 0},
    {"id": "f008", "question": "How to cancel an order on Flipkart?", "answer": "Go to My Orders on Flipkart → select the order → tap 'Cancel'. You can cancel before the order is shipped. Refund is processed within 7 business days.", "category": "Orders", "company": "Flipkart", "tags": ["cancel", "order"], "hit_count": 0},
    {"id": "f009", "question": "How do I reset my Flipkart password?", "answer": "On the Flipkart login page, click 'Forgot?' next to the password field → enter your registered email or mobile → receive OTP → set a new password.", "category": "Account", "company": "Flipkart", "tags": ["password", "account", "reset"], "hit_count": 0},
    # Myntra
    {"id": "f010", "question": "How do I return a product on Myntra?", "answer": "Go to My Orders in the Myntra app → select the item → tap 'Return' → select a reason → schedule a pick-up. The amount is refunded within 7–10 days.", "category": "Returns", "company": "Myntra", "tags": ["return", "refund"], "hit_count": 0},
    {"id": "f011", "question": "How can I track my Myntra delivery?", "answer": "Open Myntra → My Orders → click the order → 'Track Shipment'. You will see real-time courier status.", "category": "Orders", "company": "Myntra", "tags": ["tracking", "delivery", "order"], "hit_count": 0},
    {"id": "f012", "question": "What sizes are available on Myntra?", "answer": "Myntra stocks sizes XS to 5XL for clothing. Each product page shows a size chart. Use the 'Size & Fit' section for measurements.", "category": "Products", "company": "Myntra", "tags": ["size", "fitting", "clothing"], "hit_count": 0},
]

SEED_USERS = [
    {"id": "u001", "username": "admin",   "password": "admin123", "role": "admin",  "email": "admin@faqsystem.com",  "created_at": "2026-01-01T00:00:00"},
    {"id": "u002", "username": "user",    "password": "user123",  "role": "user",   "email": "user@example.com",     "created_at": "2026-01-01T00:00:00"},
    {"id": "u003", "username": "garvit",  "password": "garvit123","role": "user",   "email": "garvit@example.com",   "created_at": "2026-01-01T00:00:00"},
]

# ──────────────────────────────────────────────
# FAQ Store
# ──────────────────────────────────────────────

def get_faqs():
    return _load(FAQS_FILE, [])

def save_faqs(faqs):
    _save(FAQS_FILE, faqs)

def init_faqs():
    if not os.path.exists(FAQS_FILE):
        _save(FAQS_FILE, SEED_FAQS)

def add_faq(question, answer, category, company, tags=None):
    with _lock:
        faqs = get_faqs()
        faq = {
            "id": str(uuid.uuid4()),
            "question": question,
            "answer": answer,
            "category": category,
            "company": company,
            "tags": tags or [],
            "hit_count": 0,
            "created_at": datetime.utcnow().isoformat(),
        }
        faqs.append(faq)
        save_faqs(faqs)
        return faq

def update_faq(faq_id, **kwargs):
    with _lock:
        faqs = get_faqs()
        for i, f in enumerate(faqs):
            if f["id"] == faq_id:
                faqs[i].update(kwargs)
                faqs[i]["updated_at"] = datetime.utcnow().isoformat()
                save_faqs(faqs)
                return faqs[i]
        return None

def delete_faq(faq_id):
    with _lock:
        faqs = get_faqs()
        new_faqs = [f for f in faqs if f["id"] != faq_id]
        if len(new_faqs) == len(faqs):
            return False
        save_faqs(new_faqs)
        return True

def increment_hit(faq_id):
    with _lock:
        faqs = get_faqs()
        for f in faqs:
            if f["id"] == faq_id:
                f["hit_count"] = f.get("hit_count", 0) + 1
                save_faqs(faqs)
                return

# ──────────────────────────────────────────────
# User Store
# ──────────────────────────────────────────────

def get_users():
    return _load(USERS_FILE, [])

def save_users(users):
    _save(USERS_FILE, users)

def init_users():
    if not os.path.exists(USERS_FILE):
        _save(USERS_FILE, SEED_USERS)

def add_user(username, password, role, email):
    with _lock:
        users = get_users()
        user = {
            "id": str(uuid.uuid4()),
            "username": username,
            "password": password,
            "role": role,
            "email": email,
            "created_at": datetime.utcnow().isoformat(),
        }
        users.append(user)
        save_users(users)
        return user

def delete_user(user_id):
    with _lock:
        users = get_users()
        new_users = [u for u in users if u["id"] != user_id]
        if len(new_users) == len(users):
            return False
        save_users(new_users)
        return True

# ──────────────────────────────────────────────
# History Store
# ──────────────────────────────────────────────

def get_history(user_id=None):
    history = _load(HISTORY_FILE, [])
    if user_id:
        return [h for h in history if h.get("user_id") == user_id]
    return history

def add_history(user_id, question, answer, company, source, response_time_ms=0):
    with _lock:
        history = _load(HISTORY_FILE, [])
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "question": question,
            "answer": answer,
            "company": company,
            "source": source,  # "faq" | "document" | "llm"
            "response_time_ms": response_time_ms,
            "timestamp": datetime.utcnow().isoformat(),
        }
        history.append(record)
        _save(HISTORY_FILE, history)
        _update_analytics(source, response_time_ms, question)
        return record

# ──────────────────────────────────────────────
# Analytics
# ──────────────────────────────────────────────

def _update_analytics(source, response_time_ms, question):
    analytics = _load(ANALYTICS_FILE, {
        "total_questions": 0,
        "faq_hits": 0,
        "doc_hits": 0,
        "llm_hits": 0,
        "total_response_time_ms": 0,
        "query_counts": {},
        "unanswered": {}
    })
    analytics["total_questions"] += 1
    analytics["total_response_time_ms"] += response_time_ms
    q = question.lower().strip()
    analytics["query_counts"][q] = analytics["query_counts"].get(q, 0) + 1
    if source == "faq":
        analytics["faq_hits"] += 1
    elif source == "document":
        analytics["doc_hits"] += 1
    else:
        analytics["llm_hits"] += 1
        analytics["unanswered"][q] = analytics["unanswered"].get(q, 0) + 1
    _save(ANALYTICS_FILE, analytics)

def get_analytics():
    faqs = get_faqs()
    history = _load(HISTORY_FILE, [])
    users = get_users()
    analytics = _load(ANALYTICS_FILE, {
        "total_questions": 0, "faq_hits": 0, "doc_hits": 0,
        "llm_hits": 0, "total_response_time_ms": 0,
        "query_counts": {}, "unanswered": {}
    })
    total_q = analytics["total_questions"]
    faq_rate = round((analytics["faq_hits"] + analytics["doc_hits"]) / total_q * 100, 1) if total_q else 0
    avg_rt   = round(analytics["total_response_time_ms"] / total_q, 0) if total_q else 0
    # top asked queries
    top_queries = sorted(analytics["query_counts"].items(), key=lambda x: x[1], reverse=True)[:10]
    # top unanswered
    top_unanswered = sorted(analytics["unanswered"].items(), key=lambda x: x[1], reverse=True)[:10]
    # FAQ ranking
    faq_ranking = sorted(faqs, key=lambda f: f.get("hit_count", 0), reverse=True)[:10]
    # company breakdown
    company_data = {}
    for h in history:
        c = h.get("company", "All")
        company_data[c] = company_data.get(c, 0) + 1

    return {
        "total_faqs": len(faqs),
        "total_questions": total_q,
        "faq_hit_rate_pct": faq_rate,
        "avg_response_time_ms": avg_rt,
        "unique_users": len(set(h.get("user_id") for h in history)),
        "top_queries": [{"query": q, "count": c} for q, c in top_queries],
        "top_unanswered": [{"query": q, "count": c} for q, c in top_unanswered],
        "faq_ranking": [{"id": f["id"], "question": f["question"], "company": f["company"], "hits": f.get("hit_count", 0)} for f in faq_ranking],
        "company_breakdown": [{"company": c, "questions": n} for c, n in company_data.items()],
    }

# ──────────────────────────────────────────────
# Document metadata store
# ──────────────────────────────────────────────

def get_documents():
    return _load(DOCS_FILE, [])

def add_document(filename, company, num_chunks):
    with _lock:
        docs = get_documents()
        doc = {
            "id": str(uuid.uuid4()),
            "filename": filename,
            "company": company,
            "num_chunks": num_chunks,
            "uploaded_at": datetime.utcnow().isoformat(),
        }
        docs.append(doc)
        _save(DOCS_FILE, docs)
        return doc

def delete_document(doc_id):
    with _lock:
        docs = get_documents()
        doc = next((d for d in docs if d["id"] == doc_id), None)
        if not doc:
            return None
        new_docs = [d for d in docs if d["id"] != doc_id]
        _save(DOCS_FILE, new_docs)
        return doc

# ──────────────────────────────────────────────
# FAQ Suggestions (Smart Learning)
# ──────────────────────────────────────────────

def get_suggestions():
    return _load(SUGGEST_FILE, [])

def update_suggestion(question):
    """Track repeated unanswered questions; flag if asked >= 3 times."""
    with _lock:
        suggestions = _load(SUGGEST_FILE, [])
        q_lower = question.lower().strip()
        for s in suggestions:
            if s["question_lower"] == q_lower:
                s["count"] += 1
                s["flagged"] = s["count"] >= 3
                _save(SUGGEST_FILE, suggestions)
                return
        suggestions.append({
            "id": str(uuid.uuid4()),
            "question": question,
            "question_lower": q_lower,
            "count": 1,
            "flagged": False,
            "dismissed": False,
            "created_at": datetime.utcnow().isoformat(),
        })
        _save(SUGGEST_FILE, suggestions)

def approve_suggestion(suggestion_id):
    with _lock:
        suggestions = _load(SUGGEST_FILE, [])
        for s in suggestions:
            if s["id"] == suggestion_id:
                s["dismissed"] = True
                _save(SUGGEST_FILE, suggestions)
                return s
        return None

def dismiss_suggestion(suggestion_id):
    with _lock:
        suggestions = _load(SUGGEST_FILE, [])
        new = [s for s in suggestions if s["id"] != suggestion_id]
        _save(SUGGEST_FILE, new)

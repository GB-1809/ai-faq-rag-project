"""
utils/language.py – Language detection utility.

Uses langdetect to identify the language of a given user query.
Supports Hindi ("hi") and English ("en"). Falls back to "en" on any error.

Also contains helpers to classify Hinglish text:
Hinglish (Hindi written in Latin script) is treated as Hindi.
"""

from __future__ import annotations

import re


# ── Hinglish keyword heuristic ────────────────────────────────────────────────
# Common Hindi words written in Roman script (Hinglish)
_HINGLISH_KEYWORDS = {
    "kya", "kaise", "kab", "kyun", "kyunki", "kahan", "kaha", "mera", "meri",
    "mujhe", "mere", "aap", "apna", "apni", "apne", "tumhara", "tumhari",
    "hoga", "hogi", "hain", "hai", "tha", "thi", "the", "nahi", "nahin",
    "abhi", "jaldi", "jab", "tab", "sirf", "par", "ke", "ka", "ki", "ko",
    "se", "me", "main", "yeh", "woh", "unka", "unki", "unke", "sab",
    "kuch", "bahut", "bhi", "lekin", "aur", "ya", "agar", "toh", "bata",
    "chahiye", "chahti", "chahta", "lagata", "lagti", "milega", "milegi",
    "order", "diya", "diye", "status", "ayega", "ayegi", "bheja", "bhejaa",
    "maal", "saman", "paise", "wापस", "refund", "return", "cancel", "lagao",
}


def _is_hinglish(text: str) -> bool:
    """Returns True if the text contains common Hinglish words in Roman script."""
    words = re.findall(r"\b\w+\b", text.lower())
    matches = sum(1 for w in words if w in _HINGLISH_KEYWORDS)
    # If 2+ Hinglish keywords found, treat as Hinglish → Hindi
    return matches >= 2


def detect_lang(text: str) -> str:
    """
    Detect the language of the input text.

    Returns:
        "hi"  – if Hindi (Devanagari script OR Hinglish) is detected
        "en"  – English (default fallback)
    """
    if not text or not text.strip():
        return "en"

    # 1. Check for Devanagari script (Unicode range: U+0900–U+097F)
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"

    # 2. Hinglish heuristic
    if _is_hinglish(text):
        return "hi"

    # 3. Use langdetect as third signal
    try:
        from langdetect import detect, LangDetectException
        lang = detect(text)
        if lang == "hi":
            return "hi"
    except Exception:
        pass

    return "en"

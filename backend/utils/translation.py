"""
utils/translation.py – Translation utilities using deep-translator.

All functions are safe: on any failure they return the original text unchanged.
This ensures the system degrades gracefully without breaking the RAG pipeline.

Dependencies:
    pip install deep-translator
"""

from __future__ import annotations


def _translate(text: str, source: str, target: str) -> str:
    """Internal: translate `text` from `source` lang → `target` lang."""
    if not text or not text.strip():
        return text
    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source=source, target=target).translate(text)
        return translated if translated else text
    except Exception as e:
        print(f"[Translation] Failed ({source}→{target}): {e}")
        return text  # Graceful fallback – return original


def to_english(text: str) -> str:
    """
    Translate the given text to English.
    If already English or on failure, returns unchanged text.
    """
    return _translate(text, source="auto", target="en")


def to_hindi(text: str) -> str:
    """
    Translate the given text to Hindi.
    If already Hindi or on failure, returns unchanged text.
    """
    return _translate(text, source="en", target="hi")

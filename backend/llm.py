"""
llm.py – Ollama local LLM integration (free, offline, no rate limits).
Default model: qwen2:1.5b (~1GB — good quality, fits 8GB RAM).
Ollama must be running: https://ollama.com
"""

import os
import json
import requests
from typing import Generator

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "qwen2:1.5b")


def _is_ollama_running() -> bool:
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def _build_prompt(query: str, context: str, history: list[dict],
                  lang_instruction: str = "") -> str:
    history_text = ""
    for h in history[-3:]:
        history_text += f"User: {h.get('question', '')}\nAssistant: {h.get('answer', '')}\n\n"

    # ── System instruction ────────────────────────────────────────────────
    if "Hindi" in lang_instruction:
        system = (
            "You are a helpful AI assistant. You MUST reply ONLY in Hindi (Devanagari script). "
            "Do NOT use English words. Use शुद्ध हिंदी only.\n"
            "Example — Q: भारत की राजधानी क्या है? A: भारत की राजधानी नई दिल्ली है।\n"
        )
    else:
        system = "You are a helpful AI assistant. Answer clearly and concisely.\n"

    # ── Context section ───────────────────────────────────────────────────
    context_section = ""
    if context:
        context_section = f"""Use the context below if it is relevant to the question.
If the answer is found in the context, use it directly.
If the answer is NOT in the context, say exactly "Not found in database." on the first line, then provide a helpful answer using your general knowledge.

Context:
{context}

"""

    prompt = f"""{system}
{context_section}{"Previous conversation:\n" + history_text if history_text else ""}Question: {query}
{lang_instruction}
Answer:"""
    return prompt.strip()


def generate(query: str, context: str = "", history: list[dict] = None,
             lang_instruction: str = "") -> str:
    """Non-streaming generation via Ollama."""
    history = history or []

    if not _is_ollama_running():
        return (
            "⚠️ [Ollama not running] Please start Ollama and make sure the model is pulled.\n"
            "Run: `ollama serve` and `ollama pull qwen2:0.5b`"
        )

    prompt = _build_prompt(query, context, history, lang_instruction)
    try:
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except requests.exceptions.Timeout:
        return "⚠️ [Ollama Timeout] The model took too long to respond. Try again."
    except Exception as e:
        return f"[LLM Error: {e}]"


def generate_stream(query: str, context: str = "", history: list[dict] = None,
                    lang_instruction: str = "") -> Generator[str, None, None]:
    """Streaming token-by-token generation via Ollama."""
    history = history or []

    if not _is_ollama_running():
        msg = (
            "⚠️ [Ollama not running] Please start Ollama and make sure the model is pulled. "
            "Run: ollama serve  and  ollama pull qwen2:0.5b"
        )
        for word in msg.split(" "):
            yield word + " "
        return

    prompt = _build_prompt(query, context, history, lang_instruction)
    try:
        with requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": True},
            stream=True,
            timeout=120,
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        token = data.get("response", "")
                        if token:
                            yield token
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
    except requests.exceptions.Timeout:
        yield "⚠️ [Ollama Timeout] The model took too long to respond."
    except Exception as e:
        yield f"[LLM Error: {e}]"

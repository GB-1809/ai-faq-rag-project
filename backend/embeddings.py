"""
embeddings.py – Local SentenceTransformer embeddings (no API, no rate limits).

Model: paraphrase-multilingual-MiniLM-L12-v2  (384-dim, L2-normalised, ~120MB)
       Supports 50+ languages including Hindi for direct cross-lingual search.
Speed: ~15ms per query on CPU
Cost:  FREE — runs fully offline after first download
"""

import numpy as np

DIM = 384  # paraphrase-multilingual-MiniLM-L12-v2 output dimension

_model = None
_embed_cache: dict[str, np.ndarray] = {}   # text → vec (1, 384)


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("[Embeddings] Loading paraphrase-multilingual-MiniLM-L12-v2 (first load may take a moment)…")
            _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
            print("[Embeddings] Model loaded OK")
        except Exception as e:
            print(f"[Embeddings] Could not load model: {e}")
    return _model


def preload_model():
    """Call at startup to warm the model before first request."""
    _get_model()


def embed(texts: list[str]) -> np.ndarray:
    """
    Return L2-normalised float32 embeddings (N, 384).
    Uses per-text cache to avoid re-embedding identical strings.
    """
    if not texts:
        return np.empty((0, DIM), dtype=np.float32)

    model = _get_model()
    if model is None:
        print("[Embeddings] Model unavailable – returning zero vectors.")
        return np.zeros((len(texts), DIM), dtype=np.float32)

    # Separate cached vs uncached texts
    result = [None] * len(texts)
    to_encode_idx = []
    to_encode_txt = []

    for i, t in enumerate(texts):
        if t in _embed_cache:
            result[i] = _embed_cache[t]
        else:
            to_encode_idx.append(i)
            to_encode_txt.append(t)

    if to_encode_txt:
        try:
            vecs = model.encode(
                to_encode_txt,
                batch_size=64,
                normalize_embeddings=True,   # L2-normalised
                show_progress_bar=len(to_encode_txt) > 50,
                convert_to_numpy=True,
            ).astype(np.float32)

            for local_i, global_i in enumerate(to_encode_idx):
                v = vecs[local_i]
                _embed_cache[to_encode_txt[local_i]] = v
                result[global_i] = v

        except Exception as e:
            print(f"[Embeddings] Encode error: {e}")
            zero = np.zeros(DIM, dtype=np.float32)
            for global_i in to_encode_idx:
                result[global_i] = zero

    return np.array(result, dtype=np.float32)


def embed_one(text: str) -> np.ndarray:
    """Embed a single string, return shape (1, 384)."""
    return embed([text])

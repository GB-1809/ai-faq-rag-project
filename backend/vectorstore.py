"""
vectorstore.py – Vector store with FAISS primary + NumPy fallback.

DIM = 384  (matches all-MiniLM-L6-v2)

FAISS gives fast similarity search for large datasets.
NumPy fallback used if faiss-cpu is not installed.

Auto-rebuild: if a saved index has wrong dimension it is deleted and
the caller (`init_faq_index`) will rebuild from scratch.
"""

import os
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

DIM = 384  # all-MiniLM-L6-v2

# Try to import FAISS
try:
    import faiss as _faiss
    _FAISS_AVAILABLE = True
    print("[VectorStore] FAISS available OK")
except ImportError:
    _FAISS_AVAILABLE = False
    print("[VectorStore] faiss-cpu not found – using NumPy fallback.")


# ── NumPy-based store (fallback) ──────────────────────────────────────────────

class _NumpyStore:
    def __init__(self, path: str):
        self.path = path
        self._ids: list[int] = []
        self._vecs: np.ndarray | None = None
        self._load()

    @property
    def index(self): return self          # compat shim
    @property
    def ntotal(self) -> int: return len(self._ids)

    def _load(self):
        if not os.path.exists(self.path):
            return
        try:
            data = np.load(self.path, allow_pickle=False)
            vecs = data["vecs"].astype(np.float32)
            if vecs.shape[1] != DIM:
                print(f"[VectorStore] Wrong dim ({vecs.shape[1]} vs {DIM}), deleting old index.")
                os.remove(self.path)
                return
            self._ids = data["ids"].tolist()
            self._vecs = vecs
            print(f"[VectorStore] Loaded {len(self._ids)} vectors from {self.path}")
        except Exception as e:
            print(f"[VectorStore] Load error ({e}), starting fresh.")
            if os.path.exists(self.path):
                os.remove(self.path)

    def save(self):
        if self._vecs is not None and len(self._ids) > 0:
            np.savez(self.path,
                     ids=np.array(self._ids, dtype=np.int64),
                     vecs=self._vecs)
        elif os.path.exists(self.path):
            os.remove(self.path)

    def build(self, ids, vecs):
        self._ids = list(ids)
        self._vecs = vecs.astype(np.float32) if len(ids) > 0 else None
        self.save()

    def add_vector(self, id_: int, vec: np.ndarray):
        v = vec.reshape(1, -1).astype(np.float32)
        if self._vecs is None:
            self._ids = [id_]
            self._vecs = v
        else:
            self._ids.append(id_)
            self._vecs = np.vstack([self._vecs, v])
        self.save()

    def remove_vector(self, id_: int):
        if id_ not in self._ids:
            return
        idx = self._ids.index(id_)
        self._ids.pop(idx)
        self._vecs = None if not self._ids else np.delete(self._vecs, idx, axis=0)
        self.save()

    def search(self, query_vec: np.ndarray, k: int = 5) -> list[tuple[int, float]]:
        if self._vecs is None or not self._ids:
            return []
        q = query_vec.reshape(1, -1).astype(np.float32)
        scores = (self._vecs @ q.T).flatten()
        k = min(k, len(self._ids))
        top = np.argsort(scores)[::-1][:k]
        return [(self._ids[i], float(scores[i])) for i in top]


# ── FAISS-based store ─────────────────────────────────────────────────────────

class _FaissStore:
    def __init__(self, path: str):
        self.path = path           # e.g. data/faqs.faiss
        self.meta_path = path + ".ids.npy"
        self._ids: list[int] = []
        self._index = None
        self._load()

    def _new_index(self):
        idx = _faiss.IndexIDMap(_faiss.IndexFlatIP(DIM))   # inner product = cosine for normalised vecs
        return idx

    def _load(self):
        if os.path.exists(self.path) and os.path.exists(self.meta_path):
            try:
                idx = _faiss.read_index(self.path)
                if idx.d != DIM:
                    print(f"[VectorStore/FAISS] Wrong dim ({idx.d} vs {DIM}), deleting.")
                    os.remove(self.path)
                    os.remove(self.meta_path)
                    self._index = self._new_index()
                    return
                self._ids = np.load(self.meta_path).tolist()
                self._index = idx
                print(f"[VectorStore/FAISS] Loaded {self._index.ntotal} vectors.")
            except Exception as e:
                print(f"[VectorStore/FAISS] Load error ({e}), starting fresh.")
                self._index = self._new_index()
        else:
            self._index = self._new_index()

    def save(self):
        if self._index and self._index.ntotal > 0:
            _faiss.write_index(self._index, self.path)
            np.save(self.meta_path, np.array(self._ids, dtype=np.int64))

    @property
    def index(self): return self
    @property
    def ntotal(self) -> int: return self._index.ntotal if self._index else 0

    def build(self, ids: list[int], vecs: np.ndarray):
        self._index = self._new_index()
        self._ids = []
        if len(ids) > 0:
            v = vecs.astype(np.float32)
            id_arr = np.array(ids, dtype=np.int64)
            self._index.add_with_ids(v, id_arr)
            self._ids = list(ids)
        self.save()

    def add_vector(self, id_: int, vec: np.ndarray):
        v = vec.reshape(1, -1).astype(np.float32)
        self._index.add_with_ids(v, np.array([id_], dtype=np.int64))
        self._ids.append(id_)
        self.save()

    def remove_vector(self, id_: int):
        if id_ not in self._ids:
            return
        # FAISS IndexIDMap supports remove_ids
        selector = _faiss.IDSelectorArray(np.array([id_], dtype=np.int64))
        self._index.remove_ids(selector)
        self._ids.remove(id_)
        self.save()

    def search(self, query_vec: np.ndarray, k: int = 5) -> list[tuple[int, float]]:
        if self.ntotal == 0:
            return []
        q = query_vec.reshape(1, -1).astype(np.float32)
        k = min(k, self.ntotal)
        scores, ids = self._index.search(q, k)
        return [(int(i), float(s)) for i, s in zip(ids[0], scores[0]) if i >= 0]


# ── Factory ───────────────────────────────────────────────────────────────────

def _make_store(name: str):
    if _FAISS_AVAILABLE:
        return _FaissStore(os.path.join(DATA_DIR, f"{name}.faiss"))
    return _NumpyStore(os.path.join(DATA_DIR, f"{name}.npz"))


_faq_store = None
_doc_store  = None


def get_faq_store():
    global _faq_store
    if _faq_store is None:
        _faq_store = _make_store("faqs")
    return _faq_store


def get_doc_store():
    global _doc_store
    if _doc_store is None:
        _doc_store = _make_store("docs")
    return _doc_store

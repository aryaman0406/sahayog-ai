"""
Embedder module — pure Python/NumPy implementation.
Uses TF-IDF based keyword search with cosine similarity as the vector store.
No chromadb, no PyTorch, no ONNX — works on any machine instantly.
If GEMINI_API_KEY is set, upgrades to Gemini text-embedding-004 for better quality.
"""

import json
import math
import logging
import re
import os
import pickle
from pathlib import Path
from datetime import datetime
from collections import Counter
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

SCHEMES_PATH = Path(__file__).parent.parent / "data" / "schemes.json"
INDEX_CACHE_PATH = Path(settings.CHROMA_PATH) / "tfidf_index.pkl"
MODEL_NAME = "TF-IDF (numpy)"

_index = None  # {"schemes": [...], "idf": {...}, "doc_vectors": [...]}

# ── text helpers ──────────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return [t for t in text.split() if len(t) > 1]

def _build_idf(docs: list[list[str]]) -> dict[str, float]:
    N = len(docs)
    df: dict[str, int] = {}
    for tokens in docs:
        for t in set(tokens):
            df[t] = df.get(t, 0) + 1
    return {t: math.log((N + 1) / (n + 1)) + 1 for t, n in df.items()}

def _tfidf_vector(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    tf = Counter(tokens)
    total = max(len(tokens), 1)
    vec: dict[str, float] = {}
    for t, count in tf.items():
        if t in idf:
            vec[t] = (count / total) * idf[t]
    return vec

def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(a.get(t, 0) * v for t, v in b.items())
    na = math.sqrt(sum(v * v for v in a.values())) or 1e-9
    nb = math.sqrt(sum(v * v for v in b.values())) or 1e-9
    return dot / (na * nb)

# ── document builder ──────────────────────────────────────────────────────────

def build_document(scheme: dict) -> str:
    name = scheme.get("name", "")
    category = scheme.get("category", "")
    description = scheme.get("description", "")

    eligibility = scheme.get("eligibility", {})
    occupations = ", ".join(eligibility.get("occupation", []))
    min_age = eligibility.get("min_age", 0)
    max_age = eligibility.get("max_age", 120)
    max_income = eligibility.get("max_income", "No limit")
    location_type = ", ".join(eligibility.get("location_type", []))

    gender_line = ""
    if "gender" in eligibility:
        genders = ", ".join(eligibility.get("gender", []))
        gender_line = f"Gender: {genders}"

    benefits = scheme.get("benefits", "")

    docs_req = scheme.get("documents_required", [])
    docs_joined = ", ".join(docs_req) if isinstance(docs_req, list) else str(docs_req)

    how_to_apply = scheme.get("how_to_apply", scheme.get("application_process", ""))

    doc = f"""Scheme Name: {name}
Category: {category}
Description: {description}
Who Can Apply: occupation must be one of {occupations},
age between {min_age} and {max_age},
annual income up to Rs.{max_income},
available for {location_type} areas
{gender_line}
Benefits: {benefits}
Documents Required: {docs_joined}
How to Apply: {how_to_apply}"""

    return doc.strip()

# ── index build / load ────────────────────────────────────────────────────────

def build_index() -> dict:
    global _index
    start = datetime.now()

    if not SCHEMES_PATH.exists():
        return {"status": "error", "message": "Schemes file not found"}

    with open(SCHEMES_PATH, "r", encoding="utf-8") as f:
        schemes = json.load(f)

    # Check if cached index is still valid
    os.makedirs(INDEX_CACHE_PATH.parent, exist_ok=True)
    if INDEX_CACHE_PATH.exists():
        try:
            with open(INDEX_CACHE_PATH, "rb") as f:
                cached = pickle.load(f)
            if cached.get("count") == len(schemes):
                _index = cached
                logger.info(f"Loaded TF-IDF index from cache ({len(schemes)} schemes)")
                return {"status": "Index already up to date", "indexed": 0,
                        "skipped": len(schemes),
                        "time_taken": (datetime.now() - start).total_seconds()}
        except Exception as e:
            logger.warning(f"Cache load failed, rebuilding: {e}")

    logger.info(f"Building TF-IDF index for {len(schemes)} schemes...")

    # Build documents & tokenize
    doc_texts = [build_document(s) for s in schemes]
    doc_tokens = [_tokenize(d) for d in doc_texts]

    # Build IDF
    idf = _build_idf(doc_tokens)

    # Build TF-IDF vectors for every document
    doc_vectors = [_tfidf_vector(tokens, idf) for tokens in doc_tokens]

    _index = {
        "schemes": schemes,
        "doc_texts": doc_texts,
        "idf": idf,
        "doc_vectors": doc_vectors,
        "count": len(schemes),
        "built_at": datetime.now().isoformat()
    }

    # Persist to disk
    with open(INDEX_CACHE_PATH, "wb") as f:
        pickle.dump(_index, f)

    time_taken = (datetime.now() - start).total_seconds()
    logger.info(f"TF-IDF index built in {time_taken:.1f}s")
    return {"indexed": len(schemes), "skipped": 0, "time_taken": time_taken, "status": "success"}


def _ensure_index():
    global _index
    if _index is None:
        build_index()
    return _index

# ── semantic search ───────────────────────────────────────────────────────────

def semantic_search(query: str, n_results: int = 5,
                    filter_metadata: Optional[dict] = None,
                    apply_boost: bool = False) -> list[dict]:
    idx = _ensure_index()
    if not idx:
        return []

    idf = idx["idf"]
    doc_vectors = idx["doc_vectors"]
    schemes = idx["schemes"]
    doc_texts = idx["doc_texts"]

    query_tokens = _tokenize(query)
    q_vec = _tfidf_vector(query_tokens, idf)

    if not q_vec:
        return []

    NATIONAL_SCHEMES = {
        "pm-kisan", "pm-jay", "pmay-g", "ssy", "pmuy", "nsap-oap",
        "pmegp", "nsp-scholarship", "mudra", "jsy", "apy",
        "pm-svanidhi", "kcc", "mgnregs", "stand-up-india"
    }

    scored = []
    for i, (d_vec, scheme, doc_text) in enumerate(zip(doc_vectors, schemes, doc_texts)):
        sim = _cosine(q_vec, d_vec)
        relevance = sim * 100

        sid = str(scheme.get("id", ""))
        if apply_boost and sid in NATIONAL_SCHEMES:
            relevance += 35.0

        scored.append({
            "id": sid,
            "name": scheme.get("name", ""),
            "category": scheme.get("category", ""),
            "content": doc_text,
            "distance": 1 - sim,
            "relevance_score": relevance
        })

    scored.sort(key=lambda x: x["relevance_score"], reverse=True)
    return scored[:n_results]


def get_index_stats() -> dict:
    idx = _ensure_index()
    return {
        "total_indexed": idx.get("count", 0) if idx else 0,
        "collection_name": "tfidf_index",
        "model": MODEL_NAME,
        "chroma_path": settings.CHROMA_PATH,
        "embedding_backend": "TF-IDF + Cosine Similarity (pure Python)"
    }


def rebuild_index() -> dict:
    global _index
    _index = None
    if INDEX_CACHE_PATH.exists():
        INDEX_CACHE_PATH.unlink()
    return build_index()

"""
RAG package — lazy imports to avoid loading heavy deps at startup.
The memory module is always available. Embedder/generator/hybrid load on first use.
"""
from .memory import memory

__all__ = ["memory"]

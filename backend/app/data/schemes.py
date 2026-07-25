import json
import os
from datetime import datetime
from typing import List, Dict, Optional

# In-memory cache
_SCHEMES_CACHE = None
_SCHEMES_BY_ID = {}   # O(1) lookup dict
_LAST_LOADED = None

def _load_schemes() -> List[Dict]:
    global _SCHEMES_CACHE, _SCHEMES_BY_ID, _LAST_LOADED
    if _SCHEMES_CACHE is not None:
        return _SCHEMES_CACHE

    file_path = os.path.join(os.path.dirname(__file__), "schemes.json")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            _SCHEMES_CACHE = json.load(f)
            _LAST_LOADED = datetime.now()
        # Build O(1) lookup index once
        _SCHEMES_BY_ID = {str(s.get("id")): s for s in _SCHEMES_CACHE}
    except FileNotFoundError:
        _SCHEMES_CACHE = []
        _SCHEMES_BY_ID = {}
        _LAST_LOADED = datetime.now()

    return _SCHEMES_CACHE

def get_all_schemes() -> List[Dict]:
    return _load_schemes()

def get_scheme_by_id(id: str) -> Optional[Dict]:
    _load_schemes()  # ensures cache is built
    return _SCHEMES_BY_ID.get(str(id))

def search_schemes(query: str) -> List[Dict]:
    schemes = _load_schemes()
    query_lower = query.lower()
    return [
        s for s in schemes
        if query_lower in s.get("name", "").lower()
        or query_lower in s.get("description", "").lower()
    ]

def get_schemes_by_category(category: str) -> List[Dict]:
    schemes = _load_schemes()
    return [s for s in schemes if str(s.get("category", "")).lower() == category.lower()]

def get_stats() -> Dict:
    schemes = _load_schemes()
    categories = {}
    for scheme in schemes:
        cat = scheme.get("category", "Uncategorized")
        categories[cat] = categories.get(cat, 0) + 1
    return {
        "total": len(schemes),
        "categories": categories,
        "last_loaded": _LAST_LOADED.isoformat() if _LAST_LOADED else None
    }

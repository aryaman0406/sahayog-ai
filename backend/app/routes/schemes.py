from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.config import settings
from app.data.schemes import get_all_schemes, get_stats, get_scheme_by_id, search_schemes, get_schemes_by_category

def _get_index_stats():
    try:
        from app.rag.embedder import get_index_stats
        return get_index_stats()
    except Exception as e:
        return {"error": str(e)}

def _rag_rebuild_index():
    from app.rag.embedder import rebuild_index
    return rebuild_index()

def _semantic_search(query, n_results=4):
    try:
        from app.rag.embedder import semantic_search
        return semantic_search(query, n_results=n_results)
    except Exception:
        return []

router = APIRouter(prefix="/api/schemes", tags=["schemes"])

@router.get("/")
async def get_schemes(category: Optional[str] = None, search: Optional[str] = None, limit: int = 50, skip: int = 0):
    if search:
        schemes = search_schemes(search)
    elif category:
        schemes = get_schemes_by_category(category)
    else:
        schemes = get_all_schemes()
        
    total = len(schemes)
    paginated = schemes[skip:skip+limit]
    
    all_schemes = get_all_schemes()
    categories_available = list(set([s.get("category", "") for s in all_schemes if s.get("category")]))
    
    return {
        "total": total,
        "schemes": paginated,
        "categories_available": categories_available
    }

@router.get("/stats")
async def get_schemes_stats():
    base_stats = get_stats()
    index_stats = _get_index_stats()
    base_stats.update({"rag": index_stats})
    return base_stats

@router.get("/categories")
async def get_categories():
    stats = get_stats()
    return stats.get("categories", {})

@router.get("/admin/rebuild-index")
async def rebuild_index(x_admin_key: str = Header(None)):
    if x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    result = _rag_rebuild_index()
    return result

@router.get("/{scheme_id}")
async def get_scheme(scheme_id: str):
    scheme = get_scheme_by_id(scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
        
    description = scheme.get("description", "")
    similar = _semantic_search(description, n_results=4)
    filtered_similar = [s for s in similar if str(s["id"]) != str(scheme_id)][:3]
    
    result = scheme.copy()
    result["similar_schemes"] = filtered_similar
    return result

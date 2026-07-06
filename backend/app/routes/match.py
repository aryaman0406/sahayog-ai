from fastapi import APIRouter
from pydantic import BaseModel
from app.models import MatchRequest
from app.data.matcher import score_scheme
from app.data.schemes import get_scheme_by_id

def _hybrid_search(*args, **kwargs):
    try:
        from app.rag.hybrid import hybrid_search
        return hybrid_search(*args, **kwargs)
    except Exception:
        return []

def _semantic_search(query, n_results=5):
    try:
        from app.rag.embedder import semantic_search
        return semantic_search(query, n_results=n_results)
    except Exception:
        return []

router = APIRouter(prefix="/api/match", tags=["match"])

class SemanticRequest(BaseModel):
    query: str
    n_results: int = 5

@router.post("/")
async def match_hybrid(request: MatchRequest):
    profile = request.model_dump()
    query = f"{profile.get('occupation', '')} {profile.get('location_type', '')} welfare schemes"
    
    matches = _hybrid_search(query=query, profile=profile, n_results=10)
    
    return {
        "profile_summary": profile,
        "matches_found": len(matches),
        "matches": matches,
        "search_type": "hybrid"
    }

@router.post("/semantic")
async def match_semantic(request: SemanticRequest):
    results = _semantic_search(request.query, request.n_results)
    return results

@router.post("/explain/{scheme_id}")
async def explain_match(scheme_id: str, profile: MatchRequest):
    scheme = get_scheme_by_id(scheme_id)
    if not scheme:
        return {"error": "Scheme not found"}
        
    score, reasons = score_scheme(profile.model_dump(), scheme)
    
    missing_criteria = []
    if score == 0:
        missing_criteria = reasons
        reasons = []
        recommendation = "You do not meet the primary eligibility criteria."
    elif score < 50:
        recommendation = "You meet some criteria, but might not be fully eligible."
    else:
        recommendation = "You appear to be a strong candidate for this scheme."
        
    return {
        "scheme_id": scheme_id,
        "scheme_name": scheme.get("name", ""),
        "score": score,
        "reasons": reasons,
        "missing_criteria": missing_criteria,
        "recommendation": recommendation
    }

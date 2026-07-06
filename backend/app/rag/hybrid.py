from .embedder import semantic_search
from app.data.matcher import match_schemes
from app.data.schemes import get_scheme_by_id

def hybrid_search(query: str, profile: dict, n_results: int = 5) -> list[dict]:
    # Step 1 - Semantic search
    semantic_results = semantic_search(query, n_results=10)
    semantic_ids = {str(r["id"]): r["relevance_score"] for r in semantic_results}
    
    # Step 2 - Rule-based matching
    rule_results = match_schemes(profile)
    rule_ids = {str(r["scheme"]["id"]): r["match_score"] for r in rule_results}
    
    # Step 3 - Merge and score
    all_ids = set(semantic_ids.keys()) | set(rule_ids.keys())
    
    scored = []
    for scheme_id in all_ids:
        semantic_score = semantic_ids.get(scheme_id, 0) * 0.4
        rule_score = rule_ids.get(scheme_id, 0) * 0.5
        overlap_bonus = 15 if (scheme_id in semantic_ids and scheme_id in rule_ids) else 0
        final = semantic_score + rule_score + overlap_bonus
        
        scored.append({
            "scheme_id": scheme_id,
            "final_score": round(final, 2),
            "semantic_score": round(semantic_score, 2),
            "rule_score": round(rule_score, 2),
            "overlap_bonus": overlap_bonus
        })
        
    # Step 4 - Enrich with full scheme data
    enriched = []
    for s in scored:
        scheme_data = get_scheme_by_id(s["scheme_id"])
        if scheme_data:
            reasons = []
            for r in rule_results:
                if str(r["scheme"]["id"]) == s["scheme_id"]:
                    reasons = r.get("reasons", [])
                    break
            
            enriched.append({
                "scheme": scheme_data,
                "final_score": s["final_score"],
                "semantic_score": s["semantic_score"],
                "rule_score": s["rule_score"],
                "overlap_bonus": s["overlap_bonus"],
                "reasons": reasons
            })
            
    enriched.sort(key=lambda x: x["final_score"], reverse=True)
    return enriched[:n_results]

from typing import Tuple, List, Dict

def score_scheme(profile: Dict, scheme: Dict) -> Tuple[int, List[str]]:
    score = 0
    reasons = []
    
    eligibility = scheme.get("eligibility", {})
    
    # Occupation: 40pts
    scheme_occupations = eligibility.get("occupation", [])
    profile_occ = profile.get("occupation", "").lower()
    
    if "any" in [o.lower() for o in scheme_occupations]:
        score += 40
        reasons.append("Occupation criteria met ('any' accepted)")
    elif profile_occ in [o.lower() for o in scheme_occupations]:
        score += 40
        reasons.append(f"Occupation '{profile_occ}' matches scheme requirements")
    else:
        return (0, ["Occupation mismatch"])
        
    # Age: 20pts
    min_age = eligibility.get("min_age", 0)
    max_age = eligibility.get("max_age", 120)
    profile_age = profile.get("age", 0)
    
    if min_age <= profile_age <= max_age:
        score += 20
        reasons.append(f"Age {profile_age} is within required range ({min_age}-{max_age})")
    else:
        return (0, ["Age outside range"])
        
    # Income: 25pts
    max_income = eligibility.get("max_income", float('inf'))
    profile_income = profile.get("annual_income", 0)
    
    if profile_income <= max_income:
        score += 25
        reasons.append(f"Income {profile_income} is within limit ({max_income})")
    else:
        return (0, ["Income exceeds limit"])
        
    # Gender: 10pts
    if "gender" in eligibility:
        scheme_genders = eligibility.get("gender", [])
        profile_gender = profile.get("gender", "").lower()
        
        if profile_gender in [g.lower() for g in scheme_genders] or "any" in [g.lower() for g in scheme_genders]:
            score += 10
            reasons.append("Gender criteria met")
        else:
            return (0, ["Gender criteria not met"])
            
    # Location: 5pts
    scheme_locations = eligibility.get("location_type", [])
    if scheme_locations:
        profile_location = profile.get("location_type", "").lower()
        
        if profile_location in [l.lower() for l in scheme_locations] or "any" in [l.lower() for l in scheme_locations]:
            score += 5
            reasons.append(f"Location type '{profile_location}' matches requirements")
            
    return (score, reasons)

def match_schemes(profile: Dict) -> List[Dict]:
    from app.data.schemes import get_all_schemes
    
    schemes = get_all_schemes()
    matched = []
    
    for scheme in schemes:
        score, reasons = score_scheme(profile, scheme)
        if score > 0:
            matched.append({
                "scheme": scheme,
                "match_score": score,
                "reasons": reasons
            })
            
    # Sort descending by score
    matched.sort(key=lambda x: x["match_score"], reverse=True)
    return matched

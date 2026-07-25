from typing import Tuple, List, Dict

def score_scheme(profile: Dict, scheme: Dict) -> Tuple[int, List[str]]:
    score = 0
    reasons = []

    eligibility = scheme.get("eligibility", {})

    # Occupation: 40pts
    scheme_occupations = [o.lower() for o in eligibility.get("occupation", [])]
    profile_occ = profile.get("occupation", "").lower()

    if "any" in scheme_occupations:
        score += 40
        reasons.append("Occupation criteria met ('any' accepted)")
    elif profile_occ in scheme_occupations:
        score += 40
        reasons.append(f"Occupation '{profile_occ}' matches scheme requirements")
    else:
        return (0, ["Occupation mismatch"])

    # Age: 20pts
    profile_age = profile.get("age", 0)
    if eligibility.get("min_age", 0) <= profile_age <= eligibility.get("max_age", 120):
        score += 20
        reasons.append(f"Age {profile_age} is within required range")
    else:
        return (0, ["Age outside range"])

    # Income: 25pts
    profile_income = profile.get("annual_income", 0)
    if profile_income <= eligibility.get("max_income", float('inf')):
        score += 25
        reasons.append(f"Income within limit")
    else:
        return (0, ["Income exceeds limit"])

    # Gender: 10pts
    if "gender" in eligibility:
        scheme_genders = [g.lower() for g in eligibility.get("gender", [])]
        profile_gender = profile.get("gender", "").lower()
        if profile_gender in scheme_genders or "any" in scheme_genders:
            score += 10
            reasons.append("Gender criteria met")
        else:
            return (0, ["Gender criteria not met"])

    # Location: 5pts
    scheme_locations = [l.lower() for l in eligibility.get("location_type", [])]
    if scheme_locations:
        profile_location = profile.get("location_type", "").lower()
        if profile_location in scheme_locations or "any" in scheme_locations:
            score += 5
            reasons.append(f"Location type '{profile_location}' matches")

    return (score, reasons)


# Pre-built occupation index: { occupation_name -> [scheme, ...] }
_OCCUPATION_INDEX: Dict[str, List[Dict]] = {}
_INDEX_BUILT = False

def _build_occupation_index():
    global _OCCUPATION_INDEX, _INDEX_BUILT
    if _INDEX_BUILT:
        return
    from app.data.schemes import get_all_schemes
    for scheme in get_all_schemes():
        occs = [o.lower() for o in scheme.get("eligibility", {}).get("occupation", [])]
        for occ in occs:
            _OCCUPATION_INDEX.setdefault(occ, []).append(scheme)
    _INDEX_BUILT = True


def match_schemes(profile: Dict) -> List[Dict]:
    _build_occupation_index()

    profile_occ = profile.get("occupation", "").lower()

    # Only score schemes relevant to this occupation + "any"
    candidates = list({
        id(s): s
        for s in (_OCCUPATION_INDEX.get(profile_occ, []) + _OCCUPATION_INDEX.get("any", []))
    }.values())

    matched = []
    for scheme in candidates:
        score, reasons = score_scheme(profile, scheme)
        if score > 0:
            matched.append({
                "scheme": scheme,
                "match_score": score,
                "reasons": reasons
            })

    matched.sort(key=lambda x: x["match_score"], reverse=True)
    return matched

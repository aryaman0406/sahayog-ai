"""
Profile Extractor — Extracts structured user profile fields from natural language.

Uses Gemini for intelligent extraction when available, with a comprehensive
regex+keyword fallback for all 8 supported Indian languages.
"""

import re
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


# ── Multilingual keyword maps ─────────────────────────────────────────────────

OCCUPATION_KEYWORDS: Dict[str, list[str]] = {
    "farmer": [
        "farmer", "farming", "kisan", "agriculture", "agricultural",
        "किसान", "खेती", "कृषक",                       # Hindi
        "விவசாயி", "விவசாயம்",                          # Tamil
        "शेतकरी", "शेती",                                # Marathi
        "কৃষক", "চাষী",                                   # Bengali
        "రైతు", "వ్యవసాయం",                                # Telugu
        "ರೈತ", "ಕೃಷಿ",                                    # Kannada
        "ખેડૂત", "ખેતી",                                  # Gujarati
    ],
    "student": [
        "student", "studying", "college", "university", "school",
        "छात्र", "विद्यार्थी", "पढ़ाई",                    # Hindi
        "மாணவர்", "மாணவி", "படிப்பு",                     # Tamil
        "विद्यार्थी", "शिक्षार्थी",                        # Marathi
        "ছাত্র", "ছাত্রী", "পড়াশোনা",                      # Bengali
        "విద్యార్థి",                                      # Telugu
        "ವಿದ್ಯಾರ್ಥಿ",                                     # Kannada
        "વિદ્યાર્થી",                                     # Gujarati
    ],
    "self-employed": [
        "self-employed", "self employed", "business", "shop", "shopkeeper",
        "entrepreneur", "startup", "vendor", "trader",
        "स्वरोजगार", "व्यापार", "दुकान", "व्यापारी", "दुकानदार",  # Hindi
        "சொந்தத் தொழில்", "தொழிலதிபர்",                         # Tamil
        "स्वयंरोजगार", "व्यापारी", "दुकानदार",                    # Marathi
        "ব্যবসা", "দোকানদার", "স্বনিযুক্ত",                       # Bengali
        "వ్యాపారి", "స్వయం ఉపాధి",                                # Telugu
        "ವ್ಯಾಪಾರಿ", "ಸ್ವಯಂ ಉದ್ಯೋಗ",                              # Kannada
        "વેપારી", "સ્વરોજગાર",                                   # Gujarati
    ],
    "unemployed": [
        "unemployed", "jobless", "no job", "without job", "berozgar",
        "बेरोजगार",                          # Hindi
        "வேலையில்லா",                         # Tamil
        "बेरोजगार",                           # Marathi
        "বেকার",                               # Bengali
        "నిరుద్యోగి",                           # Telugu
        "ನಿರುದ್ಯೋಗಿ",                          # Kannada
        "બેરોજગાર",                            # Gujarati
    ],
    "salaried": [
        "salaried", "salary", "employee", "job", "working", "employed",
        "service", "naukri", "private", "government job", "govt job",
        "नौकरी", "कर्मचारी", "वेतनभोगी", "सेवा",   # Hindi
        "வேலை", "ஊழியர்", "சம்பளம்",                 # Tamil
        "नोकरी", "कर्मचारी",                          # Marathi
        "চাকরি", "কর্মচারী", "বেতনভোগী",                # Bengali
        "ఉద్యోగి", "జీతం",                              # Telugu
        "ಉದ್ಯೋಗಿ", "ವೇತನ",                              # Kannada
        "નોકરી", "કર્મચારી", "પગારદાર",                  # Gujarati
    ],
}

GENDER_KEYWORDS: Dict[str, list[str]] = {
    "male": [
        "male", "man", "boy",
        "पुरुष", "आदमी", "लड़का",        # Hindi
        "ஆண்", "ஆடவர்",                  # Tamil
        "पुरुष", "मुलगा",                 # Marathi
        "পুরুষ", "ছেলে",                   # Bengali
        "పురుషుడు",                        # Telugu
        "ಪುರುಷ",                          # Kannada
        "પુરુષ",                           # Gujarati
    ],
    "female": [
        "female", "woman", "girl", "lady", "mahila",
        "महिला", "औरत", "लड़की", "स्त्री",    # Hindi
        "பெண்", "மகளிர்",                     # Tamil
        "महिला", "स्त्री", "मुलगी",            # Marathi
        "মহিলা", "মেয়ে",                       # Bengali
        "మహిళ", "స్త్రీ",                      # Telugu
        "ಮಹಿಳೆ", "ಹೆಣ್ಣು",                    # Kannada
        "મહિલા", "સ્ત્રી",                    # Gujarati
    ],
}

LOCATION_KEYWORDS: Dict[str, list[str]] = {
    "rural": [
        "rural", "village", "gram", "gaon", "panchayat",
        "गाँव", "ग्रामीण", "गांव", "देहात",       # Hindi
        "கிராமம்", "கிராமப்புறம்",                  # Tamil
        "गाव", "ग्रामीण",                           # Marathi
        "গ্রাম", "গ্রামীণ",                          # Bengali
        "గ్రామం", "పల్లె",                            # Telugu
        "ಗ್ರಾಮ", "ಹಳ್ಳಿ",                            # Kannada
        "ગામ", "ગ્રામીણ",                             # Gujarati
    ],
    "urban": [
        "urban", "city", "town", "metro", "municipal", "nagar",
        "शहर", "शहरी", "नगर",                # Hindi
        "நகரம்", "நகர்ப்புறம்",                # Tamil
        "शहर", "नगर",                         # Marathi
        "শহর", "নগর",                          # Bengali
        "నగరం", "పట్టణం",                      # Telugu
        "ನಗರ", "ಪಟ್ಟಣ",                        # Kannada
        "શહેર", "નગર",                          # Gujarati
    ],
}

# Indian state names (English + Hindi + common abbreviations)
STATE_NAMES = {
    "andhra pradesh": "Andhra Pradesh", "ap": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar", "बिहार": "Bihar",
    "chhattisgarh": "Chhattisgarh", "छत्तीसगढ़": "Chhattisgarh",
    "goa": "Goa", "गोवा": "Goa",
    "gujarat": "Gujarat", "गुजरात": "Gujarat", "ગુજરાત": "Gujarat",
    "haryana": "Haryana", "हरियाणा": "Haryana",
    "himachal pradesh": "Himachal Pradesh", "hp": "Himachal Pradesh",
    "jharkhand": "Jharkhand", "झारखंड": "Jharkhand",
    "karnataka": "Karnataka", "कर्नाटक": "Karnataka", "ಕರ್ನಾಟಕ": "Karnataka",
    "kerala": "Kerala", "केरल": "Kerala",
    "madhya pradesh": "Madhya Pradesh", "mp": "Madhya Pradesh", "मध्य प्रदेश": "Madhya Pradesh",
    "maharashtra": "Maharashtra", "महाराष्ट्र": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha", "ओडिशा": "Odisha",
    "punjab": "Punjab", "पंजाब": "Punjab",
    "rajasthan": "Rajasthan", "राजस्थान": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu", "tn": "Tamil Nadu", "தமிழ்நாடு": "Tamil Nadu", "तमिलनाडु": "Tamil Nadu",
    "telangana": "Telangana", "తెలంగాణ": "Telangana", "तेलंगाना": "Telangana",
    "tripura": "Tripura",
    "uttar pradesh": "Uttar Pradesh", "up": "Uttar Pradesh", "उत्तर प्रदेश": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand", "उत्तराखंड": "Uttarakhand",
    "west bengal": "West Bengal", "wb": "West Bengal", "পশ্চিমবঙ্গ": "West Bengal", "पश्चिम बंगाल": "West Bengal",
    "delhi": "Delhi", "दिल्ली": "Delhi",
}


# ── Regex-based fallback extractor ────────────────────────────────────────────

def _extract_age_regex(text: str) -> Optional[int]:
    """Extract age from text using pattern matching."""
    text_lower = text.lower()
    
    # English & Hinglish & regional patterns: "25 years old", "age 25", "42 saal ka", "meri umar 30"
    patterns = [
        r'(?:age|aged|i am|i\'m|main|meri umar|umar|umra|उम्र|आयु|वय)\s*(?:is|hai|ho|:)?\s*(\d{1,3})',
        r'(\d{1,3})\s*(?:years?\s*old|s(?:aa|a)l\s*k[aie]|s(?:aa|a)l|साल\s*क[ाेी]|साल|वर्ष|வயது|বছর|ఏళ్ళు|ವರ್ಷ|વર્ષ)',
        r'(?:^|\s)(\d{1,3})\s*(?:yr|yrs)(?:\s|$)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            age = int(match.group(1))
            if 1 <= age <= 120:
                return age
    return None


def _extract_income_regex(text: str) -> Optional[int]:
    """Extract annual income from text, handling lakhs/thousands/plain numbers."""
    text_lower = text.lower()
    
    # Remove commas in numbers (e.g., "1,20,000" → "120000")
    cleaned = re.sub(r'(\d),(\d)', r'\1\2', text_lower)
    
    # "X lakh" / "X लाख" patterns
    lakh_patterns = [
        r'(?:₹|rs\.?|rupees?|income|kamai|आय|कमाई|आमदनी)\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|लाख)',
        r'(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|लाख)\s*(?:₹|rs|rupees?|income|per year|yearly|saal|साल|annual)',
        r'(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|लाख)',
    ]
    for pattern in lakh_patterns:
        match = re.search(pattern, cleaned)
        if match:
            return int(float(match.group(1)) * 100000)
    
    # "X thousand" patterns
    thousand_patterns = [
        r'(?:₹|rs\.?|rupees?|income|kamai|आय|कमाई)\s*(\d+)\s*(?:thousand|hazar|हजार)',
        r'(\d+)\s*(?:thousand|hazar|हजार)\s*(?:per year|yearly|saal|साल|annual)',
    ]
    for pattern in thousand_patterns:
        match = re.search(pattern, cleaned)
        if match:
            return int(match.group(1)) * 1000
    
    # Direct number patterns: "income 120000", "₹80000", "kamai 60000"
    direct_patterns = [
        r'(?:₹|rs\.?\s?)(\d{4,7})(?:\s|$|[,.])',
        r'(?:income|salary|kamai|earning|आय|कमाई|आमदनी|வருமானம்|আয়|ఆదాయం|ಆದಾಯ|આવક)\s*(?:is|hai|:)?\s*(?:₹|rs\.?\s?)?(\d{4,7})',
        r'(?:per year|yearly|annual|saal|साल(?:ाना)?)\s*(?:₹|rs\.?\s?)?(\d{4,7})',
        r'(?:₹|rs\.?\s?)?(\d{4,7})\s*(?:per year|yearly|annual|saal|सालाना|साल)',
    ]
    for pattern in direct_patterns:
        match = re.search(pattern, cleaned)
        if match:
            val = int(match.group(1))
            if 1000 <= val <= 9999999:
                return val
    
    return None


def _extract_occupation_regex(text: str) -> Optional[str]:
    """Extract occupation from multilingual keyword matching."""
    text_lower = text.lower()
    for occupation, keywords in OCCUPATION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return occupation
    return None


def _extract_gender_regex(text: str) -> Optional[str]:
    """Extract gender from multilingual keyword matching."""
    text_lower = text.lower()
    for gender, keywords in GENDER_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return gender
    return None


def _extract_location_regex(text: str) -> Optional[str]:
    """Extract location type (rural/urban) from multilingual keywords."""
    text_lower = text.lower()
    for location, keywords in LOCATION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return location
    return None


def _extract_state_regex(text: str) -> Optional[str]:
    """Extract Indian state name from text."""
    text_lower = text.lower()
    # Sort by length descending to match longer names first ("madhya pradesh" before "pradesh")
    for key in sorted(STATE_NAMES.keys(), key=len, reverse=True):
        if key in text_lower:
            return STATE_NAMES[key]
    return None


def extract_profile_regex(text: str) -> Dict[str, Any]:
    """
    Regex-based profile extraction — works offline without Gemini.
    Returns dict with only the fields it could confidently extract.
    """
    result = {}
    
    age = _extract_age_regex(text)
    if age is not None:
        result["age"] = age
    
    income = _extract_income_regex(text)
    if income is not None:
        result["annual_income"] = income
    
    occupation = _extract_occupation_regex(text)
    if occupation:
        result["occupation"] = occupation
    
    gender = _extract_gender_regex(text)
    if gender:
        result["gender"] = gender
    
    location = _extract_location_regex(text)
    if location:
        result["location_type"] = location
    
    state = _extract_state_regex(text)
    if state:
        result["state"] = state
    
    return result


# ── Gemini-based extraction ──────────────────────────────────────────────────

EXTRACTION_PROMPT = """You are a profile data extractor for an Indian government scheme eligibility platform.

From the user's message below, extract ANY personal profile information mentioned.
The message may be in English, Hindi, Tamil, Marathi, Bengali, Telugu, Kannada, or Gujarati.

Return ONLY a valid JSON object with ONLY the fields you can confidently extract.
Do NOT guess or infer values not explicitly stated or clearly implied.

Possible fields:
- "age": integer (1-120)
- "occupation": one of "farmer", "student", "self-employed", "unemployed", "salaried"
- "annual_income": integer (annual income in INR)
- "gender": one of "male", "female", "other"
- "location_type": one of "rural", "urban"
- "state": Indian state name in English (e.g., "Uttar Pradesh", "Tamil Nadu")

Important rules:
- If income is mentioned in lakhs, convert to rupees (1 lakh = 100000)
- If monthly income/salary is mentioned, multiply by 12 for annual
- Map regional language occupation words to English equivalents
- Return {} if no profile information is found
- Return ONLY the JSON, no markdown, no explanation

User message: {message}

JSON:"""


def extract_profile_gemini(text: str) -> Dict[str, Any]:
    """
    Use Gemini to extract structured profile fields from natural language.
    Falls back to empty dict on any failure.
    """
    try:
        from app.rag.generator import model as gemini_model
        if not gemini_model:
            return {}
        
        prompt = EXTRACTION_PROMPT.format(message=text)
        response = gemini_model.generate_content(prompt)
        
        if not response or not response.text:
            return {}
        
        # Clean response — strip markdown code fences if present
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
        
        parsed = json.loads(raw)
        
        if not isinstance(parsed, dict):
            return {}
        
        # Validate and sanitize
        clean = {}
        if "age" in parsed:
            age = int(parsed["age"])
            if 1 <= age <= 120:
                clean["age"] = age
        
        if "annual_income" in parsed:
            income = int(parsed["annual_income"])
            if income >= 0:
                clean["annual_income"] = income
        
        valid_occupations = {"farmer", "student", "self-employed", "unemployed", "salaried", "any"}
        if "occupation" in parsed and str(parsed["occupation"]).lower() in valid_occupations:
            clean["occupation"] = str(parsed["occupation"]).lower()
        
        valid_genders = {"male", "female", "other"}
        if "gender" in parsed and str(parsed["gender"]).lower() in valid_genders:
            clean["gender"] = str(parsed["gender"]).lower()
        
        valid_locations = {"rural", "urban"}
        if "location_type" in parsed and str(parsed["location_type"]).lower() in valid_locations:
            clean["location_type"] = str(parsed["location_type"]).lower()
        
        if "state" in parsed and isinstance(parsed["state"], str) and len(parsed["state"]) > 1:
            clean["state"] = parsed["state"]
        
        return clean
    
    except json.JSONDecodeError:
        logger.warning("Gemini profile extraction returned invalid JSON")
        return {}
    except Exception as e:
        logger.warning(f"Gemini profile extraction failed: {e}")
        return {}


# ── Public API ────────────────────────────────────────────────────────────────

def extract_profile(text: str) -> Dict[str, Any]:
    """
    Extract profile fields from natural language text.
    
    Strategy:
    1. Always run regex extraction (fast, reliable for explicit patterns)
    2. Try Gemini extraction (better for implicit/contextual mentions)
    3. Merge results — Gemini results take priority for conflicting fields,
       but regex fills in anything Gemini missed
    
    Returns dict with only the fields that were found. Empty dict if nothing extracted.
    """
    if not text or len(text.strip()) < 3:
        return {}
    
    # Step 1: Fast regex extraction
    regex_result = extract_profile_regex(text)
    
    # Step 2: Gemini extraction (if available)
    gemini_result = extract_profile_gemini(text)
    
    # Step 3: Merge — Gemini takes priority, regex fills gaps
    merged = {**regex_result, **gemini_result}
    
    if merged:
        logger.info(f"Profile extracted: {merged}")
    
    return merged

from typing import List, Dict

# ── Off-topic detection ───────────────────────────────────────────────────────

OFF_TOPIC_SIGNALS = [
    "virat", "kohli", "dhoni", "sachin", "rohit", "tendulkar", "messi",
    "ronaldo", "ipl", "cricket", "football", "hockey", "tennis", "sport",
    "movie", "film", "actor", "actress", "bollywood", "hollywood",
    "song", "music", "singer", "album", "concert",
    "joke", "funny", "meme", "laugh",
    "recipe", "cook", "food", "restaurant",
    "weather", "temperature", "rain", "cloud",
    "chatgpt", "openai", "coding", "programming", "javascript", "python code",
    "hack", "hacking",
    "who won", "who is the best", "tell me about yourself",
    "what is your name", "who created you",
    "capital of", "president of",
    "history of", "geography", "science",
    "stock market", "share price", "bitcoin", "crypto",
]

SCHEME_SIGNALS = [
    "scheme", "yojana", "योजना", "benefit", "apply", "application",
    "eligibility", "eligible", "document", "subsidy", "loan", "pension",
    "scholarship", "ration", "card", "welfare", "government", "sarkari",
    "pm ", "pradhan mantri", "central government", "state government",
    "income", "insurance", "health scheme", "education scheme",
    "farmer", "kisan", "agriculture", "mahila", "women scheme",
    "girl child", "student", "employment", "housing", "awas",
    "mudra", "mgnrega", "mnrega", "pmay", "pmjay", "ayushman",
    "ujjwala", "jan dhan", "sukanya", "how to get", "how can i get",
    "what schemes", "which scheme", "am i eligible",
    "documents required", "how to register", "how to enroll",
    "financial help", "financial assistance", "government help",
    "financial scheme", "finance scheme", "finance yojana",
    "agriculture finance", "business loan", "self employment",
]

def is_off_topic(message: str) -> bool:
    msg_lower = message.lower()
    if any(sig in msg_lower for sig in SCHEME_SIGNALS):
        return False
    if any(sig in msg_lower for sig in OFF_TOPIC_SIGNALS):
        return True
    return False


# ── Intent detection ──────────────────────────────────────────────────────────

INTENTS = {
    "greeting":  ["hi", "hello", "namaste", "hey", "start", "help", "नमस्ते"],
    "documents": ["document", "documents", "papers", "kagaz", "proof", "required", "needed"],
    "status":    ["status", "track", "applied", "application", "check", "pending"],
    "howto":     ["apply", "kaise", "how to", "steps", "process", "register", "enroll"],
    "benefit":   ["benefit", "kitna", "amount", "money", "rupee", "rs", "how much", "funds", "paise"],
    "list":      ["list", "show", "all schemes", "what schemes", "available", "which schemes",
                  "tell about", "tell me about", "finance", "agriculture", "health", "education"],
}

def detect_intent(message: str) -> str:
    msg_lower = message.lower()
    for intent, keywords in INTENTS.items():
        if any(keyword in msg_lower for keyword in keywords):
            return intent
    return "default"


# ── Off-topic replies ─────────────────────────────────────────────────────────

OFF_TOPIC_REPLY_EN = (
    "I'm Sahayog AI, your assistant for Indian government welfare schemes. "
    "I can only help with:\n"
    "• Finding schemes you're eligible for\n"
    "• Documents required to apply\n"
    "• How to apply for a scheme\n"
    "• Benefits and amounts offered\n\n"
    "Please ask me something related to government schemes! 🇮🇳"
)

OFF_TOPIC_REPLY_HI = (
    "मैं सहयोग AI हूँ, भारत सरकार की कल्याण योजनाओं के लिए आपका सहायक। "
    "मैं केवल इन विषयों पर मदद कर सकता हूँ:\n"
    "• आपकी पात्रता के अनुसार योजनाएँ खोजना\n"
    "• आवेदन के लिए आवश्यक दस्तावेज़\n"
    "• योजना में आवेदन कैसे करें\n"
    "• लाभ और राशि की जानकारी\n\n"
    "कृपया सरकारी योजनाओं से संबंधित प्रश्न पूछें! 🇮🇳"
)


# ── Helper: set active scheme in memory ──────────────────────────────────────

def _pin_active_scheme(session_id: str, scheme: dict):
    """Store scheme as the active one for this session so follow-ups work."""
    if not session_id or not scheme:
        return
    try:
        from app.rag.memory import memory as _mem
        _mem.set_active_scheme(session_id, scheme)
    except Exception:
        pass


# ── Main fallback function ────────────────────────────────────────────────────

def generate_fallback_reply(
    message: str,
    matched_schemes: List[Dict],
    language: str = "en",
    session_id: str = "",
) -> str:
    is_hindi = language == "hi"

    # 1. Off-topic guard
    if is_off_topic(message):
        return OFF_TOPIC_REPLY_HI if is_hindi else OFF_TOPIC_REPLY_EN

    intent = detect_intent(message)

    # 2. Resolve the correct scheme to answer about:
    #    PRIORITY 1 → scheme explicitly tracked in session (from previous turn)
    #    PRIORITY 2 → top semantic result from current query
    top_scheme = None
    if session_id:
        try:
            from app.rag.memory import memory as _mem
            top_scheme = _mem.get_active_scheme(session_id)
        except Exception:
            pass

    if top_scheme is None and matched_schemes:
        first = matched_schemes[0]
        if "scheme" in first:
            top_scheme = first["scheme"]
        else:
            from app.data.schemes import get_scheme_by_id
            top_scheme = get_scheme_by_id(str(first.get("id", ""))) or {}

    # 3. "list" intent — user wants to browse available schemes by topic
    if intent == "list":
        if matched_schemes:
            names = [
                (s.get("scheme", {}).get("name") or s.get("name", ""))
                for s in matched_schemes[:5]
            ]
            names = [n for n in names if n]
            if names:
                names_str = "\n• " + "\n• ".join(names)
                if is_hindi:
                    return f"आपके प्रश्न से संबंधित कुछ योजनाएँ:{names_str}\n\nकिसी भी योजना के नाम से उसके बारे में विस्तार में पूछें।"
                return f"Here are some relevant schemes:{names_str}\n\nAsk about any of them for eligibility, documents, or how to apply!"
        if is_hindi:
            return "इस विषय से संबंधित कोई योजना नहीं मिली। myscheme.gov.in पर जाएँ।"
        return "No schemes found for that topic. Please visit myscheme.gov.in or call 1800-180-1111."

    # 4. No scheme at all
    if not top_scheme:
        if is_hindi:
            return "आपके प्रश्न के लिए कोई योजना नहीं मिली। कृपया अपना प्रोफ़ाइल पूरा करें या myscheme.gov.in पर जाएँ।"
        return "I couldn't find a scheme matching your question. Please complete your profile or visit myscheme.gov.in."

    scheme_name = top_scheme.get("name", "the recommended scheme")

    # Pin this scheme so follow-ups like "how to apply" know which one to use
    _pin_active_scheme(session_id, top_scheme)

    # 5. Intent-based responses
    if intent == "greeting":
        if is_hindi:
            return (f"नमस्ते जी! मैं सहयोग AI हूँ। **{scheme_name}** जैसी योजनाएँ आपके लिए उपलब्ध हैं। "
                    f"दस्तावेज़, पात्रता या आवेदन प्रक्रिया के बारे में पूछें।")
        return (f"Namaste! I'm Sahayog AI. **{scheme_name}** may be relevant for you. "
                f"Ask me about eligibility, documents, or how to apply!")

    elif intent == "documents":
        docs = top_scheme.get("documents_required", ["Aadhaar card", "Income proof", "Bank passbook"])
        docs_str = "\n• " + "\n• ".join(docs) if isinstance(docs, list) else str(docs)
        if is_hindi:
            return f"**{scheme_name}** के लिए आवश्यक दस्तावेज़:{docs_str}"
        return f"Documents required for **{scheme_name}**:{docs_str}"

    elif intent == "howto":
        steps = top_scheme.get("how_to_apply",
                top_scheme.get("application_process",
                "Visit the official portal or your nearest Common Service Centre (CSC)."))
        if is_hindi:
            return f"**{scheme_name}** में आवेदन प्रक्रिया:\n{steps}"
        return f"How to apply for **{scheme_name}**:\n{steps}"

    elif intent == "benefit":
        benefit = top_scheme.get("benefits", "Please visit the official portal for benefit details.")
        if is_hindi:
            return f"**{scheme_name}** के लाभ:\n{benefit}"
        return f"Benefits of **{scheme_name}**:\n{benefit}"

    elif intent == "status":
        if is_hindi:
            return "आवेदन की लाइव स्थिति यहाँ उपलब्ध नहीं है। कृपया उस पोर्टल पर जाँच करें जहाँ आपने आवेदन किया था।"
        return "Live application status is not available here. Please check the official portal where you applied."

    else:
        # Generic — show scheme summary
        desc = top_scheme.get("description", "")
        benefit = top_scheme.get("benefits", "")
        if is_hindi:
            return (f"**{scheme_name}**: {desc}\n\n"
                    f"लाभ: {benefit}\n\n"
                    f"दस्तावेज़ या आवेदन प्रक्रिया के बारे में जानना चाहते हैं?")
        return (f"**{scheme_name}**: {desc}\n\n"
                f"Benefits: {benefit}\n\n"
                f"Want to know the documents needed or how to apply?")

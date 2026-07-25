from typing import List, Dict

# ── Off-topic detection ───────────────────────────────────────────────────────

# Words that almost never appear in scheme-related questions
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
    "capital of", "president of", "prime minister of india",
    "history of", "geography", "science",
    "stock market", "share price", "bitcoin", "crypto",
]

# Words that confirm the question IS scheme-related
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
    """Returns True if the message is clearly unrelated to government schemes."""
    msg_lower = message.lower()

    # If it contains a strong scheme signal → not off-topic
    if any(sig in msg_lower for sig in SCHEME_SIGNALS):
        return False

    # If it contains a strong off-topic signal → off-topic
    if any(sig in msg_lower for sig in OFF_TOPIC_SIGNALS):
        return True

    return False


# ── Intent detection ──────────────────────────────────────────────────────────

INTENTS = {
    "greeting":  ["hi", "hello", "namaste", "hey", "start", "help", "नमस्ते"],
    "documents": ["document", "documents", "papers", "kagaz", "proof", "required"],
    "status":    ["status", "track", "applied", "application", "check", "pending"],
    "howto":     ["apply", "kaise", "how to", "steps", "process", "register", "enroll"],
    "benefit":   ["benefit", "kitna", "amount", "money", "rupee", "rs", "how much", "funds"],
    "list":      ["list", "show", "all schemes", "what schemes", "available", "which schemes",
                  "tell about", "tell me about", "finance", "agriculture", "health", "education"],
}

def detect_intent(message: str) -> str:
    msg_lower = message.lower()
    for intent, keywords in INTENTS.items():
        if any(keyword in msg_lower for keyword in keywords):
            return intent
    return "default"


# ── Off-topic reply ───────────────────────────────────────────────────────────

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


# ── Main fallback function ────────────────────────────────────────────────────

def generate_fallback_reply(message: str, matched_schemes: List[Dict], language: str = "en", session_id: str = "") -> str:
    is_hindi = language == "hi"

    # 1. Off-topic guard — must come first
    if is_off_topic(message):
        return OFF_TOPIC_REPLY_HI if is_hindi else OFF_TOPIC_REPLY_EN

    intent = detect_intent(message)

    # 2. Context resolution — for vague follow-ups like "how to apply for it"
    #    pull the last mentioned scheme from conversation memory
    context_scheme = None
    if session_id:
        try:
            from app.rag.memory import memory as _memory
            from app.data.schemes import get_all_schemes
            last_name = _memory.get_last_mentioned_scheme(session_id)
            if last_name:
                all_schemes = get_all_schemes()
                last_name_lower = last_name.lower()
                for s in all_schemes:
                    if s.get("name", "").lower() == last_name_lower:
                        context_scheme = s
                        break
        except Exception:
            pass

    # 2. "list" intent — user wants to see available schemes by category
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
                    return f"आपके प्रश्न से संबंधित कुछ योजनाएँ:{names_str}\n\nकिसी भी योजना के बारे में अधिक जानकारी के लिए उसका नाम बताएं।"
                return f"Here are some relevant schemes for you:{names_str}\n\nAsk me about any of these for eligibility, documents, or how to apply!"
        # No matches
        if is_hindi:
            return "इस विषय से संबंधित कोई योजना नहीं मिली। कृपया myscheme.gov.in पर जाएँ या 1800-180-1111 पर कॉल करें।"
        return "I couldn't find schemes matching your query. Please visit myscheme.gov.in or call 1800-180-1111."

    # 3. No scheme results at all
    if not matched_schemes and not context_scheme:
        if is_hindi:
            return "आपके प्रश्न के लिए कोई योजना नहीं मिली। कृपया अपना प्रोफ़ाइल पूरा करें या myscheme.gov.in पर जाएँ।"
        return "I couldn't find a scheme matching your question. Please complete your profile or visit myscheme.gov.in."

    # 4. Resolve top scheme details
    #    PRIORITY: context from conversation history > TF-IDF first result
    if context_scheme:
        top_scheme = context_scheme
    elif matched_schemes:
        first_item = matched_schemes[0]
        from app.data.schemes import get_scheme_by_id
        if "scheme" in first_item:
            top_scheme = first_item["scheme"]
        else:
            sid = first_item.get("id", "")
            top_scheme = get_scheme_by_id(str(sid)) or {}
    else:
        top_scheme = {}

    scheme_name = top_scheme.get("name", "the recommended scheme")

    if intent == "greeting":
        if is_hindi:
            return (f"नमस्ते जी! मैं सहयोग AI हूँ। आपके लिए **{scheme_name}** जैसी योजनाएँ उपलब्ध हैं। "
                    f"आप दस्तावेज़, पात्रता या आवेदन प्रक्रिया के बारे में पूछ सकते हैं।")
        return (f"Namaste! I'm Sahayog AI. A scheme like **{scheme_name}** may be relevant for you. "
                f"Ask me about eligibility, documents, or how to apply!")

    elif intent == "documents":
        docs = top_scheme.get("documents_required", ["Aadhaar card", "Income proof", "Bank passbook"])
        docs_str = "\n• " + "\n• ".join(docs) if isinstance(docs, list) else docs
        if is_hindi:
            return f"**{scheme_name}** के लिए आवश्यक दस्तावेज़:{docs_str}"
        return f"Documents required for **{scheme_name}**:{docs_str}"

    elif intent == "howto":
        steps = top_scheme.get("how_to_apply", top_scheme.get("application_process",
                "Visit the official portal or nearest Common Service Centre (CSC)."))
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
        # Generic — summarize scheme
        desc = top_scheme.get("description", "")
        benefit = top_scheme.get("benefits", "")
        if is_hindi:
            return (f"**{scheme_name}**: {desc}\n\n"
                    f"लाभ: {benefit}\n\n"
                    f"दस्तावेज़ या आवेदन प्रक्रिया के बारे में जानना चाहते हैं?")
        return (f"**{scheme_name}**: {desc}\n\n"
                f"Benefits: {benefit}\n\n"
                f"Want to know the documents needed or how to apply?")

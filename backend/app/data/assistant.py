from typing import List, Dict

INTENTS = {
    "greeting": ["hi", "hello", "namaste", "hey", "start", "help"],
    "documents": ["document", "documents", "papers", "kagaz", "proof", "need"],
    "status": ["status", "track", "applied", "application", "check"],
    "howto": ["apply", "kaise", "how", "steps", "process"],
    "benefit": ["benefit", "kitna", "amount", "money", "rupee", "rs"]
}

def detect_intent(message: str) -> str:
    msg_lower = message.lower()
    for intent, keywords in INTENTS.items():
        if any(keyword in msg_lower for keyword in keywords):
            return intent
    return "default"

def generate_fallback_reply(message: str, matched_schemes: List[Dict], language: str = "en") -> str:
    intent = detect_intent(message)
    
    if not matched_schemes:
        if language == "hi":
            return "नमस्ते! कृपया अपने प्रोफ़ाइल में अधिक जानकारी जोड़ें ताकि मैं आपके लिए उपयुक्त योजनाएं खोज सकूँ।"
        return "Hello! Please complete your profile so I can find suitable schemes for you."
    
    first_item = matched_schemes[0]
    scheme_id = first_item.get("scheme", {}).get("id") if "scheme" in first_item else first_item.get("id")
    from app.data.schemes import get_scheme_by_id
    top_scheme = get_scheme_by_id(scheme_id) or {}
    scheme_name = top_scheme.get("name", "the recommended scheme")
    
    if intent == "greeting":
        if language == "hi":
            return f"नमस्ते! आपके प्रोफ़ाइल के आधार पर, मैं {scheme_name} की अनुशंसा करता हूँ। मैं आपकी कैसे मदद कर सकता हूँ?"
        return f"Welcome! Based on your profile, I recommend looking into {scheme_name}. How can I assist you with it?"
        
    elif intent == "documents":
        docs = top_scheme.get("documents_required", ["Basic identity and income proof"])
        docs_str = ", ".join(docs) if isinstance(docs, list) else docs
        if language == "hi":
            return f"{scheme_name} के लिए आवेदन करने के लिए, आपको आवश्यकता होगी: {docs_str}।"
        return f"To apply for {scheme_name}, you will need: {docs_str}."
        
    elif intent == "howto":
        steps = top_scheme.get("how_to_apply", top_scheme.get("application_process", "Please visit the official portal to apply."))
        if language == "hi":
            return f"{scheme_name} के लिए आवेदन करने की प्रक्रिया: {steps}"
        return f"To apply for {scheme_name}: {steps}"
        
    elif intent == "benefit":
        benefit = top_scheme.get("benefits", "Check the official scheme document for benefit details.")
        if language == "hi":
            return f"{scheme_name} के लाभ हैं: {benefit}"
        return f"The benefits for {scheme_name} are: {benefit}"
        
    elif intent == "status":
        if language == "hi":
            return "आवेदन की स्थिति ट्रैक करने की सुविधा अभी यहाँ उपलब्ध नहीं है। कृपया उस आधिकारिक पोर्टल पर जाँच करें जहाँ आपने आवेदन किया था।"
        return "Live status tracking is not available here yet. Please check the official portal where you applied."
        
    else:
        desc = top_scheme.get("description", "")
        if language == "hi":
            # Translate common fallback description if scheme has no hindi description
            # We can print standard recommendation in Hindi
            return f"मैं {scheme_name} की अत्यधिक अनुशंसा करता हूँ। {desc} यदि आप आवश्यक दस्तावेज़ों या आवेदन करने की प्रक्रिया के बारे में जानना चाहते हैं, तो कृपया मुझे बताएं!"
        return f"I highly recommend {scheme_name}. {desc} Let me know if you want to know about documents or how to apply!"

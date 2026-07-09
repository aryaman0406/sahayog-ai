import os
import logging
import asyncio
import google.generativeai as genai
from typing import AsyncGenerator, List, Dict

from app.config import settings
from .memory import memory
from app.data.assistant import generate_fallback_reply

def _semantic_search(query, n_results=5):
    try:
        from .embedder import semantic_search
        return semantic_search(query, n_results=n_results)
    except Exception:
        return []

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_key_here":
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-flash-latest")
else:
    logger.warning("GEMINI_API_KEY is missing or invalid. Using fallback assistant.")
    model = None

SYSTEM_PROMPT = """You are Sahayog AI (सहयोग AI), a warm, 
helpful, and knowledgeable assistant for Indian citizens 
seeking government welfare schemes and benefits.

Your personality:
- Warm and respectful (use "ji" occasionally in Hindi mode)
- Simple language, avoid jargon
- Specific: always mention exact amounts, dates, scheme names
- Honest: if a scheme doesn't match, say so clearly
- Actionable: always end with a clear next step

Rules:
- Answer ONLY from the provided scheme context
- If context doesn't contain the answer, say:
  "I don't have that specific information. Please visit 
   myscheme.gov.in or call 1800-180-1111 for details."
- Never make up scheme details or amounts
- Always cite which scheme you're referring to
"""

def build_prompt(
    user_message: str,
    profile: dict,
    retrieved_schemes: list[dict],
    conversation_history: str,
    language: str
) -> str:
    
    LANG_MAP = {
        "en": "English",
        "hi": "Hindi",
        "ta": "Tamil",
        "mr": "Marathi",
        "bn": "Bengali",
        "te": "Telugu",
        "kn": "Kannada",
        "gu": "Gujarati"
    }
    lang_str = LANG_MAP.get(language, "English")
    
    profile_str = "\n".join([f"{k}: {v}" for k, v in profile.items() if v])
    
    schemes_str = ""
    for i, scheme in enumerate(retrieved_schemes, 1):
        schemes_str += f"[{i}] {scheme.get('content', '')}\n\n"
        
    prompt = f"""{SYSTEM_PROMPT}

LANGUAGE: Respond in {lang_str}

USER PROFILE:
{profile_str}

RETRIEVED SCHEMES:
{schemes_str}

CONVERSATION HISTORY:
{conversation_history}

USER: {user_message}
SAHAYOG AI:"""

    return prompt

def rag_generate(
    user_message: str,
    profile: dict,
    session_id: str,
    language: str = "en"
) -> str:
    
    semantic_results = _semantic_search(user_message, n_results=5)
    history_str = memory.get_context_string(session_id)
    
    prompt = build_prompt(user_message, profile, semantic_results, history_str, language)
    
    if model:
        try:
            response = model.generate_content(prompt)
            reply = response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            reply = generate_fallback_reply(user_message, semantic_results, language)
    else:
        reply = generate_fallback_reply(user_message, semantic_results, language)
        
    memory.add_message(session_id, "user", user_message)
    memory.add_message(session_id, "assistant", reply)
    
    return reply

async def rag_stream(
    user_message: str,
    profile: dict,
    session_id: str,
    language: str = "en"
) -> AsyncGenerator[str, None]:
    
    semantic_results = _semantic_search(user_message, n_results=5)
    history_str = memory.get_context_string(session_id)
    
    prompt = build_prompt(user_message, profile, semantic_results, history_str, language)
    
    full_response = ""
    
    if model:
        try:
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield chunk.text
        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            fallback = generate_fallback_reply(user_message, semantic_results, language)
            for word in fallback.split():
                yield word + " "
                await asyncio.sleep(0.05)
            full_response = fallback
    else:
        fallback = generate_fallback_reply(user_message, semantic_results, language)
        for word in fallback.split():
            yield word + " "
            await asyncio.sleep(0.05)
        full_response = fallback
        
    memory.add_message(session_id, "user", user_message)
    memory.add_message(session_id, "assistant", full_response)

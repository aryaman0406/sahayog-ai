import logging
import asyncio
import google.generativeai as genai
from typing import AsyncGenerator, List, Dict

from app.config import settings
from .memory import memory
from app.data.assistant import generate_fallback_reply, is_off_topic

logger = logging.getLogger(__name__)

# ── Gemini model initialisation (tries newest → stable fallback) ───────────────
_CANDIDATE_MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"]

model = None
if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY not in ("your_key_here", ""):
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(_CANDIDATE_MODELS[0])
        logger.info(f"Gemini model loaded: {_CANDIDATE_MODELS[0]}")
    except Exception as e:
        logger.error(f"Gemini init failed: {e}")
        model = None
else:
    logger.warning("GEMINI_API_KEY not set — using rule-based fallback assistant.")


# ── Semantic search helper ────────────────────────────────────────────────────
def _semantic_search(query: str, n_results: int = 5) -> list:
    try:
        from .embedder import semantic_search
        return semantic_search(query, n_results=n_results)
    except Exception:
        return []


# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Sahayog AI (सहयोग AI), a warm, helpful assistant \
for Indian citizens seeking government welfare schemes and benefits.

Personality:
- Warm and respectful; use "ji" occasionally when speaking Hindi
- Simple language, avoid jargon
- Specific: mention exact amounts, dates, scheme names
- Honest: if a scheme doesn't match, say so
- Actionable: always end with a clear next step

Strict Rules:
1. Answer ONLY questions about Indian government schemes, eligibility, \
   documents, application process, or welfare benefits.
2. If the user asks ANYTHING unrelated (cricket, movies, coding, jokes, \
   general knowledge, etc.) respond EXACTLY with:
   "I'm Sahayog AI, designed only to help with Indian government welfare \
   schemes. Please ask me about schemes, eligibility, documents, or how to apply!"
3. If the retrieved context doesn't contain the answer, say:
   "I don't have that specific information. Please visit myscheme.gov.in \
   or call 1800-180-1111 for details."
4. Never invent scheme details, amounts, or dates.
5. Always name the scheme you are referring to.
"""


# ── Prompt builder ────────────────────────────────────────────────────────────
LANG_MAP = {
    "en": "English", "hi": "Hindi", "ta": "Tamil",
    "mr": "Marathi", "bn": "Bengali", "te": "Telugu",
    "kn": "Kannada", "gu": "Gujarati",
}

def build_prompt(
    user_message: str,
    profile: dict,
    retrieved_schemes: list,
    conversation_history: str,
    language: str,
) -> str:
    lang_str = LANG_MAP.get(language, "English")
    profile_str = "\n".join(f"{k}: {v}" for k, v in profile.items() if v)
    schemes_str = "".join(
        f"[{i}] {s.get('content', '')}\n\n"
        for i, s in enumerate(retrieved_schemes, 1)
    )
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"LANGUAGE: Respond in {lang_str}\n\n"
        f"USER PROFILE:\n{profile_str or 'Not provided'}\n\n"
        f"RETRIEVED SCHEMES:\n{schemes_str or 'No relevant schemes found.'}\n\n"
        f"CONVERSATION HISTORY:\n{conversation_history or 'None'}\n\n"
        f"USER: {user_message}\n"
        f"SAHAYOG AI:"
    )


# ── Gemini call with retry on model name ─────────────────────────────────────
def _gemini_generate_sync(prompt: str) -> str:
    global model
    try:
        resp = model.generate_content(prompt)
        return resp.text
    except Exception as first_err:
        logger.error(f"Gemini error with {_CANDIDATE_MODELS[0]}: {first_err}")
        # Try next model name
        for name in _CANDIDATE_MODELS[1:]:
            try:
                m = genai.GenerativeModel(name)
                resp = m.generate_content(prompt)
                logger.info(f"Succeeded with fallback model: {name}")
                return resp.text
            except Exception as e:
                logger.error(f"Gemini error with {name}: {e}")
    return None  # all models failed


def _gemini_stream_sync(prompt: str):
    global model
    try:
        return model.generate_content(prompt, stream=True), None
    except Exception as first_err:
        logger.error(f"Gemini stream error with {_CANDIDATE_MODELS[0]}: {first_err}")
        for name in _CANDIDATE_MODELS[1:]:
            try:
                m = genai.GenerativeModel(name)
                return m.generate_content(prompt, stream=True), None
            except Exception as e:
                logger.error(f"Gemini stream error with {name}: {e}")
    return None, "All Gemini models failed"


# ── Public API ────────────────────────────────────────────────────────────────
def rag_generate(
    user_message: str,
    profile: dict,
    session_id: str,
    language: str = "en",
) -> str:
    semantic_results = _semantic_search(user_message, n_results=5)
    history_str = memory.get_context_string(session_id)
    relevant = [s for s in semantic_results if s.get("relevance_score", 0) > 5]

    reply = None
    if model and not is_off_topic(user_message):
        prompt = build_prompt(user_message, profile, relevant, history_str, language)
        reply = _gemini_generate_sync(prompt)

    if reply is None:
        reply = generate_fallback_reply(user_message, semantic_results, language)

    memory.add_message(session_id, "user", user_message)
    memory.add_message(session_id, "assistant", reply)
    return reply


async def rag_stream(
    user_message: str,
    profile: dict,
    session_id: str,
    language: str = "en",
) -> AsyncGenerator[str, None]:
    semantic_results = _semantic_search(user_message, n_results=5)
    history_str = memory.get_context_string(session_id)
    relevant = [s for s in semantic_results if s.get("relevance_score", 0) > 5]

    full_response = ""

    # Fast-path: off-topic — skip Gemini entirely
    if is_off_topic(user_message):
        fallback = generate_fallback_reply(user_message, [], language)
        for word in fallback.split():
            yield word + " "
            await asyncio.sleep(0.03)
        full_response = fallback

    elif model:
        prompt = build_prompt(user_message, profile, relevant, history_str, language)
        stream, err = _gemini_stream_sync(prompt)
        if stream:
            try:
                for chunk in stream:
                    if chunk.text:
                        full_response += chunk.text
                        yield chunk.text
            except Exception as e:
                logger.error(f"Gemini chunk error: {e}")
                if not full_response:
                    fallback = generate_fallback_reply(user_message, semantic_results, language)
                    for word in fallback.split():
                        yield word + " "
                        await asyncio.sleep(0.03)
                    full_response = fallback
        else:
            fallback = generate_fallback_reply(user_message, semantic_results, language)
            for word in fallback.split():
                yield word + " "
                await asyncio.sleep(0.03)
            full_response = fallback

    else:
        fallback = generate_fallback_reply(user_message, semantic_results, language)
        for word in fallback.split():
            yield word + " "
            await asyncio.sleep(0.03)
        full_response = fallback

    memory.add_message(session_id, "user", user_message)
    memory.add_message(session_id, "assistant", full_response)

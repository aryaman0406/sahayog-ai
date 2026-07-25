import logging
import asyncio
import re
import google.generativeai as genai
from typing import AsyncGenerator

from app.config import settings
from .memory import memory
from app.data.assistant import generate_fallback_reply, is_off_topic

logger = logging.getLogger(__name__)

# ── Gemini model initialisation ───────────────────────────────────────────────
model = None
if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY not in ("your_key_here", ""):
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        available = []
        try:
            available = [
                m.name for m in genai.list_models()
                if "generateContent" in m.supported_generation_methods
            ]
            logger.info(f"Available Gemini models: {available[:5]}")
        except Exception as e:
            logger.warning(f"Could not list models: {e}")

        # Preferred order; fall back to whatever the key supports
        preferred = ["models/gemini-1.5-flash", "models/gemini-1.5-pro", "models/gemini-1.0-pro"]
        chosen = next((p for p in preferred if p in available), None)
        if chosen is None and available:
            chosen = available[0]

        if chosen:
            model = genai.GenerativeModel(chosen)
            logger.info(f"Gemini model loaded: {chosen}")
        else:
            logger.warning("No Gemini model available — using rule-based fallback.")
    except Exception as e:
        logger.error(f"Gemini init failed: {e}")
else:
    logger.warning("GEMINI_API_KEY not set — using rule-based fallback assistant.")


# ── Semantic search ───────────────────────────────────────────────────────────
def _semantic_search(query: str, n_results: int = 5) -> list:
    try:
        from .embedder import semantic_search
        return semantic_search(query, n_results=n_results)
    except Exception:
        return []


# ── Vague follow-up detection ─────────────────────────────────────────────────
# These patterns mean the user is asking about the SAME scheme as before
_VAGUE_RE = re.compile(
    r"^(how\s+to\s+apply(\s+for\s+(it|this))?|"
    r"apply(\s+for\s+(it|this))?|"
    r"(what\s+)?(documents?|papers?|required|needed)(\s+(for\s+)?(it|this))?|"
    r"(eligib(le|ility))(\s+for\s+(it|this))?|"
    r"(benefits?|amount|how\s+much|kitna|paise)(\s+(of|for)\s+(it|this))?|"
    r"tell\s+me\s+more|more\s+details?|explain\s+(it|this|more)|"
    r"next\s+step(s)?|and\s+then|what\s+is\s+it|elaborate)\??\s*$",
    re.IGNORECASE,
)

def _is_vague_followup(msg: str) -> bool:
    return bool(_VAGUE_RE.match(msg.strip()))


# ── Active scheme resolution ──────────────────────────────────────────────────
def _resolve_active_scheme_from_results(results: list) -> dict | None:
    """Pick the top result if it has meaningful relevance (> 15 score)."""
    if not results:
        return None
    top = results[0]
    if top.get("relevance_score", 0) > 15:
        # Return the full scheme dict from the ID
        from app.data.schemes import get_scheme_by_id
        scheme = get_scheme_by_id(str(top.get("id", "")))
        return scheme
    return None


def _build_search_query(user_message: str, session_id: str) -> str:
    """For vague follow-ups, append the active scheme name so TF-IDF finds the right doc."""
    if _is_vague_followup(user_message):
        active = memory.get_active_scheme(session_id)
        if active:
            name = active.get("name", "")
            if name:
                return f"{user_message} {name}"
    return user_message


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
3. IMPORTANT: When the user says "how to apply", "documents needed", "benefits" \
   without naming a scheme — look at CONVERSATION HISTORY to find which scheme \
   was being discussed, then answer about THAT scheme only.
4. If context doesn't contain the answer, say:
   "I don't have that specific information. Please visit myscheme.gov.in \
   or call 1800-180-1111 for details."
5. Never invent scheme details, amounts, or dates.
6. Always name the scheme you are referring to.
"""

LANG_MAP = {
    "en": "English", "hi": "Hindi", "ta": "Tamil",
    "mr": "Marathi", "bn": "Bengali", "te": "Telugu",
    "kn": "Kannada", "gu": "Gujarati",
}


def build_prompt(user_message, profile, retrieved_schemes, conversation_history, language):
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
        f"CONVERSATION HISTORY (use this to understand follow-up questions):\n"
        f"{conversation_history or 'None'}\n\n"
        f"USER: {user_message}\n"
        f"SAHAYOG AI:"
    )


# ── Gemini helpers ────────────────────────────────────────────────────────────
def _gemini_sync(prompt: str):
    if not model:
        return None
    try:
        return model.generate_content(prompt).text
    except Exception as e:
        logger.error(f"Gemini generate error: {e}")
        return None


def _gemini_stream_obj(prompt: str):
    if not model:
        return None, "No model"
    try:
        return model.generate_content(prompt, stream=True), None
    except Exception as e:
        logger.error(f"Gemini stream error: {e}")
        return None, str(e)


# ── Public API ────────────────────────────────────────────────────────────────
def rag_generate(user_message: str, profile: dict, session_id: str, language: str = "en") -> str:
    search_query = _build_search_query(user_message, session_id)
    semantic_results = _semantic_search(search_query, n_results=5)
    history_str = memory.get_context_string(session_id)
    relevant = [s for s in semantic_results if s.get("relevance_score", 0) > 5]

    # Update active scheme if user named a specific one (non-vague query)
    if not _is_vague_followup(user_message):
        found = _resolve_active_scheme_from_results(semantic_results)
        if found:
            memory.set_active_scheme(session_id, found)

    reply = None
    if model and not is_off_topic(user_message):
        prompt = build_prompt(user_message, profile, relevant, history_str, language)
        reply = _gemini_sync(prompt)

    if reply is None:
        reply = generate_fallback_reply(user_message, semantic_results, language, session_id)

    memory.add_message(session_id, "user", user_message)
    memory.add_message(session_id, "assistant", reply)
    return reply


async def rag_stream(
    user_message: str, profile: dict, session_id: str, language: str = "en"
) -> AsyncGenerator[str, None]:
    search_query = _build_search_query(user_message, session_id)
    semantic_results = _semantic_search(search_query, n_results=5)
    history_str = memory.get_context_string(session_id)
    relevant = [s for s in semantic_results if s.get("relevance_score", 0) > 5]

    # Update active scheme if user named a specific one (non-vague query)
    if not _is_vague_followup(user_message):
        found = _resolve_active_scheme_from_results(semantic_results)
        if found:
            memory.set_active_scheme(session_id, found)

    full_response = ""

    if is_off_topic(user_message):
        fallback = generate_fallback_reply(user_message, [], language, session_id)
        for word in fallback.split():
            yield word + " "
            await asyncio.sleep(0.03)
        full_response = fallback

    elif model:
        prompt = build_prompt(user_message, profile, relevant, history_str, language)
        stream, err = _gemini_stream_obj(prompt)
        if stream:
            try:
                for chunk in stream:
                    if chunk.text:
                        full_response += chunk.text
                        yield chunk.text
            except Exception as e:
                logger.error(f"Gemini chunk error: {e}")
                if not full_response:
                    fallback = generate_fallback_reply(user_message, semantic_results, language, session_id)
                    for word in fallback.split():
                        yield word + " "
                        await asyncio.sleep(0.03)
                    full_response = fallback
        else:
            fallback = generate_fallback_reply(user_message, semantic_results, language, session_id)
            for word in fallback.split():
                yield word + " "
                await asyncio.sleep(0.03)
            full_response = fallback

    else:
        fallback = generate_fallback_reply(user_message, semantic_results, language, session_id)
        for word in fallback.split():
            yield word + " "
            await asyncio.sleep(0.03)
        full_response = fallback

    memory.add_message(session_id, "user", user_message)
    memory.add_message(session_id, "assistant", full_response)

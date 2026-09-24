"""
Prompt Versions — Tracks iterative improvements to the Sahayog AI system prompt.

Each version documents:
  - What changed from the previous version
  - Why the change was made (hallucination / accuracy issue addressed)
  - The full prompt text

Use ACTIVE_VERSION to switch between versions for evaluation/comparison.
"""

from datetime import date

# ── Version registry ──────────────────────────────────────────────────────────

PROMPT_VERSIONS: dict[str, dict] = {

    "v1": {
        "version": "v1",
        "date": date(2024, 11, 1),
        "changelog": "Initial prompt. Basic role definition only.",
        "issues_addressed": [],
        "prompt": (
            "You are Sahayog AI, a helpful assistant for Indian government welfare schemes.\n"
            "Answer the user's question based on the retrieved schemes."
        ),
    },

    "v2": {
        "version": "v2",
        "date": date(2024, 11, 10),
        "changelog": (
            "Added strict off-topic guard (Rule 1 & 2). "
            "Observed hallucinations when users asked unrelated questions — "
            "model was generating invented scheme names."
        ),
        "issues_addressed": [
            "hallucination: model inventing scheme names for off-topic queries",
            "off-topic: model answering cricket/movies questions",
        ],
        "prompt": (
            "You are Sahayog AI (सहयोग AI), a helpful assistant for Indian citizens "
            "seeking government welfare schemes and benefits.\n\n"
            "Strict Rules:\n"
            "1. Answer ONLY questions about Indian government schemes, eligibility, "
            "documents, application process, or welfare benefits.\n"
            "2. If the user asks ANYTHING unrelated respond EXACTLY with:\n"
            "   \"I'm Sahayog AI, designed only to help with Indian government welfare "
            "schemes. Please ask me about schemes, eligibility, documents, or how to apply!\"\n"
            "3. Never invent scheme details, amounts, or dates.\n"
        ),
    },

    "v3": {
        "version": "v3",
        "date": date(2024, 11, 20),
        "changelog": (
            "Added personality guidelines, vague follow-up handling (Rule 3), "
            "and fallback citation (Rule 4). "
            "Observed model losing context on follow-up questions like 'how to apply' — "
            "it answered about random schemes instead of the one being discussed."
        ),
        "issues_addressed": [
            "context loss: model forgetting active scheme on follow-up queries",
            "hallucination: model citing wrong scheme name in follow-ups",
            "accuracy: added explicit fallback to myscheme.gov.in when unsure",
        ],
        "prompt": (
            "You are Sahayog AI (सहयोग AI), a warm, helpful assistant "
            "for Indian citizens seeking government welfare schemes and benefits.\n\n"
            "Personality:\n"
            "- Warm and respectful; use \"ji\" occasionally when speaking Hindi\n"
            "- Simple language, avoid jargon\n"
            "- Specific: mention exact amounts, dates, scheme names\n"
            "- Honest: if a scheme doesn't match, say so\n"
            "- Actionable: always end with a clear next step\n\n"
            "Strict Rules:\n"
            "1. Answer ONLY questions about Indian government schemes, eligibility, "
            "documents, application process, or welfare benefits.\n"
            "2. If the user asks ANYTHING unrelated (cricket, movies, coding, jokes, "
            "general knowledge, etc.) respond EXACTLY with:\n"
            "   \"I'm Sahayog AI, designed only to help with Indian government welfare "
            "schemes. Please ask me about schemes, eligibility, documents, or how to apply!\"\n"
            "3. IMPORTANT: When the user says \"how to apply\", \"documents needed\", \"benefits\" "
            "without naming a scheme — look at CONVERSATION HISTORY to find which scheme "
            "was being discussed, then answer about THAT scheme only.\n"
            "4. If context doesn't contain the answer, say:\n"
            "   \"I don't have that specific information. Please visit myscheme.gov.in "
            "or call 1800-180-1111 for details.\"\n"
            "5. Never invent scheme details, amounts, or dates.\n"
            "6. Always name the scheme you are referring to.\n"
        ),
    },
}

# ── Active version ────────────────────────────────────────────────────────────

ACTIVE_VERSION = "v3"


def get_active_prompt() -> str:
    """Returns the system prompt for the currently active version."""
    return PROMPT_VERSIONS[ACTIVE_VERSION]["prompt"]


def get_version_info(version: str = None) -> dict:
    """Returns metadata for a specific version, or the active one."""
    key = version or ACTIVE_VERSION
    return PROMPT_VERSIONS.get(key, {})


def list_versions() -> list[dict]:
    """Returns a summary of all prompt versions (version, date, changelog)."""
    return [
        {
            "version": v["version"],
            "date": str(v["date"]),
            "changelog": v["changelog"],
            "issues_addressed": v["issues_addressed"],
        }
        for v in PROMPT_VERSIONS.values()
    ]


def compare_versions(v_a: str, v_b: str) -> dict:
    """Side-by-side comparison of two prompt versions."""
    a = PROMPT_VERSIONS.get(v_a)
    b = PROMPT_VERSIONS.get(v_b)
    if not a or not b:
        return {"error": f"Version '{v_a}' or '{v_b}' not found"}
    return {
        "version_a": v_a,
        "version_b": v_b,
        "changelog_b": b["changelog"],
        "issues_addressed_in_b": b["issues_addressed"],
        "prompt_a_length": len(a["prompt"]),
        "prompt_b_length": len(b["prompt"]),
        "prompt_a": a["prompt"],
        "prompt_b": b["prompt"],
    }

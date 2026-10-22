"""
Hallucination Evaluation Script — Sahayog AI
=============================================
Tests whether the LLM generates scheme names/amounts NOT present in the
ground-truth schemes.json database (i.e., hallucinated facts).

Usage:
    cd backend
    python -m evals.eval_hallucination

Output:
    Prints a per-query report + overall hallucination rate (%).
    Saves results to evals/results/hallucination_report.json
"""

import os
import sys
import json
import re
import logging
from pathlib import Path
from datetime import datetime

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))
os.chdir(Path(__file__).parent.parent)

logging.basicConfig(level=logging.WARNING)  # Suppress verbose startup logs

from app.rag.embedder import build_index  # noqa: E402
from app.data.schemes import get_all_schemes  # noqa: E402

# ── Ground-truth scheme name set ──────────────────────────────────────────────

def _load_known_scheme_names() -> set[str]:
    """Load all official scheme names from schemes.json (lowercased)."""
    schemes = get_all_schemes()
    return {s["name"].lower() for s in schemes if s.get("name")}


# ── Hallucination detection ────────────────────────────────────────────────────

def _extract_scheme_mentions(text: str) -> list[str]:
    """
    Extract scheme name candidates from LLM response.
    Looks for bold-marked names (**Name**) and capitalized multi-word phrases.
    """
    candidates = []
    # Bold names: **Scheme Name**
    bold = re.findall(r"\*\*(.+?)\*\*", text)
    candidates.extend(bold)
    # Quoted names: "Scheme Name" or 'Scheme Name'
    quoted = re.findall(r'["\']([A-Z][^"\']{5,60})["\']', text)
    candidates.extend(quoted)
    return [c.strip().lower() for c in candidates if len(c.strip()) > 4]


def is_hallucinated(scheme_mention: str, known_names: set[str]) -> bool:
    """
    Returns True if the mention does NOT match any known scheme name,
    even partially (substring match with length > 6).
    """
    mention = scheme_mention.lower()
    for known in known_names:
        if mention in known or known in mention:
            return False
        # Token overlap: at least 2 meaningful words in common
        m_words = set(mention.split()) - {"the", "a", "an", "of", "for", "and", "to"}
        k_words = set(known.split()) - {"the", "a", "an", "of", "for", "and", "to"}
        if len(m_words & k_words) >= 2:
            return False
    return True


# ── Test cases ────────────────────────────────────────────────────────────────

TEST_CASES = [
    {
        "id": "T01",
        "query": "What schemes are available for farmers?",
        "profile": {"occupation": "farmer", "age": 35, "annual_income": 60000, "location_type": "rural", "gender": "male"},
        "language": "en",
        "expect_no_hallucination": True,
    },
    {
        "id": "T02",
        "query": "I am a woman entrepreneur, what government support can I get?",
        "profile": {"occupation": "self-employed", "age": 28, "annual_income": 150000, "location_type": "urban", "gender": "female"},
        "language": "en",
        "expect_no_hallucination": True,
    },
    {
        "id": "T03",
        "query": "Tell me about PM Kisan benefits",
        "profile": {"occupation": "farmer", "age": 45, "annual_income": 80000, "location_type": "rural", "gender": "male"},
        "language": "en",
        "expect_no_hallucination": True,
    },
    {
        "id": "T04",
        "query": "What is the Ayushman Bharat income limit?",
        "profile": {"occupation": "salaried", "age": 40, "annual_income": 200000, "location_type": "urban", "gender": "male"},
        "language": "en",
        "expect_no_hallucination": True,
    },
    {
        "id": "T05",
        "query": "Scholarship for SC/ST students",
        "profile": {"occupation": "student", "age": 20, "annual_income": 50000, "location_type": "rural", "gender": "female"},
        "language": "en",
        "expect_no_hallucination": True,
    },
    {
        "id": "T06",
        "query": "Who is Virat Kohli?",   # Off-topic: should be deflected, no scheme invented
        "profile": {},
        "language": "en",
        "expect_no_hallucination": True,
    },
    {
        "id": "T07",
        "query": "किसान के लिए कौन सी योजनाएं हैं?",  # Hindi
        "profile": {"occupation": "farmer", "age": 50, "annual_income": 40000, "location_type": "rural", "gender": "male"},
        "language": "hi",
        "expect_no_hallucination": True,
    },
    {
        "id": "T08",
        "query": "Housing scheme for urban poor",
        "profile": {"occupation": "unemployed", "age": 33, "annual_income": 30000, "location_type": "urban", "gender": "male"},
        "language": "en",
        "expect_no_hallucination": True,
    },
]


# ── Runner ────────────────────────────────────────────────────────────────────

def run_evaluation():
    print("=" * 60)
    print("  Sahayog AI — Hallucination Evaluation")
    print(f"  Run at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Build index
    print("\n[*] Building TF-IDF index...")
    build_index()

    # Load ground truth
    known_names = _load_known_scheme_names()
    print(f"[*] Loaded {len(known_names)} known scheme names from schemes.json\n")

    # Try to import rag_generate (requires GEMINI_API_KEY)
    try:
        from app.rag.generator import rag_generate
        has_llm = True
        print("[*] LLM (Gemini) available — testing live responses\n")
    except Exception as e:
        has_llm = False
        print(f"[!] LLM not available ({e}) — testing fallback replies only\n")
        from app.data.assistant import generate_fallback_reply
        from app.rag.embedder import semantic_search

    results = []
    hallucinated_count = 0

    for tc in TEST_CASES:
        print(f"--- [{tc['id']}] {tc['query'][:55]}...")

        try:
            if has_llm:
                response = rag_generate(
                    user_message=tc["query"],
                    profile=tc["profile"],
                    session_id=f"eval_{tc['id']}",
                    language=tc["language"],
                )
            else:
                hits = semantic_search(tc["query"], n_results=5)
                response = generate_fallback_reply(
                    tc["query"], hits, tc["language"], f"eval_{tc['id']}"
                )
        except Exception as e:
            print(f"    ERROR: {e}\n")
            continue

        mentions = _extract_scheme_mentions(response)
        hallucinated = [m for m in mentions if is_hallucinated(m, known_names)]
        is_clean = len(hallucinated) == 0

        status = "✅ CLEAN" if is_clean else f"❌ HALLUCINATED ({len(hallucinated)} mentions)"
        print(f"    Status : {status}")
        if hallucinated:
            print(f"    Invented: {hallucinated}")
            hallucinated_count += 1
        print(f"    Response (first 120 chars): {response[:120].strip()}\n")

        results.append({
            "id": tc["id"],
            "query": tc["query"],
            "language": tc["language"],
            "response_snippet": response[:200],
            "scheme_mentions": mentions,
            "hallucinated_mentions": hallucinated,
            "is_hallucination_free": is_clean,
        })

    # ── Summary ───────────────────────────────────────────────────────────────
    total = len(results)
    clean = sum(1 for r in results if r["is_hallucination_free"])
    hallucination_rate = round((total - clean) / total * 100, 1) if total else 0
    accuracy_rate = round(clean / total * 100, 1) if total else 0

    print("=" * 60)
    print(f"  RESULTS: {clean}/{total} queries hallucination-free")
    print(f"  Hallucination Rate : {hallucination_rate}%")
    print(f"  Accuracy Rate      : {accuracy_rate}%")
    print("=" * 60)

    # ── Save report ───────────────────────────────────────────────────────────
    out_dir = Path(__file__).parent / "results"
    out_dir.mkdir(exist_ok=True)
    report_path = out_dir / "hallucination_report.json"
    report = {
        "run_at": datetime.now().isoformat(),
        "llm_available": has_llm,
        "total_queries": total,
        "hallucination_free": clean,
        "hallucination_rate_pct": hallucination_rate,
        "accuracy_rate_pct": accuracy_rate,
        "results": results,
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n  Report saved to: {report_path}")
    return report


if __name__ == "__main__":
    run_evaluation()

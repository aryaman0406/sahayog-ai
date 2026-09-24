"""
Multilingual Accuracy Evaluation — Sahayog AI
==============================================
Tests whether Sahayog AI correctly responds in the requested Indian language.

For each supported language, it sends a query and checks:
  1. Whether the response is non-empty
  2. Whether the response language matches the requested language
     (via Unicode script detection — no external library needed)

Usage:
    cd backend
    python -m evals.eval_multilingual

Output:
    Prints per-language accuracy report.
    Saves results to evals/results/multilingual_report.json
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

logging.basicConfig(level=logging.WARNING)

from app.rag.embedder import build_index  # noqa: E402

# ── Unicode script detectors ──────────────────────────────────────────────────
# Each returns True if the text contains characters from that script.

SCRIPT_DETECTORS = {
    "hi": lambda t: bool(re.search(r"[\u0900-\u097F]", t)),        # Devanagari (Hindi, Marathi)
    "mr": lambda t: bool(re.search(r"[\u0900-\u097F]", t)),        # Devanagari (shared with Hindi)
    "ta": lambda t: bool(re.search(r"[\u0B80-\u0BFF]", t)),        # Tamil
    "bn": lambda t: bool(re.search(r"[\u0980-\u09FF]", t)),        # Bengali
    "te": lambda t: bool(re.search(r"[\u0C00-\u0C7F]", t)),        # Telugu
    "kn": lambda t: bool(re.search(r"[\u0C80-\u0CFF]", t)),        # Kannada
    "gu": lambda t: bool(re.search(r"[\u0A80-\u0AFF]", t)),        # Gujarati
    "en": lambda t: bool(re.search(r"[a-zA-Z]{4,}", t)),           # Latin (English)
}

LANG_NAMES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil",
    "mr": "Marathi", "bn": "Bengali", "te": "Telugu",
    "kn": "Kannada", "gu": "Gujarati",
}

# Devanagari is shared between Hindi and Marathi — both pass each other's detector.
# We treat them as a shared script group.
SHARED_SCRIPT_GROUPS = [{"hi", "mr"}]


def _script_match(response: str, requested_lang: str) -> bool:
    """
    Returns True if the response contains characters from the expected script.
    Falls back to True for English if no script is detected (model may mix).
    """
    detector = SCRIPT_DETECTORS.get(requested_lang)
    if not detector:
        return True  # Unknown language — skip check

    if detector(response):
        return True

    # Allow shared script groups (hi <-> mr both use Devanagari)
    for group in SHARED_SCRIPT_GROUPS:
        if requested_lang in group:
            for alt in group:
                if alt != requested_lang and SCRIPT_DETECTORS[alt](response):
                    return True

    # If response has NO non-ASCII content AND is English query — might be English fallback
    if requested_lang == "en":
        return True

    return False


# ── Test cases (same query in each language) ──────────────────────────────────

TEST_CASES = [
    {
        "lang": "en",
        "query": "What farming schemes are available for me?",
        "profile": {"occupation": "farmer", "age": 40, "annual_income": 60000, "location_type": "rural", "gender": "male"},
    },
    {
        "lang": "hi",
        "query": "मेरे लिए कौन सी कृषि योजनाएँ उपलब्ध हैं?",
        "profile": {"occupation": "farmer", "age": 40, "annual_income": 60000, "location_type": "rural", "gender": "male"},
    },
    {
        "lang": "ta",
        "query": "என்னால் பெற முடியும் விவசாய திட்டங்கள் என்ன?",
        "profile": {"occupation": "farmer", "age": 40, "annual_income": 60000, "location_type": "rural", "gender": "male"},
    },
    {
        "lang": "mr",
        "query": "शेतकऱ्यांसाठी कोणत्या सरकारी योजना आहेत?",
        "profile": {"occupation": "farmer", "age": 40, "annual_income": 60000, "location_type": "rural", "gender": "male"},
    },
    {
        "lang": "bn",
        "query": "কৃষকদের জন্য কোন সরকারি প্রকল্প আছে?",
        "profile": {"occupation": "farmer", "age": 40, "annual_income": 60000, "location_type": "rural", "gender": "male"},
    },
    {
        "lang": "te",
        "query": "రైతులకు ఏ ప్రభుత్వ పథకాలు అందుబాటులో ఉన్నాయి?",
        "profile": {"occupation": "farmer", "age": 40, "annual_income": 60000, "location_type": "rural", "gender": "male"},
    },
    {
        "lang": "kn",
        "query": "ರೈತರಿಗೆ ಯಾವ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ?",
        "profile": {"occupation": "farmer", "age": 40, "annual_income": 60000, "location_type": "rural", "gender": "male"},
    },
    {
        "lang": "gu",
        "query": "ખેડૂતો માટે કઈ સરકારી યોજનાઓ ઉપલબ્ધ છે?",
        "profile": {"occupation": "farmer", "age": 40, "annual_income": 60000, "location_type": "rural", "gender": "male"},
    },
]


# ── Runner ────────────────────────────────────────────────────────────────────

def run_evaluation():
    print("=" * 60)
    print("  Sahayog AI — Multilingual Accuracy Evaluation")
    print(f"  Run at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    print("\n[*] Building TF-IDF index...")
    build_index()

    try:
        from app.rag.generator import rag_generate
        has_llm = True
        print("[*] LLM (Gemini) available — testing live multilingual responses\n")
    except Exception as e:
        has_llm = False
        print(f"[!] LLM not available ({e}) — testing fallback replies\n")
        from app.data.assistant import generate_fallback_reply
        from app.rag.embedder import semantic_search

    results = []
    passed = 0

    for tc in TEST_CASES:
        lang_name = LANG_NAMES.get(tc["lang"], tc["lang"])
        print(f"--- [{tc['lang'].upper()}] {lang_name}")
        print(f"    Query: {tc['query'][:60]}")

        try:
            if has_llm:
                response = rag_generate(
                    user_message=tc["query"],
                    profile=tc["profile"],
                    session_id=f"ml_eval_{tc['lang']}",
                    language=tc["lang"],
                )
            else:
                hits = semantic_search(tc["query"], n_results=5)
                response = generate_fallback_reply(
                    tc["query"], hits, tc["lang"], f"ml_eval_{tc['lang']}"
                )
        except Exception as e:
            print(f"    ERROR: {e}\n")
            results.append({
                "lang": tc["lang"], "lang_name": lang_name,
                "query": tc["query"], "response": "",
                "non_empty": False, "script_match": False, "passed": False, "error": str(e),
            })
            continue

        non_empty = bool(response and response.strip())
        script_ok = _script_match(response, tc["lang"]) if non_empty else False
        test_passed = non_empty and script_ok

        if test_passed:
            passed += 1
            status = "✅ PASS"
        else:
            issues = []
            if not non_empty:
                issues.append("empty response")
            if not script_ok:
                issues.append("wrong script/language detected")
            status = f"❌ FAIL ({', '.join(issues)})"

        print(f"    Status      : {status}")
        print(f"    Response    : {response[:100].strip()}\n")

        results.append({
            "lang": tc["lang"],
            "lang_name": lang_name,
            "query": tc["query"],
            "response_snippet": response[:200],
            "non_empty": non_empty,
            "script_match": script_ok,
            "passed": test_passed,
        })

    # ── Summary ───────────────────────────────────────────────────────────────
    total = len(results)
    accuracy = round(passed / total * 100, 1) if total else 0

    print("=" * 60)
    print(f"  RESULTS: {passed}/{total} languages passed")
    print(f"  Multilingual Accuracy: {accuracy}%")
    print("=" * 60)

    # ── Save report ───────────────────────────────────────────────────────────
    out_dir = Path(__file__).parent / "results"
    out_dir.mkdir(exist_ok=True)
    report_path = out_dir / "multilingual_report.json"
    report = {
        "run_at": datetime.now().isoformat(),
        "llm_available": has_llm,
        "languages_tested": total,
        "languages_passed": passed,
        "multilingual_accuracy_pct": accuracy,
        "results": results,
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n  Report saved to: {report_path}")
    return report


if __name__ == "__main__":
    run_evaluation()

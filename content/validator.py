from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional

AXES = {"what", "who", "why_now", "pain_removed", "next_step"}

BANNED_TONE_DEFAULT = [
    "game-changing",
    "revolutionary",
    "once-in-a-lifetime",
    "don’t miss out",
    "don't miss out",
    "limited time only",
    "desperate",
    "sorry",
]

@dataclass(frozen=True)
class ValidationResult:
    ok: bool
    failures: List[str]

def _contains_any(text: str, needles: List[str]) -> bool:
    t = text.lower()
    return any(n.lower() in t for n in needles)

def _count_ctas(text: str, ctas: List[str]) -> int:
    # count exact CTA phrase occurrences (case-insensitive)
    t = text.lower()
    return sum(1 for c in ctas if c.lower() in t)

def _detect_axis(text: str) -> Optional[str]:
    """
    Heuristic axis classifier. Keep it deterministic and conservative.
    If ambiguous, return None and force generator to specify axis.
    """
    t = text.lower()
    patterns = {
        "what": [r"\bpro headshots\b", r"\bheadshot(s)?\b", r"\bportrait(s)?\b"],
        "who": [r"\bfor\b.*\b(founders|job seekers|consultants|teams|professionals)\b"],
        "why_now": [r"\bthis month\b", r"\bnew year\b", r"\bjanuary\b", r"\bnow\b"],
        "pain_removed": [r"\bblurry\b", r"\bcropped\b", r"\bselfie\b", r"\bout of date\b", r"\bundermines\b"],
        "next_step": [r"\bhow it works\b", r"\bbook\b.*\bshoot\b.*\bdeliver\b", r"\bprocess\b.*\bbook\b"],
    }
    hits = {axis: sum(bool(re.search(p, t)) for p in pats) for axis, pats in patterns.items()}
    best = max(hits.items(), key=lambda kv: kv[1])
    if best[1] == 0:
        return None
    # require a margin to avoid accidental matches
    sorted_hits = sorted(hits.values(), reverse=True)
    if len(sorted_hits) > 1 and sorted_hits[0] == sorted_hits[1]:
        return None
    return best[0]

def validate_post(
    *,
    platform: str,
    text: str,
    axis: str,
    policy: Dict,
    booking_link_required: bool = True
) -> ValidationResult:
    failures: List[str] = []
    platforms = set(policy["platforms"])
    if platform not in platforms:
        failures.append(f"platform_not_allowed:{platform}")

    offer = policy["offer"]["primary_project"]
    if offer.lower() not in text.lower():
        failures.append("offer_clarity:missing_offer_name")

    # must include one-of keywords (headshot/portrait/etc)
    must_one_of = policy["gates"]["offer_clarity"]["must_include_one_of"]
    if not _contains_any(text, must_one_of):
        failures.append("offer_clarity:missing_descriptor_keyword")

    # single-idea gate: axis must be declared + must be valid
    if axis not in AXES:
        failures.append("single_idea:invalid_axis")
    # optional: reject ambiguous axis if detected mismatches
    detected = _detect_axis(text)
    if detected is not None and detected != axis:
        failures.append(f"single_idea:axis_mismatch_detected:{detected}!={axis}")

    # CTA gate: exactly one CTA from allowlist
    ctas = policy["cta_allowlist"]
    cta_count = _count_ctas(text, ctas)
    if cta_count != 1:
        failures.append(f"cta:expected_exactly_one_found:{cta_count}")

    # tone gate: banned phrases
    banned = policy["gates"]["tone"].get("banned_phrases") or BANNED_TONE_DEFAULT
    if _contains_any(text, banned):
        failures.append("tone:banned_phrase_present")

    # length caps
    max_chars = policy["safety"]["max_chars"][platform]
    if len(text) > max_chars:
        failures.append(f"length:too_long:{len(text)}>{max_chars}")

    # link sanity (minimal)
    if booking_link_required:
        # If CTA is Book here, require at least one http(s) link.
        if "book here".lower() in text.lower():
            if not re.search(r"https?://", text):
                failures.append("safety:book_here_requires_link")

    return ValidationResult(ok=(len(failures) == 0), failures=failures)

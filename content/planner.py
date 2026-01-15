from __future__ import annotations

from datetime import date
from typing import Dict, List, Tuple

PLATFORMS = ["facebook", "instagram", "linkedin"]

def required_posts_for_day(policy: Dict, day: date) -> List[str]:
    # MV0: exactly 1 per platform per day
    return [p for p in policy["platforms"] if p in PLATFORMS]

def should_post_today(already_posted_count: int, policy: Dict) -> bool:
    return already_posted_count < policy["safety"]["max_posts_per_day_per_platform"]

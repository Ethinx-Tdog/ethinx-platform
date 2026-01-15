from __future__ import annotations

from dataclasses import dataclass
from time import time
from typing import Literal

State = Literal["generated", "pending_review", "approved", "killed", "scheduled", "posted"]

@dataclass
class Draft:
    id: str
    platform: str
    axis: str
    text: str
    state: State
    created_at: float
    review_deadline: float

def to_pending_review(d: Draft, review_window_seconds: int) -> Draft:
    now = time()
    d.state = "pending_review"
    d.created_at = now
    d.review_deadline = now + review_window_seconds
    return d

def auto_approve_if_expired(d: Draft, default_action: str) -> Draft:
    if d.state != "pending_review":
        return d
    if time() >= d.review_deadline and default_action == "auto_proceed":
        d.state = "approved"
    return d

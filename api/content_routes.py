from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

router = APIRouter(prefix="/content", tags=["content"])

# Replace these with your existing storage layer (Redis/DB)
DRAFTS: Dict[str, dict] = {}

class DraftOut(BaseModel):
    id: str
    platform: str
    axis: str
    text: str
    state: str
    review_deadline: float

class DraftEditIn(BaseModel):
    text: str = Field(min_length=1)

@router.get("/drafts", response_model=List[DraftOut])
def list_drafts():
    return list(DRAFTS.values())

@router.get("/drafts/{draft_id}", response_model=DraftOut)
def get_draft(draft_id: str):
    d = DRAFTS.get(draft_id)
    if not d:
        raise HTTPException(404, "draft_not_found")
    return d

@router.post("/drafts/{draft_id}/edit", response_model=DraftOut)
def edit_draft(draft_id: str, payload: DraftEditIn):
    d = DRAFTS.get(draft_id)
    if not d:
        raise HTTPException(404, "draft_not_found")
    if d["state"] not in ("pending_review", "approved"):
        raise HTTPException(409, f"cannot_edit_in_state:{d['state']}")
    d["text"] = payload.text
    d["state"] = "pending_review"  # force re-review after edit
    return d

@router.post("/drafts/{draft_id}/approve", response_model=DraftOut)
def approve_draft(draft_id: str):
    d = DRAFTS.get(draft_id)
    if not d:
        raise HTTPException(404, "draft_not_found")
    if d["state"] != "pending_review":
        raise HTTPException(409, f"cannot_approve_in_state:{d['state']}")
    d["state"] = "approved"
    return d

@router.post("/drafts/{draft_id}/kill", response_model=DraftOut)
def kill_draft(draft_id: str):
    d = DRAFTS.get(draft_id)
    if not d:
        raise HTTPException(404, "draft_not_found")
    d["state"] = "killed"
    return d

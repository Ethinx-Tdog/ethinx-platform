from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, constr

# Content wiring (must exist in your repo as created earlier)
from ethinx.marketing.wire_content import wire_founder_content
from ethinx.marketing.hooks import generate_promo_for_delivery

# Optional event sink (if present)
try:
    from ethinx.core.events import emit_event  # type: ignore
except Exception:  # pragma: no cover
    emit_event = None  # type: ignore


router = APIRouter()

REPO_ROOT = Path(__file__).resolve()
while REPO_ROOT.name != "ethinx-autonomous" and REPO_ROOT.parent != REPO_ROOT:
    REPO_ROOT = REPO_ROOT.parent

DATA_DIR = Path("data")
PROMO_QUEUE_DIR = DATA_DIR / "promo_queue"
POSTING_OUTBOX_DIR = DATA_DIR / "posting_outbox"


class DeliverySentEvent(BaseModel):
    order_id: constr(strip_whitespace=True, min_length=3, max_length=128) = Field(..., description="Order/job id")
    # Allow future payload expansion without breaking determinism
    source: Optional[constr(strip_whitespace=True, min_length=2, max_length=64)] = None
    ts: Optional[str] = None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append_jsonl(path: Path, obj: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = (str(obj).replace("'", '"')) + "\n"  # deterministic minimal JSON-ish
    # Prefer real JSON when available
    try:
        import json
        line = json.dumps(obj, ensure_ascii=False) + "\n"
    except Exception:
        pass
    path.open("a", encoding="utf-8").write(line)


@router.post("/events/delivery_sent")
def delivery_sent(payload: DeliverySentEvent) -> Dict[str, Any]:
    """
    Deterministic delivery event handler.

    Effects (append-only / file-based):
    1) Enqueue promo generation marker: data/promo_queue/<order_id>.jsonl
    2) Materialize founder LinkedIn post: data/posting_outbox/<order_id>/linkedin_post.md
    3) Emit audit events if emit_event is available
    """
    order_id = payload.order_id

    # 1) Promo queue append (jsonl)
    promo_path = PROMO_QUEUE_DIR / f"{order_id}.jsonl"
    _append_jsonl(
        promo_path,
        {
            "ts": _utc_now_iso(),
            "event": "delivery_sent",
            "order_id": order_id,
            "source": payload.source or "unknown",
        },
    )

    # 2) Posting outbox materialization (markdown)
    # This creates: data/posting_outbox/<order_id>/linkedin_post.md
    try:
        wire_founder_content(order_id)
    except Exception as e:
        # Do not break delivery pipeline; quarantine via error response + audit
        if emit_event:
            emit_event("wire_content_failed", {"order_id": order_id, "error": str(e)})
        raise HTTPException(status_code=500, detail={"error": "wire_content_failed", "order_id": order_id})

    # 3) Optional audit events
    if emit_event:
        emit_event("delivery_sent", {"order_id": order_id})
        emit_event("posting_materialized", {"order_id": order_id, "path": str(POSTING_OUTBOX_DIR / order_id / "linkedin_post.md")})

    # 4) Auto-generate promo assets (deterministic)
    promo_result = generate_promo_for_delivery(
        REPO_ROOT,
        order_id=order_id,
        niche="AI headshots",
        package="professional",
        delivered_seconds=None,
        consent=False,
    )

    if emit_event:
        emit_event("promo_generated", {"order_id": order_id, "paths": promo_result.get("paths")})

    return {
        "status": "ok",
        "order_id": order_id,
        "promo_queue": str(promo_path),
        "posting_outbox": str(POSTING_OUTBOX_DIR / order_id / "linkedin_post.md"),
        "promo_paths": promo_result.get("paths"),
    }

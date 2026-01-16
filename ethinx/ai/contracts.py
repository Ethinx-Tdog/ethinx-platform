from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

ActionType = Literal[
    "write_file",
    "patch_file",
    "run_python",
    "http_call",
    "stripe_sync",
    "validate_catalog",
    "emit_report",
]


@dataclass
class PlanAction:
    id: str
    type: ActionType
    description: str
    params: Dict[str, Any] = field(default_factory=dict)
    requires_approval: bool = True
    risk: Literal["low", "medium", "high"] = "medium"


@dataclass
class Plan:
    plan_id: str
    title: str
    intent: str
    assumptions: List[str] = field(default_factory=list)
    actions: List[PlanAction] = field(default_factory=list)
    validation_steps: List[str] = field(default_factory=list)
    rollback_steps: List[str] = field(default_factory=list)
    outputs: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RunResult:
    plan_id: str
    run_id: str
    status: Literal["queued", "running", "failed", "succeeded"]
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    action_results: List[Dict[str, Any]] = field(default_factory=list)
    logs: List[str] = field(default_factory=list)

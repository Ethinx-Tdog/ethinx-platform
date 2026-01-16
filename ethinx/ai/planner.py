from __future__ import annotations

import json
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Dict

from .contracts import Plan, PlanAction


def _plan_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def plan_sync_stripe_catalog() -> Plan:
    plan = Plan(
        plan_id=_plan_id("sync-stripe"),
        title="Sync Stripe catalog",
        intent="sync_stripe_catalog",
        assumptions=[
            "Catalog YAML files are the source of truth.",
            "Stripe API key is available via STRIPE_API_KEY.",
        ],
        validation_steps=[
            "Run catalog validator.",
            "Run Stripe sync dry-run.",
        ],
        rollback_steps=[
            "Deactivate newly created prices if needed.",
        ],
        outputs={
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    plan.actions = [
        PlanAction(
            id="validate-catalog",
            type="validate_catalog",
            description="Validate catalog YAMLs against AUD-immutable rules.",
            requires_approval=False,
            risk="low",
        ),
        PlanAction(
            id="stripe-dry-run",
            type="stripe_sync",
            description="Run Stripe catalog sync in dry-run mode.",
            params={"dry_run": True},
            requires_approval=False,
            risk="medium",
        ),
        PlanAction(
            id="stripe-apply",
            type="stripe_sync",
            description="Apply Stripe catalog sync (creates/updates products and prices).",
            params={"dry_run": False},
            requires_approval=True,
            risk="high",
        ),
        PlanAction(
            id="emit-report",
            type="emit_report",
            description="Write sync summary report to the run log.",
            params={"title": "Stripe catalog sync summary"},
            requires_approval=False,
            risk="low",
        ),
    ]

    return plan


def plan_audit_runtime() -> Plan:
    plan = Plan(
        plan_id=_plan_id("audit-runtime"),
        title="Audit runtime health",
        intent="audit_runtime",
        assumptions=[
            "Runtime dependencies are configured via environment variables.",
        ],
        validation_steps=[
            "Check required environment variables.",
            "Check Redis TCP connectivity.",
            "Check worker health endpoint if configured.",
        ],
        outputs={
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    plan.actions = [
        PlanAction(
            id="runtime-audit",
            type="run_python",
            description="Run runtime health checks.",
            params={"task": "audit_runtime"},
            requires_approval=False,
            risk="low",
        ),
        PlanAction(
            id="emit-report",
            type="emit_report",
            description="Write audit report to the run log.",
            params={"title": "Runtime audit summary"},
            requires_approval=False,
            risk="low",
        ),
    ]

    return plan


def plan_content_pack() -> Plan:
    plan = Plan(
        plan_id=_plan_id("content-pack"),
        title="Generate content pack",
        intent="content_pack",
        assumptions=[
            "Generated content is stored in run artifacts.",
        ],
        validation_steps=[
            "Review generated content pack before use.",
        ],
        outputs={
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    plan.actions = [
        PlanAction(
            id="content-pack",
            type="run_python",
            description="Generate structured content payloads.",
            params={"task": "content_pack"},
            requires_approval=False,
            risk="low",
        ),
        PlanAction(
            id="emit-report",
            type="emit_report",
            description="Write content pack summary to the run log.",
            params={"title": "Content pack summary"},
            requires_approval=False,
            risk="low",
        ),
    ]

    return plan


def plan_for_intent(intent: str) -> Plan:
    plans: Dict[str, Plan] = {
        "sync_stripe_catalog": plan_sync_stripe_catalog(),
        "audit_runtime": plan_audit_runtime(),
        "content_pack": plan_content_pack(),
    }

    if intent not in plans:
        raise ValueError(f"Unsupported intent: {intent}")

    return plans[intent]


def plan_to_json(plan: Plan) -> str:
    return json.dumps(asdict(plan), indent=2)

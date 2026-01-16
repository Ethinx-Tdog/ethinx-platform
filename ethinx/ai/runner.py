from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from .contracts import Plan, PlanAction, RunResult
from . import store

REPO_ROOT = Path(__file__).resolve().parents[2]
ALLOWED_ROOTS = {
    REPO_ROOT / "catalog",
    REPO_ROOT / "ethinx",
    REPO_ROOT / "scripts",
    REPO_ROOT / ".github" / "workflows",
}

ALLOWED_RUN_TASKS = {"audit_runtime", "content_pack"}


class RunnerError(RuntimeError):
    pass


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resolve_path(path: str) -> Path:
    candidate = (REPO_ROOT / path).resolve()
    if not any(str(candidate).startswith(str(root.resolve())) for root in ALLOWED_ROOTS):
        raise RunnerError(f"Path not allowed: {path}")
    return candidate


def _bounded(text: str, limit: int = 8000) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "...<truncated>"


def _run_command(args: List[str], cwd: Optional[Path] = None) -> Dict[str, Any]:
    result = subprocess.run(
        args,
        cwd=str(cwd or REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "returncode": result.returncode,
        "stdout": _bounded(result.stdout),
        "stderr": _bounded(result.stderr),
    }


def _require_stripe_safety() -> None:
    api_key = os.getenv("STRIPE_API_KEY", "")
    if api_key.startswith("sk_live"):
        live_mode = os.getenv("STRIPE_LIVE_MODE", "").strip().lower() in {"1", "true", "yes"}
        if not live_mode:
            raise RunnerError("Refusing live Stripe key without STRIPE_LIVE_MODE=true")


def _audit_runtime() -> Dict[str, Any]:
    required_env = ["STRIPE_API_KEY", "REDIS_URL"]
    env_status = {key: bool(os.getenv(key)) for key in required_env}

    redis_url = os.getenv("REDIS_URL", "")
    redis_ok = False
    redis_error = None
    if redis_url:
        parsed = urlparse(redis_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        try:
            with socket.create_connection((host, port), timeout=2):
                redis_ok = True
        except OSError as exc:
            redis_error = str(exc)

    worker_url = os.getenv("WORKER_HEALTH_URL")
    worker_ok = None
    worker_error = None
    if worker_url:
        try:
            req = Request(worker_url, method="GET")
            with urlopen(req, timeout=3) as resp:
                worker_ok = resp.status == 200
        except Exception as exc:
            worker_ok = False
            worker_error = str(exc)

    return {
        "env": env_status,
        "redis": {"reachable": redis_ok, "error": redis_error},
        "worker": {"url": worker_url, "ok": worker_ok, "error": worker_error},
    }


def _content_pack() -> Dict[str, Any]:
    return {
        "sections": [
            {"title": "Headline", "content": "<fill-in-headline>"},
            {"title": "Value Proposition", "content": "<fill-in-value-prop>"},
            {"title": "CTA", "content": "<fill-in-cta>"},
        ],
        "notes": "Review and tailor before publishing.",
    }


class Runner:
    def __init__(self) -> None:
        self.logs: List[str] = []
        self._current_run_id: Optional[str] = None

    def log(self, message: str) -> None:
        entry = f"{_now()} {message}"
        self.logs.append(entry)

    def run_plan(self, plan: Plan, approve_all: bool = False) -> RunResult:
        run_id = store.new_run_id()
        self._current_run_id = run_id
        store.write_plan(run_id, plan)

        result = RunResult(
            plan_id=plan.plan_id,
            run_id=run_id,
            status="running",
            started_at=_now(),
        )

        self.log(f"Run {run_id} started for plan {plan.plan_id}")

        for action in plan.actions:
            action_result = self._run_action(action, approve_all)
            result.action_results.append(action_result)
            if action_result["status"] == "failed":
                result.status = "failed"
                break

        if result.status != "failed":
            result.status = "succeeded"

        result.finished_at = _now()
        result.logs = list(self.logs)
        store.write_result(run_id, result)
        store.write_logs(run_id, self.logs)

        self._current_run_id = None
        return result

    def _run_action(self, action: PlanAction, approve_all: bool) -> Dict[str, Any]:
        started_at = _now()
        if action.requires_approval and not approve_all:
            msg = f"Action {action.id} requires approval"
            self.log(msg)
            return {
                "id": action.id,
                "type": action.type,
                "status": "failed",
                "started_at": started_at,
                "finished_at": _now(),
                "error": msg,
            }

        try:
            output = self._execute_action(action)
            status = "succeeded"
        except Exception as exc:
            output = {"error": str(exc)}
            status = "failed"

        finished_at = _now()
        self.log(f"Action {action.id} {status}")
        return {
            "id": action.id,
            "type": action.type,
            "status": status,
            "started_at": started_at,
            "finished_at": finished_at,
            "output": output,
        }

    def _execute_action(self, action: PlanAction) -> Dict[str, Any]:
        if action.type == "validate_catalog":
            result = _run_command([sys.executable, "catalog/validate_catalog.py"], cwd=REPO_ROOT)
            if result["returncode"] != 0:
                raise RunnerError("Catalog validation failed")
            return result

        if action.type == "stripe_sync":
            _require_stripe_safety()
            args = [sys.executable, "-m", "ethinx.stripe.catalog_sync"]
            if action.params.get("dry_run", False):
                args.append("--dry-run")
            if action.params.get("deactivate_stale", False):
                args.append("--deactivate-stale")
            result = _run_command(args, cwd=REPO_ROOT)
            if result["returncode"] != 0:
                raise RunnerError("Stripe sync failed")
            return result

        if action.type == "write_file" or action.type == "patch_file":
            path = action.params.get("path")
            content = action.params.get("content")
            if not isinstance(path, str) or content is None:
                raise RunnerError("write_file/patch_file requires path and content")
            target = _resolve_path(path)
            target.write_text(str(content), encoding="utf-8")
            return {"path": str(target)}

        if action.type == "run_python":
            task = action.params.get("task")
            if task not in ALLOWED_RUN_TASKS:
                raise RunnerError(f"Task not allowed: {task}")
            if task == "audit_runtime":
                return _audit_runtime()
            if task == "content_pack":
                payload = _content_pack()
                artifact = store.write_artifact(
                    self._current_run_id or "unknown",
                    "content_pack.json",
                    json.dumps(payload, indent=2),
                )
                return {"artifact": str(artifact), "payload": payload}

        if action.type == "emit_report":
            title = action.params.get("title", "Report")
            body = action.params.get("body", "")
            content = f\"# {title}\\n\\n{body}\\n\"
            artifact = store.write_artifact(
                self._current_run_id or "unknown",
                "report.md",
                content,
            )
            return {"title": title, "body": body, "artifact": str(artifact)}

        raise RunnerError(f"Unsupported action type: {action.type}")


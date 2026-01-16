from __future__ import annotations

import json
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List

from .contracts import Plan, RunResult

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNS_DIR = REPO_ROOT / "var" / "ai_runs"
STATE_DIR = REPO_ROOT / "var" / "ai_state"
DECISIONS_FILE = STATE_DIR / "decisions.jsonl"


def ensure_dirs() -> None:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def new_run_id() -> str:
    return uuid.uuid4().hex


def run_dir(run_id: str) -> Path:
    return RUNS_DIR / run_id


def write_plan(run_id: str, plan: Plan) -> Path:
    ensure_dirs()
    target = run_dir(run_id)
    target.mkdir(parents=True, exist_ok=True)
    plan_path = target / "plan.json"
    plan_path.write_text(json.dumps(asdict(plan), indent=2), encoding="utf-8")
    return plan_path


def write_result(run_id: str, result: RunResult) -> Path:
    ensure_dirs()
    target = run_dir(run_id)
    target.mkdir(parents=True, exist_ok=True)
    result_path = target / "result.json"
    result_path.write_text(json.dumps(asdict(result), indent=2), encoding="utf-8")
    return result_path


def write_logs(run_id: str, logs: Iterable[str]) -> Path:
    ensure_dirs()
    target = run_dir(run_id)
    target.mkdir(parents=True, exist_ok=True)
    log_path = target / "logs.txt"
    log_path.write_text("\n".join(logs), encoding="utf-8")
    return log_path


def write_artifact(run_id: str, name: str, content: str) -> Path:
    ensure_dirs()
    target = run_dir(run_id)
    target.mkdir(parents=True, exist_ok=True)
    artifact_path = target / name
    artifact_path.write_text(content, encoding="utf-8")
    return artifact_path


def append_decision(event: str, payload: dict) -> None:
    ensure_dirs()
    entry = {
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    with DECISIONS_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry) + "\n")


def list_runs() -> List[str]:
    if not RUNS_DIR.exists():
        return []
    return sorted([p.name for p in RUNS_DIR.iterdir() if p.is_dir()])


def read_run_result(run_id: str) -> RunResult:
    result_path = run_dir(run_id) / "result.json"
    data = json.loads(result_path.read_text(encoding="utf-8"))
    return RunResult(**data)

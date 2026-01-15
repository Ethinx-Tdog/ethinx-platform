# FILE: ethinx/core/persistence.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ethinx.core.database import DatabaseManager
from ethinx.core.models import RunRecord


def utcnow() -> datetime:
    # SQLite commonly returns naive datetimes; keep everything naive UTC.
    return datetime.utcnow()


def _to_naive_utc(dt: datetime) -> datetime:
    if dt is None:
        return dt
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


@dataclass
class RunRepository:
    db: DatabaseManager

    def create_run(
        self,
        run_id: str,
        environment: str,
        trigger_type: str = "api",
        trigger_source: str = "POST /v1/run",
        agents_executed: Optional[List[str]] = None,
        execution_order: Optional[List[str]] = None,
        tags: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
    ) -> RunRecord:
        record = RunRecord(
            id=run_id,
            environment=environment,
            trigger_type=trigger_type,
            trigger_source=trigger_source,
            started_at=utcnow(),
            agents_executed=agents_executed or [],
            execution_order=execution_order or [],
            total_agents=len(agents_executed or []),
            success=False,
            results={},
            tags=tags or {},
            notes=notes,
        )

        with self.db.get_session() as session:
            session.add(record)
            session.commit()
            session.refresh(record)

        return record

    def complete_run_success(
        self,
        run_id: str,
        results: Dict[str, Any],
        summary: Optional[str] = None,
    ) -> RunRecord:
        with self.db.get_session() as session:
            record = session.get(RunRecord, run_id)
            if record is None:
                raise KeyError(f"Run not found: {run_id}")

            record.completed_at = utcnow()
            record.success = True
            record.results = results or {}
            record.summary = summary

            if record.started_at and record.completed_at:
                started = _to_naive_utc(record.started_at)
                completed = _to_naive_utc(record.completed_at)
                record.duration_seconds = (completed - started).total_seconds()

            agent_names = list((results or {}).keys())
            record.agents_executed = agent_names
            record.execution_order = agent_names
            record.total_agents = len(agent_names)

            session.add(record)
            session.commit()
            session.refresh(record)
            return record

    def complete_run_failure(
        self,
        run_id: str,
        error: str,
        error_traceback: Optional[str] = None,
        summary: Optional[str] = None,
    ) -> RunRecord:
        with self.db.get_session() as session:
            record = session.get(RunRecord, run_id)
            if record is None:
                raise KeyError(f"Run not found: {run_id}")

            record.completed_at = utcnow()
            record.success = False
            record.error = error
            record.error_traceback = error_traceback
            record.summary = summary

            if record.started_at and record.completed_at:
                started = _to_naive_utc(record.started_at)
                completed = _to_naive_utc(record.completed_at)
                record.duration_seconds = (completed - started).total_seconds()

            session.add(record)
            session.commit()
            session.refresh(record)
            return record

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        with self.db.get_session() as session:
            record = session.get(RunRecord, run_id)
            return record.to_dict() if record else None

    def list_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        limit = max(1, min(int(limit), 500))
        with self.db.get_session() as session:
            rows = (
                session.query(RunRecord)
                .order_by(RunRecord.created_at.desc())
                .limit(limit)
                .all()
            )
            return [r.to_dict() for r in rows]

    def export_run_json(self, run_id: str) -> Dict[str, Any]:
        run = self.get_run(run_id)
        if not run:
            raise KeyError(f"Run not found: {run_id}")
        return run

    def export_run_markdown(self, run_id: str) -> str:
        run = self.get_run(run_id)
        if not run:
            raise KeyError(f"Run not found: {run_id}")

        lines: List[str] = []
        lines.append("# ETHINX Run Pack")
        lines.append("")
        lines.append(f"- **run_id:** `{run.get('id')}`")
        lines.append(f"- **environment:** `{run.get('environment')}`")
        lines.append(f"- **success:** `{run.get('success')}`")
        lines.append(f"- **created_at:** `{run.get('created_at')}`")
        lines.append(f"- **started_at:** `{run.get('started_at')}`")
        lines.append(f"- **completed_at:** `{run.get('completed_at')}`")
        lines.append(f"- **duration_seconds:** `{run.get('duration_seconds')}`")
        lines.append("")

        if run.get("summary"):
            lines.append("## Summary")
            lines.append(run["summary"])
            lines.append("")

        results = run.get("results") or {}
        lines.append("## Agent Outputs")
        lines.append("")

        if not results:
            lines.append("_No results recorded._")
        else:
            import json
            for agent_name, payload in results.items():
                lines.append(f"### {agent_name}")
                lines.append("```json")
                lines.append(json.dumps(payload, indent=2, ensure_ascii=False))
                lines.append("```")
                lines.append("")

        if run.get("error"):
            lines.append("## Error")
            lines.append("")
            lines.append(str(run.get("error")))

            if run.get("error_traceback"):
                lines.append("")
                lines.append("```")
                lines.append(str(run.get("error_traceback")))
                lines.append("```")

        return "\n".join(lines)

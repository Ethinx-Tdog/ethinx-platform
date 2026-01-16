from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path
from typing import List

from .contracts import Plan, PlanAction
from .planner import plan_for_intent, plan_to_json
from .runner import Runner
from . import store


def _load_plan(path: Path) -> Plan:
    data = json.loads(path.read_text(encoding="utf-8"))
    actions = [PlanAction(**action) for action in data.get("actions", [])]
    return Plan(
        plan_id=data["plan_id"],
        title=data["title"],
        intent=data["intent"],
        assumptions=data.get("assumptions", []),
        actions=actions,
        validation_steps=data.get("validation_steps", []),
        rollback_steps=data.get("rollback_steps", []),
        outputs=data.get("outputs", {}),
    )


def _write_plan_output(plan: Plan, out_file: Path) -> None:
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(plan_to_json(plan), encoding="utf-8")


def cmd_plan(args: argparse.Namespace) -> int:
    plan = plan_for_intent(args.intent)
    _write_plan_output(plan, Path(args.out_file))
    print(plan_to_json(plan))
    return 0


def cmd_apply(args: argparse.Namespace) -> int:
    plan = _load_plan(Path(args.plan_file))
    runner = Runner()
    result = runner.run_plan(plan, approve_all=args.approve)
    print(json.dumps(asdict(result), indent=2))
    return 0 if result.status == "succeeded" else 1


def cmd_runs(_: argparse.Namespace) -> int:
    runs = store.list_runs()
    print(json.dumps({"runs": runs}, indent=2))
    return 0


def cmd_show_run(args: argparse.Namespace) -> int:
    result = store.read_run_result(args.run_id)
    print(json.dumps(asdict(result), indent=2))
    return 0


def cmd_validate(_: argparse.Namespace) -> int:
    runner = Runner()
    plan = Plan(
        plan_id="validate",
        title="Validate catalog",
        intent="validate",
        assumptions=[],
        actions=[
            PlanAction(
                id="validate-catalog",
                type="validate_catalog",
                description="Validate catalog YAMLs.",
                requires_approval=False,
                risk="low",
            )
        ],
        validation_steps=[],
        rollback_steps=[],
        outputs={},
    )
    result = runner.run_plan(plan, approve_all=True)
    print(json.dumps(asdict(result), indent=2))
    return 0 if result.status == "succeeded" else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ETHINX AI CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    plan_parser = subparsers.add_parser("plan", help="Generate a plan")
    plan_parser.add_argument("--intent", required=True)
    plan_parser.add_argument("--out-file", default="out/plan.json")
    plan_parser.set_defaults(func=cmd_plan)

    apply_parser = subparsers.add_parser("apply", help="Apply a plan")
    apply_parser.add_argument("--plan-file", required=True)
    apply_parser.add_argument("--approve", action="store_true", help="Approve all actions")
    apply_parser.set_defaults(func=cmd_apply)

    runs_parser = subparsers.add_parser("runs", help="List runs")
    runs_parser.set_defaults(func=cmd_runs)

    show_parser = subparsers.add_parser("show-run", help="Show a run result")
    show_parser.add_argument("--run-id", required=True)
    show_parser.set_defaults(func=cmd_show_run)

    validate_parser = subparsers.add_parser("validate", help="Validate catalog")
    validate_parser.set_defaults(func=cmd_validate)

    return parser


def main(argv: List[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

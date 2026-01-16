import os
import unittest
from dataclasses import dataclass

from ethinx.ai.contracts import Plan, PlanAction
from ethinx.ai.runner import Runner


@dataclass
class EnvGuard:
    key: str
    value: str

    def __enter__(self):
        self.original = os.getenv(self.key)
        os.environ[self.key] = self.value

    def __exit__(self, exc_type, exc, tb):
        if self.original is None:
            os.environ.pop(self.key, None)
        else:
            os.environ[self.key] = self.original


class RunnerPathTests(unittest.TestCase):
    def test_runner_blocks_disallowed_write_path(self) -> None:
        plan = Plan(
            plan_id="test",
            title="Test",
            intent="test",
            assumptions=[],
            actions=[
                PlanAction(
                    id="write-outside",
                    type="write_file",
                    description="Attempt to write outside allowlist",
                    params={"path": "../outside.txt", "content": "nope"},
                    requires_approval=False,
                    risk="low",
                )
            ],
            validation_steps=[],
            rollback_steps=[],
            outputs={},
        )

        runner = Runner()
        result = runner.run_plan(plan, approve_all=True)
        self.assertEqual(result.status, "failed")
        self.assertEqual(result.action_results[0]["status"], "failed")

    def test_runner_refuses_live_key_without_flag(self) -> None:
        plan = Plan(
            plan_id="test-live",
            title="Test",
            intent="test",
            assumptions=[],
            actions=[
                PlanAction(
                    id="stripe-sync",
                    type="stripe_sync",
                    description="Attempt stripe sync",
                    params={"dry_run": True},
                    requires_approval=False,
                    risk="high",
                )
            ],
            validation_steps=[],
            rollback_steps=[],
            outputs={},
        )

        runner = Runner()
        with EnvGuard("STRIPE_API_KEY", "sk_live_test"):
            os.environ.pop("STRIPE_LIVE_MODE", None)
            result = runner.run_plan(plan, approve_all=True)

        self.assertEqual(result.status, "failed")
        self.assertIn("Refusing live Stripe key", result.action_results[0]["output"]["error"])


if __name__ == "__main__":
    unittest.main()

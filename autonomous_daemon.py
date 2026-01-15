# FILE: ethinx/autonomous_daemon.py - COMPLETE FILE, COPY AND REPLACE
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional


def _iso_now() -> str:
    return datetime.now().isoformat()


async def run_autonomous_cycle(
    environment: str = "production",
    *,
    niche: str = "AI tools",
    platform: str = "tiktok",
    max_trends: int = 5,
    hooks_per_trend: int = 5,
    run_seed: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Autonomous cycle entrypoint used by the API.

    Critical change:
    - Introduce run_seed to avoid identical runs.
      If not provided, we default to current time (ISO) which guarantees variation per call.
    """
    from ethinx.core import ETHINX
    from ethinx.modules.autonomous_viral import ViralContentEngine

    etx = ETHINX()
    engine = ViralContentEngine(etx)

    seed = run_seed or _iso_now()

    # Use engine's integrated cycle (handles trend shuffle + frame shuffle + best hook per trend)
    result = await engine.run_daily_cycle(
        platform=platform,
        niche=niche,
        max_trends=max_trends,
        hooks_per_trend=hooks_per_trend,
        run_seed=seed,
    )

    # Keep your agent-structured output contract stable
    trends = result.get("trends", {}).get("trends", [])
    hooks_block = result.get("hooks", [])
    scripts_block = result.get("scripts", [])
    packaged_assets = result.get("packaged_assets", [])

    return {
        "TrendAgent": {
            "status": "completed",
            "timestamp": _iso_now(),
            "trends": trends,
            "run_seed": seed,
        },
        "HookAgent": {
            "status": "completed",
            "timestamp": _iso_now(),
            "hooks_by_trend": hooks_block,
        },
        "ScriptAgent": {
            "status": "completed",
            "timestamp": _iso_now(),
            "scripts": scripts_block,
        },
        "PackagingAgent": {
            "status": "completed",
            "timestamp": _iso_now(),
            "packaged_assets": packaged_assets,
        },
    }

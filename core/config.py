# FILE: ethinx/core/config.py

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass
class ETHINXSettings:
    """
    Minimal settings object used by:
    - /health endpoint (env, run_mode)
    - ETHINX core wiring (log_level + future expansion)

    We keep this as a simple dataclass to avoid pydantic version issues.
    """

    env: str = "dev"
    run_mode: str = "TEST"
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "ETHINXSettings":
        return cls(
            env=os.getenv("ETHINX_ENV", os.getenv("ENV", "dev")),
            run_mode=os.getenv("ETHINX_RUN_MODE", os.getenv("RUN_MODE", "TEST")),
            log_level=os.getenv("ETHINX_LOG_LEVEL", os.getenv("LOG_LEVEL", "INFO")),
        )

# FILE: ethinx/core/__init__.py

from __future__ import annotations

from typing import Any, Dict

from .config import ETHINXSettings


class ETHINX:
    """
    Core object passed into engines (like ViralContentEngine).
    It exposes `.config` which Swarm and other modules can read.
    """

    def __init__(self, settings: ETHINXSettings | None = None):
        self.settings = settings or ETHINXSettings.from_env()

        # Single source of truth for runtime configuration
        self.config: Dict[str, Any] = {
            "env": self.settings.env,
            "run_mode": self.settings.run_mode,
            "log_level": getattr(self.settings, "log_level", "INFO"),
        }


class Swarm:
    """
    Stub Swarm client used by autonomous_viral.py.
    Keeps deterministic behavior for your prompts.
    """

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or {}
        self.log_level = self.config.get("log_level", "INFO")

    async def query(self, model: str, prompt: str, temperature: float = 0.7) -> str:
        import json

        if "Create 5 viral TikTok/Reels hooks" in prompt:
            return json.dumps(
                [
                    {"hook": "This AI trick is going viral", "virality_score": 9},
                    {"hook": "Free tool they don't want you to know", "virality_score": 8},
                    {"hook": "The secret AI hack nobody shows you", "virality_score": 8},
                    {"hook": "This free AI tool is exploding", "virality_score": 7},
                    {"hook": "AI is changing everything again", "virality_score": 7},
                ]
            )

        if "Create a 60-second TikTok/Reels script" in prompt:
            return json.dumps(
                {
                    "hook": "This AI trick is going viral",
                    "script": [
                        {"time": "0-5s", "audio": "Upbeat intro", "visual": "Close-up shot", "text": "Watch this AI trick"},
                        {"time": "5-15s", "audio": "Narration", "visual": "Screen recording", "text": "Step 1: Open the tool"},
                        {"time": "15-30s", "audio": "Narration", "visual": "Demo", "text": "Step 2: Apply the trick"},
                        {"time": "30-45s", "audio": "Narration", "visual": "Results", "text": "Here’s what happens"},
                        {"time": "45-60s", "audio": "Outro", "visual": "Call to action", "text": "Try it yourself"},
                    ],
                    "sound_suggestions": ["Upbeat TikTok track"],
                    "hashtags": ["#AI", "#TechHacks", "#Viral"],
                    "caption": "This AI trick is blowing up right now. Try it.",
                    "thumbnail_prompt": "Person pointing at screen with bold text 'AI Trick'",
                }
            )

        return json.dumps({})

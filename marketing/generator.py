import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from ethinx.marketing.store import PromoAssetStore


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


@dataclass
class PromoContext:
    order_id: str
    niche: str
    package: str
    delivered_seconds: Optional[int] = None
    consent: bool = False  # only true if user approved marketing use


class PromoGenerator:
    """
    Deterministic promo generator (no external LLM required).
    Produces assets + queues platform post jobs.
    """

    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.store = PromoAssetStore(repo_root)

    def generate_and_persist(self, ctx: PromoContext) -> Dict[str, Any]:
        assets = self._generate_assets(ctx)
        paths = self.store.write_assets(ctx.order_id, assets)

        # Queue platform posts for later posting agent
        for platform in ("linkedin", "instagram", "tiktok"):
            self.store.enqueue(
                {
                    "kind": "post_planned",
                    "order_id": ctx.order_id,
                    "platform": platform,
                    "status": "pending",
                    "content_ref": paths["assets_json"],
                    "consent": bool(ctx.consent),
                }
            )

        return {"order_id": ctx.order_id, "assets": assets, "paths": paths}

    def _generate_assets(self, ctx: PromoContext) -> Dict[str, Any]:
        niche = _clean(ctx.niche or "professional")
        pkg = _clean(ctx.package or "professional")
        speed = f"{ctx.delivered_seconds // 60} min" if ctx.delivered_seconds else "fast"

        if ctx.consent:
            proof_line = "Before → After: sharper, cleaner, credible. (Shared with permission.)"
        else:
            proof_line = "Before → After: sharper, cleaner, credible. (No client images used in promos.)"

        linkedin_post = "\n".join(
            [
                "Most people don’t need a new resume.",
                "They need a profile photo that signals competence in 0.5 seconds.",
                "",
                f"I built a pipeline that turns normal photos into {niche}-ready headshots.",
                f"Delivery: {speed}. Package: {pkg}.",
                "",
                proof_line,
                "",
                "Want yours done?",
                "Comment: HEADSHOT — or DM me.",
                "",
                "#linkedin #jobsearch #personalbrand #headshot",
            ]
        )

        ig1 = "\n".join(
            [
                "HOOK: Your profile photo is your first interview.",
                "SHOT 1: blurry selfie (text: 'This is costing you replies')",
                "SHOT 2: snap transition (text: 'Fix it fast')",
                "SHOT 3: grid of pro headshots (text: 'Founder / Corporate / Creative / Healthcare')",
                "SHOT 4: CTA (text: 'DM HEADSHOT')",
                "CAPTION: Pro headshots generated + delivered fast. DM HEADSHOT.",
            ]
        )

        ig2 = "\n".join(
            [
                "HOOK: People judge you before they read a word.",
                "SHOT 1: 'Your photo = trust signal'",
                "SHOT 2: 'Old photo → low trust'",
                "SHOT 3: 'New headshot → instant credibility'",
                "SHOT 4: CTA 'DM HEADSHOT / link in bio'",
                "CAPTION: Upgrade your profile in one sitting.",
            ]
        )

        tt1 = "\n".join(
            [
                "OPEN: If you’re applying for jobs with a blurry selfie… stop.",
                "SHOW: fast slideshow of clean headshot styles (no client IDs).",
                f"SAY: We generate {niche}-ready headshots and deliver {speed}.",
                "CLOSE: DM 'HEADSHOT' and I’ll send the link.",
            ]
        )

        tt2 = "\n".join(
            [
                "OPEN: This one change gets you more replies.",
                "TEXT: 'Profile photo upgrade'",
                "SHOW: clean headshot grid",
                "CLOSE: Comment 'HEADSHOT' for the link.",
            ]
        )

        hooks = [
            "Your profile photo is your first interview.",
            "Recruiters decide in half a second.",
            "Stop losing opportunities to a blurry selfie.",
            "Credibility is visual.",
            "Your face is your landing page.",
        ]

        captions = [
            "Upgrade your profile in one sitting. DM HEADSHOT.",
            "Pro headshots, fast delivery. DM HEADSHOT.",
            "Look credible before you even speak. DM HEADSHOT.",
            "Built for LinkedIn + job hunting. DM HEADSHOT.",
            "Founder / tradie / healthcare / creative — style packs available. DM HEADSHOT.",
            "New year, new headshot. DM HEADSHOT.",
            "Your best ROI is a profile photo that converts. DM HEADSHOT.",
            "Stop blending in. DM HEADSHOT.",
            "Professional headshots without the studio. DM HEADSHOT.",
            "If you’re applying for jobs, do this first. DM HEADSHOT.",
        ]

        return {
            "version": "promo_generator_v1",
            "order_id": ctx.order_id,
            "niche": niche,
            "package": pkg,
            "delivered_seconds": ctx.delivered_seconds,
            "consent": bool(ctx.consent),
            "linkedin_post": linkedin_post,
            "ig_reels_scripts": [ig1, ig2],
            "tiktok_scripts": [tt1, tt2],
            "hooks": hooks,
            "captions": captions,
        }

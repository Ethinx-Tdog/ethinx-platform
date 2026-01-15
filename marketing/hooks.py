from pathlib import Path
from typing import Optional, Dict, Any

from ethinx.marketing.generator import PromoGenerator, PromoContext


def generate_promo_for_delivery(
    repo_root: Path,
    *,
    order_id: str,
    niche: str = "AI headshots",
    package: str = "professional",
    delivered_seconds: Optional[int] = None,
    consent: bool = False,
) -> Dict[str, Any]:
    gen = PromoGenerator(repo_root)
    ctx = PromoContext(
        order_id=order_id,
        niche=niche,
        package=package,
        delivered_seconds=delivered_seconds,
        consent=consent,
    )
    return gen.generate_and_persist(ctx)

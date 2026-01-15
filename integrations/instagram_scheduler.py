from __future__ import annotations

from typing import Any, Dict, Iterable, List


def prepare_instagram_schedule(
    packaged_assets: Iterable[Dict[str, Any]],
    *,
    account_timezone: str = "Australia/Adelaide",
    default_publish_hour_local: int = 9,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for idx, a in enumerate(list(packaged_assets), start=1):
        caption = str(a.get("caption") or a.get("hook") or "").strip()
        hashtags = a.get("hashtags", [])
        if isinstance(hashtags, list) and hashtags:
            tag_str = " ".join(str(x).strip() for x in hashtags if str(x).strip())
            if tag_str and tag_str not in caption:
                caption = f"{caption}\n\n{tag_str}".strip()

        out.append(
            {
                "item_index": idx,
                "timezone": account_timezone,
                "suggested_publish_hour_local": int(default_publish_hour_local),
                "trend": a.get("trend", ""),
                "topic": a.get("topic", ""),
                "frame": a.get("frame", ""),
                "hook": a.get("hook", ""),
                "caption": caption,
                "media_type": "reel",
                "status": "draft",
                "meta_api_ready": False,
            }
        )
    return out

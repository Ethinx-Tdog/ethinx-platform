from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, Optional


def _safe_filename(s: str) -> str:
    keep = []
    for ch in s.strip():
        if ch.isalnum() or ch in ("-", "_"):
            keep.append(ch)
        elif ch.isspace():
            keep.append("_")
    out = "".join(keep).strip("_")
    return out[:80] if out else "export"


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _exports_dir() -> Path:
    d = _project_root() / "exports"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _flatten_hashtags(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (list, tuple)):
        return " ".join(str(x).strip() for x in v if str(x).strip())
    return str(v).strip()


def _flatten_sounds(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (list, tuple)):
        return "; ".join(str(x).strip() for x in v if str(x).strip())
    return str(v).strip()


def _first_frame(v: Any) -> str:
    if not v:
        return ""
    s = str(v).strip().lower().replace("-", "_").replace(" ", "_")
    return s[:50]


def _get(d: Dict[str, Any], key: str, default: Any = "") -> Any:
    val = d.get(key, default)
    return default if val is None else val


CSV_FIELDS = [
    "run_id",
    "asset_index",
    "platform",
    "niche",
    "trend",
    "topic",
    "frame",
    "virality_score",
    "hook",
    "caption",
    "hashtags",
    "thumbnail_prompt",
    "sound_suggestions",
    "script_beats_repr",
]


def export_run_to_csv(
    run_id: str,
    packaged_assets: Iterable[Dict[str, Any]],
    *,
    platform: str = "",
    niche: str = "",
    out_path: Optional[str] = None,
) -> str:
    assets = list(packaged_assets)

    if out_path:
        path = Path(out_path)
        path.parent.mkdir(parents=True, exist_ok=True)
    else:
        filename = f"{_safe_filename(run_id)}_{_now_stamp()}.csv"
        path = _exports_dir() / filename

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()

        for idx, a in enumerate(assets, start=1):
            beats = _get(a, "script_beats", [])
            try:
                beats_repr = "" if beats is None else repr(beats)
            except Exception:
                beats_repr = ""

            row = {
                "run_id": run_id,
                "asset_index": idx,
                "platform": platform or str(_get(a, "platform", "")),
                "niche": niche or str(_get(a, "niche", "")),
                "trend": str(_get(a, "trend", "")),
                "topic": str(_get(a, "topic", "")),
                "frame": _first_frame(_get(a, "frame", "")),
                "virality_score": _get(a, "virality_score", ""),
                "hook": str(_get(a, "hook", "")),
                "caption": str(_get(a, "caption", "")),
                "hashtags": _flatten_hashtags(_get(a, "hashtags", "")),
                "thumbnail_prompt": str(_get(a, "thumbnail_prompt", "")),
                "sound_suggestions": _flatten_sounds(_get(a, "sound_suggestions", "")),
                "script_beats_repr": beats_repr,
            }
            writer.writerow(row)

    return str(path)

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _exports_dir() -> Path:
    d = _project_root() / "exports"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def export_carousels_md(
    run_id: str,
    packaged_assets: Iterable[Dict[str, Any]],
    *,
    out_path: Optional[str] = None,
) -> str:
    assets = list(packaged_assets)

    if out_path:
        path = Path(out_path)
        path.parent.mkdir(parents=True, exist_ok=True)
    else:
        path = _exports_dir() / f"{run_id}_{_now_stamp()}_carousels.md"

    lines: List[str] = []
    lines.append("# ETHINX Carousel Export")
    lines.append(f"- run_id: {run_id}")
    lines.append(f"- generated_at: {datetime.now().isoformat()}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for idx, a in enumerate(assets, start=1):
        trend = str(a.get("trend", ""))
        topic = str(a.get("topic", ""))
        frame = str(a.get("frame", ""))
        hook = str(a.get("hook", ""))
        caption = str(a.get("caption", ""))
        hashtags = a.get("hashtags", [])
        beats = a.get("script_beats", [])

        lines.append(f"## Asset {idx}: {trend}".strip())
        if topic:
            lines.append(f"- **Topic:** {topic}")
        if frame:
            lines.append(f"- **Frame:** {frame}")
        lines.append("")

        lines.append("### Slide plan (Canva)")
        lines.append(f"**Slide 1 (Hook):** {hook}".strip())
        lines.append("**Slide 2 (Pain):** What is the 1 problem this fixes?")
        lines.append("**Slide 3 (Steps):** 3 bullets showing the process.")
        lines.append("**Slide 4 (Proof):** before/after or measurable outcome.")
        lines.append("**Slide 5 (CTA):** Comment PACK / DM PACK.")
        lines.append("")

        lines.append("### Reel beats (CapCut / Voiceover)")
        if isinstance(beats, list) and beats:
            for b in beats[:10]:
                if isinstance(b, dict):
                    t = str(b.get("time", "")).strip()
                    text = str(b.get("text", "")).strip()
                    if t:
                        lines.append(f"- **{t}** {text}".strip())
                    else:
                        lines.append(f"- {text}".strip())
                else:
                    lines.append(f"- {str(b)}")
        else:
            lines.append("- 0-5s: Hook")
            lines.append("- 5-20s: Show the “before” pain")
            lines.append("- 20-45s: 2-3 step demo")
            lines.append("- 45-60s: CTA")
        lines.append("")

        lines.append("### Caption")
        lines.append(caption if caption else hook)
        lines.append("")

        lines.append("### Hashtags")
        if isinstance(hashtags, list):
            lines.append(" ".join(str(x) for x in hashtags))
        else:
            lines.append(str(hashtags))
        lines.append("")
        lines.append("---")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
    return str(path)

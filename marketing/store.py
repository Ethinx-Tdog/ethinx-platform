import json
import time
from pathlib import Path
from typing import Any, Dict


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())


class PromoAssetStore:
    """
    Filesystem store. No DB required.

    Writes:
      data/promo_assets/<order_id>/assets.json
      data/promo_assets/<order_id>/assets.md
      data/promo_queue/pending.jsonl  (append-only queue)
    """

    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.assets_root = repo_root / "data" / "promo_assets"
        self.queue_dir = repo_root / "data" / "promo_queue"
        self.queue_file = self.queue_dir / "pending.jsonl"

        self.assets_root.mkdir(parents=True, exist_ok=True)
        self.queue_dir.mkdir(parents=True, exist_ok=True)

    def write_assets(self, order_id: str, assets: Dict[str, Any]) -> Dict[str, str]:
        d = self.assets_root / order_id
        d.mkdir(parents=True, exist_ok=True)

        assets_path = d / "assets.json"
        md_path = d / "assets.md"

        assets_path.write_text(json.dumps(assets, indent=2, ensure_ascii=False), encoding="utf-8")
        md_path.write_text(self._render_md(order_id, assets), encoding="utf-8")

        return {"assets_json": str(assets_path), "assets_md": str(md_path)}

    def enqueue(self, item: Dict[str, Any]) -> None:
        item = dict(item)
        item.setdefault("ts", now_iso())
        with open(self.queue_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    def _render_md(self, order_id: str, assets: Dict[str, Any]) -> str:
        lines = []
        lines.append(f"# Promo Assets — Order {order_id}")
        lines.append("")
        lines.append("## LinkedIn Post")
        lines.append((assets.get("linkedin_post") or "").strip())
        lines.append("")
        lines.append("## IG Reels Scripts")
        for i, s in enumerate(assets.get("ig_reels_scripts", []), start=1):
            lines.append(f"### Script {i}")
            lines.append((s or "").strip())
            lines.append("")
        lines.append("## TikTok Scripts")
        for i, s in enumerate(assets.get("tiktok_scripts", []), start=1):
            lines.append(f"### Script {i}")
            lines.append((s or "").strip())
            lines.append("")
        lines.append("## Hook Variants")
        for h in assets.get("hooks", []):
            lines.append(f"- {h}")
        lines.append("")
        lines.append("## Caption Variants")
        for c in assets.get("captions", []):
            lines.append(f"- {c}")
        lines.append("")
        return "\n".join(lines)

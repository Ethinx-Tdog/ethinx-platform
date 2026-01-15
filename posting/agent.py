import json
import time
from pathlib import Path


def _now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())


class PostingAgent:
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.queue = repo_root / "data" / "promo_queue" / "pending.jsonl"
        self.outbox = repo_root / "data" / "posting_outbox"

        self.outbox.mkdir(parents=True, exist_ok=True)
        self.queue.parent.mkdir(parents=True, exist_ok=True)

    def run_once(self):
        if not self.queue.exists():
            print("no queue")
            return

        lines = self.queue.read_text(encoding="utf-8").splitlines()
        if not lines:
            print("queue empty")
            return

        remaining = []

        for line in lines:
            item = json.loads(line)
            order_id = item["order_id"]
            platform = item["platform"]
            assets_path = Path(item["content_ref"])

            assets = json.loads(assets_path.read_text(encoding="utf-8"))

            order_dir = self.outbox / order_id
            order_dir.mkdir(parents=True, exist_ok=True)

            out_file = order_dir / f"{platform}_post.md"

            if platform == "linkedin":
                content = assets.get("linkedin_post", "")
            elif platform == "instagram":
                content = assets.get("ig_reels_scripts", [""])[0]
            elif platform == "tiktok":
                content = assets.get("tiktok_scripts", [""])[0]
            else:
                content = "unsupported platform"

            out_file.write_text(content, encoding="utf-8")
            print(f"wrote {out_file}")

        # clear queue after processing
        self.queue.write_text("", encoding="utf-8")

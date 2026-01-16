from __future__ import annotations

import json
import re
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path, PurePosixPath
from typing import Any, Dict, List

import yaml

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
AMOUNT_RE = re.compile(r"^[0-9]+\.[0-9]{2}$")
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
PRIORITY = {"rush", "standard", "premium"}


def load_yaml(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def err(msg: str) -> None:
    print(msg, file=sys.stderr)


def validate_product_file(path: Path) -> List[str]:
    problems: List[str] = []
    raw = load_yaml(path)

    stem = path.stem
    pid = str(raw.get("id") or stem)

    if pid != stem:
        problems.append(f"{path}: id {pid!r} must match filename stem {stem!r}")

    if not SLUG_RE.match(pid):
        problems.append(f"{path}: invalid id slug {pid!r}")

    name = raw.get("name")
    if not isinstance(name, str) or not name.strip():
        problems.append(f"{path}: name is required")

    price = raw.get("price")
    if not isinstance(price, dict):
        problems.append(f"{path}: price must be a mapping")
        return problems

    amount = price.get("amount")
    if not isinstance(amount, str) or not AMOUNT_RE.match(amount):
        problems.append(f"{path}: price.amount must be a string like '49.00'")
    else:
        try:
            Decimal(amount)
        except InvalidOperation:
            problems.append(f"{path}: price.amount is not a valid decimal")

    currency = str(price.get("currency", "")).lower()
    if currency != "aud":
        problems.append(f"{path}: price.currency must be 'aud' (got {currency!r})")

    tagline = raw.get("tagline")
    if tagline is not None and (not isinstance(tagline, str) or not tagline.strip()):
        problems.append(f"{path}: tagline must be a non-empty string if set")

    category = raw.get("category")
    if category is not None and (not isinstance(category, str) or not category.strip()):
        problems.append(f"{path}: category must be a non-empty string if set")

    priority = raw.get("priority")
    if priority is not None:
        if not isinstance(priority, str) or priority not in PRIORITY:
            problems.append(f"{path}: priority must be one of {sorted(PRIORITY)}")

    accent = raw.get("accent_color")
    if accent is not None:
        if not isinstance(accent, str) or not HEX_RE.match(accent):
            problems.append(f"{path}: accent_color must be hex like #FF3B30")

    thumb = raw.get("thumbnail")
    if thumb is not None:
        if not isinstance(thumb, str) or not thumb.strip():
            problems.append(f"{path}: thumbnail must be a non-empty string if set")
        else:
            expected = f"assets/products/{pid}/thumbnail.png"
            if str(PurePosixPath(thumb)) != expected:
                problems.append(f"{path}: thumbnail must be {expected!r} (got {thumb!r})")

    ptype = price.get("type", "one_time")
    if ptype not in ("one_time", "recurring"):
        problems.append(f"{path}: price.type must be one_time|recurring (got {ptype!r})")

    if ptype == "recurring":
        interval = price.get("interval")
        if interval not in ("day", "week", "month", "year"):
            problems.append(f"{path}: recurring price.interval must be day|week|month|year")
        ic = price.get("interval_count", 1)
        if not isinstance(ic, int) or ic < 1:
            problems.append(f"{path}: recurring price.interval_count must be int >= 1")

    return problems


def main() -> int:
    products_dir = Path(__file__).resolve().parent / "products"
    if not products_dir.exists():
        err(f"Catalog products directory not found: {products_dir}")
        return 2

    files = sorted(products_dir.glob("*.y*ml"))
    if not files:
        err(f"No YAML files found in: {products_dir}")
        return 2

    all_problems: List[str] = []
    for f in files:
        all_problems.extend(validate_product_file(f))

    if all_problems:
        for p in all_problems:
            err(p)
        print(json.dumps({"ok": False, "errors": len(all_problems)}, indent=2))
        return 1

    print(json.dumps({"ok": True, "files": len(files)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

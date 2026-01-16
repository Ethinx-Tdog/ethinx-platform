from __future__ import annotations

import argparse
import json
import logging
import os
import re
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import stripe
import yaml

logger = logging.getLogger(__name__)

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
AMOUNT_RE = re.compile(r"^[0-9]+\.[0-9]{2}$")


@dataclass(frozen=True)
class CatalogPrice:
    amount: str
    currency: str
    type: str
    interval: Optional[str] = None
    interval_count: Optional[int] = None


@dataclass(frozen=True)
class CatalogProduct:
    id: str
    name: str
    active: bool
    description: str
    metadata: Dict[str, str]
    price: CatalogPrice
    images: Optional[List[str]] = None


def load_yaml(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def amount_to_cents(amount: str) -> int:
    return int((Decimal(amount) * 100).to_integral_value())


def ensure_stripe_key() -> None:
    api_key = os.getenv("STRIPE_API_KEY")
    if not api_key:
        raise ValueError("STRIPE_API_KEY is required")
    stripe.api_key = api_key


def load_catalog_products(products_dir: Path) -> List[CatalogProduct]:
    if not products_dir.exists():
        raise ValueError(f"Catalog products directory not found: {products_dir}")

    allowed_currency = "aud"

    products: List[CatalogProduct] = []
    for p in sorted(products_dir.glob("*.y*ml")):
        raw = load_yaml(p)

        stem = p.stem
        pid = str(raw.get("id") or stem)
        if pid != stem:
            raise ValueError(f"{p}: id must match filename stem")
        if not SLUG_RE.match(pid):
            raise ValueError(f"{p}: invalid id slug {pid!r}")

        name = raw.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"{p}: name is required")

        description = raw.get("description")
        if not isinstance(description, str):
            raise ValueError(f"{p}: description is required")

        metadata = raw.get("metadata")
        if not isinstance(metadata, dict):
            raise ValueError(f"{p}: metadata must be a mapping")

        active = bool(raw.get("active", True))

        price_raw = raw.get("price")
        if not isinstance(price_raw, dict):
            raise ValueError(f"{p}: price must be a mapping")

        amount = price_raw.get("amount")
        if not isinstance(amount, str) or not AMOUNT_RE.match(amount):
            raise ValueError(f"{p}: price.amount must be a string like '49.00'")

        price = CatalogPrice(
            amount=str(price_raw["amount"]),
            currency=str(price_raw["currency"]).lower(),
            type=str(price_raw.get("type", "one_time")),
            interval=price_raw.get("interval"),
            interval_count=price_raw.get("interval_count"),
        )

        # Adelaide ops: currency is immutable (or explicitly configured)
        if price.currency != allowed_currency:
            raise ValueError(
                f"{pid}: currency must be {allowed_currency!r} (got {price.currency!r})"
            )

        if price.type not in {"one_time", "recurring"}:
            raise ValueError(f"{p}: price.type must be one_time or recurring")
        if price.type == "recurring":
            if price.interval not in {"day", "week", "month", "year"}:
                raise ValueError(f"{p}: recurring price.interval must be day|week|month|year")
            if price.interval_count is not None and (not isinstance(price.interval_count, int) or price.interval_count < 1):
                raise ValueError(f"{p}: recurring price.interval_count must be int >= 1")

        images = raw.get("images")
        if images is not None and not isinstance(images, list):
            raise ValueError(f"{p}: images must be a list")

        products.append(
            CatalogProduct(
                id=pid,
                name=name,
                active=active,
                description=description,
                metadata={k: str(v) for k, v in metadata.items()},
                price=price,
                images=images,
            )
        )

    if not products:
        raise ValueError(f"No catalog products found in {products_dir}")

    return products


def print_sync_summary(summary: Dict[str, Any]) -> None:
    mode = "DRY RUN" if summary.get("dry_run") else "LIVE RUN"
    print("\n=== ETHINX STRIPE CATALOG SYNC SUMMARY ===")
    print(f"Mode: {mode}")
    print(
        f"Products created:   {len(summary.get('created_products', []))} "
        f"{summary.get('created_products', [])}"
    )
    print(
        f"Products updated:   {len(summary.get('updated_products', []))} "
        f"{summary.get('updated_products', [])}"
    )
    print(
        f"Prices created:     {len(summary.get('created_prices', []))} "
        f"{summary.get('created_prices', [])}"
    )
    print(
        f"Prices reused:      {len(summary.get('reused_prices', []))} "
        f"{summary.get('reused_prices', [])}"
    )
    print(f"Prices deactivated: {summary.get('deactivated_prices_total', 0)}")
    print("==========================================\n")


def find_product_by_catalog_id(catalog_id: str) -> Optional[stripe.Product]:
    try:
        results = stripe.Product.search(query=f"metadata['catalog_id']:'{catalog_id}'", limit=1)
        if results.data:
            return results.data[0]
    except Exception as exc:
        logger.warning("Stripe product search failed: %s", exc)

    for product in stripe.Product.list(limit=100).auto_paging_iter():
        if product.metadata.get("catalog_id") == catalog_id:
            return product
    return None


def upsert_product(product: CatalogProduct, dry_run: bool) -> Tuple[str, str]:
    existing = find_product_by_catalog_id(product.id)
    metadata = {**product.metadata, "catalog_id": product.id}

    payload = {
        "name": product.name,
        "description": product.description,
        "active": product.active,
        "metadata": metadata,
    }
    if product.images:
        payload["images"] = product.images

    if existing is None:
        if dry_run:
            return "dry_run_product", "created"
        created = stripe.Product.create(**payload)
        return created.id, "created"

    updates: Dict[str, Any] = {}
    if existing.name != payload["name"]:
        updates["name"] = payload["name"]
    if (existing.description or "") != payload["description"]:
        updates["description"] = payload["description"]
    if bool(existing.active) != payload["active"]:
        updates["active"] = payload["active"]
    if dict(existing.metadata) != payload["metadata"]:
        updates["metadata"] = payload["metadata"]
    if payload.get("images") is not None and existing.images != payload.get("images"):
        updates["images"] = payload["images"]

    if not updates:
        return existing.id, "unchanged"

    if dry_run:
        return existing.id, "updated"

    updated = stripe.Product.modify(existing.id, **updates)
    return updated.id, "updated"


def find_matching_price(product_id: str, price: CatalogPrice) -> Optional[stripe.Price]:
    for sp in stripe.Price.list(product=product_id, active=True, limit=100).auto_paging_iter():
        if sp.currency != price.currency:
            continue
        if sp.unit_amount != amount_to_cents(price.amount):
            continue
        if price.type == "recurring":
            recurring = sp.recurring or {}
            if recurring.get("interval") != price.interval:
                continue
            if recurring.get("interval_count", 1) != (price.interval_count or 1):
                continue
        else:
            if sp.recurring is not None:
                continue
        return sp
    return None


def create_price(product_id: str, price: CatalogPrice, dry_run: bool) -> Optional[stripe.Price]:
    if dry_run:
        return None

    payload: Dict[str, Any] = {
        "product": product_id,
        "currency": price.currency,
        "unit_amount": amount_to_cents(price.amount),
    }
    if price.type == "recurring":
        payload["recurring"] = {
            "interval": price.interval,
            "interval_count": price.interval_count or 1,
        }

    return stripe.Price.create(**payload)


def deactivate_stale_prices(
    product_id: str,
    keep_ids: List[str],
    dry_run: bool,
) -> List[str]:
    deactivated: List[str] = []
    keep_set = set(keep_ids)
    for sp in stripe.Price.list(product=product_id, active=True, limit=100).auto_paging_iter():
        if sp.id in keep_set:
            continue
        if dry_run:
            deactivated.append(sp.id)
            continue
        stripe.Price.modify(sp.id, active=False)
        deactivated.append(sp.id)
    return deactivated


def sync_catalog(products_dir: Path, dry_run: bool, deactivate_stale: bool) -> Dict[str, Any]:
    ensure_stripe_key()
    products = load_catalog_products(products_dir)

    summary = {
        "catalog_currency": "aud",
        "currency_enforced": True,
        "created_products": [],
        "updated_products": [],
        "created_prices": [],
        "reused_prices": [],
        "deactivated_prices_total": 0,
        "products_total": len(products),
        "products_created": 0,
        "products_updated": 0,
        "prices_created": 0,
        "prices_deactivated": 0,
        "prices_active": 0,
        "dry_run": dry_run,
        "items": [],
    }

    for cp in products:
        item_log: Dict[str, Any] = {"id": cp.id, "name": cp.name}
        item_log["currency"] = cp.price.currency
        item_log["amount"] = cp.price.amount
        try:
            product_id, action = upsert_product(cp, dry_run=dry_run)
            if action == "created":
                summary["products_created"] += 1
                summary["created_products"].append(cp.id)
                item_log["product"] = {"id": product_id, "action": "created"}
            elif action == "updated":
                summary["products_updated"] += 1
                summary["updated_products"].append(cp.id)
                item_log["product"] = {"id": product_id, "action": "updated"}
            else:
                item_log["product"] = {"id": product_id, "action": "unchanged"}

            price = find_matching_price(product_id, cp.price)
            if price is None:
                created_price = create_price(product_id, cp.price, dry_run=dry_run)
                if created_price is not None:
                    price_id = created_price.id
                else:
                    price_id = "dry_run_price"
                summary["prices_created"] += 1
                summary["created_prices"].append(cp.id)
                item_log["price"] = {"id": price_id, "action": "created"}
            else:
                item_log["price"] = {"id": price.id, "action": "existing"}
                summary["prices_active"] += 1
                summary["reused_prices"].append(cp.id)

            if deactivate_stale:
                keep_ids = [item_log["price"]["id"]]
                deactivated = deactivate_stale_prices(
                    product_id,
                    keep_ids,
                    dry_run=dry_run,
                )
                summary["prices_deactivated"] += len(deactivated)
                summary["deactivated_prices_total"] += len(deactivated)
                item_log["stale_prices_deactivated"] = len(deactivated)
        except Exception as exc:
            item_log["error"] = str(exc)

        summary["items"].append(item_log)

    return summary


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync ETHINX catalog to Stripe")
    parser.add_argument(
        "--products-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "catalog" / "products",
        help="Path to catalog/products directory",
    )
    parser.add_argument("--dry-run", action="store_true", help="Validate without Stripe writes")
    parser.add_argument(
        "--deactivate-stale",
        action="store_true",
        help="Deactivate stale Stripe prices that are not in the catalog",
    )
    parser.add_argument(
        "--no-deactivate-stale",
        action="store_true",
        help="Do not deactivate stale managed prices on the Stripe product",
    )
    parser.add_argument("--log-json", action="store_true", help="Emit summary JSON only")
    parser.add_argument(
        "--human-summary",
        action="store_true",
        help="Print a deterministic human summary block",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    args = parse_args(argv)

    try:
        deactivate_stale = args.deactivate_stale and not args.no_deactivate_stale
        summary = sync_catalog(args.products_dir, args.dry_run, deactivate_stale)
    except Exception as exc:
        logger.error("Catalog sync failed: %s", exc)
        return 1

    if args.log_json:
        print(json.dumps(summary, separators=(",", ":"), ensure_ascii=False))
    else:
        print(json.dumps(summary, indent=2, ensure_ascii=False))
    if args.human_summary:
        print_sync_summary(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

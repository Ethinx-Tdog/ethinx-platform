# ETHINX Catalog (Source of Truth)

This directory is the authoritative product catalog for syncing to Stripe.
AUD is immutable.

## Immutable rules (Adelaide ops)

1. **Currency is immutable and MUST be `aud`**
2. `id` must be kebab-case and must match the filename stem
3. `price.amount` must be a string with 2 decimal places (e.g. `"49.00"`)

## Product file schema

Path:

`catalog/products/<id>.yaml`

Required keys:

```yaml
id: starter-package
name: Starter Package
active: true
description: "..."
metadata:
  ethinx_catalog: "true"
price:
  amount: "49.00"
  currency: "aud"
  type: "one_time"   # or "recurring"
```

Optional keys:

```yaml
images:
  - "https://..."
thumbnail: "assets/products/starter-package/thumbnail.png"
accent_color: "#30D158"
tagline: "Launch with clarity and consistent messaging."
category: "package"
priority: "standard" # rush | standard | premium
```

Optional UI keys (dashboard only; not sent to Stripe unless explicitly mapped):

```yaml
tagline: "Fast output when you're out of time."
category: "delivery"              # e.g. delivery|bio|creative|industry|package
priority: "rush"                  # rush|standard|premium
accent_color: "#FF3B30"           # hex
thumbnail: "assets/products/<id>/thumbnail.png"
```

Thumbnail folder structure (already aligned)
assets/products/<id>/thumbnail.png
assets/products/<id>/thumbnail@2x.png

## Validation

Run:

```bash
python catalog/validate_catalog.py
```

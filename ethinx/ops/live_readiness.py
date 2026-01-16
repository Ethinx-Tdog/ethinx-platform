from __future__ import annotations

import argparse
import base64
import json
import os
import platform
import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional


@dataclass
class CheckResult:
    name: str
    ok: bool
    details: Dict[str, Any]


def _http_get_json(url: str, headers: Optional[Dict[str, str]] = None, timeout: int = 10) -> tuple[int, Any, Dict[str, str]]:
    req = urllib.request.Request(url, method="GET")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            raw = resp.read()
            text = raw.decode("utf-8", errors="replace")
            ct = resp.headers.get("content-type", "")
            if "application/json" in ct:
                try:
                    return status, json.loads(text), dict(resp.headers.items())
                except Exception:
                    return status, text[:2000], dict(resp.headers.items())
            else:
                # Try json anyway
                try:
                    return status, json.loads(text), dict(resp.headers.items())
                except Exception:
                    return status, text[:2000], dict(resp.headers.items())
    except urllib.error.HTTPError as e:
        raw = e.read()
        text = raw.decode("utf-8", errors="replace")
        try:
            body: Any = json.loads(text)
        except Exception:
            body = text[:2000]
        return e.code, body, dict(e.headers.items()) if e.headers else {}
    except Exception as e:
        raise RuntimeError(str(e))


def check_http_health(base_url: str) -> CheckResult:
    url = base_url.rstrip("/") + "/health"
    t0 = time.time()
    try:
        status, body, _hdrs = _http_get_json(url, timeout=10)
        dt = time.time() - t0
        ok = status == 200
        return CheckResult(
            name="http_health",
            ok=ok,
            details={"url": url, "status_code": status, "latency_s": round(dt, 3), "body": body},
        )
    except Exception as e:
        return CheckResult(name="http_health", ok=False, details={"url": url, "error": str(e)})


def check_stripe_key_live(stripe_secret_key: str) -> CheckResult:
    # No charges. Just verifies credentials + livemode via Stripe /v1/account.
    try:
        basic = base64.b64encode(f"{stripe_secret_key}:".encode("utf-8")).decode("ascii")
        headers = {"Authorization": f"Basic {basic}"}
        status, body, _hdrs = _http_get_json("https://api.stripe.com/v1/account", headers=headers, timeout=10)

        details: Dict[str, Any] = {"status_code": status, "body": body}
        if status != 200 or not isinstance(body, dict):
            return CheckResult(name="stripe_key_valid_live", ok=False, details=details)

        livemode = body.get("livemode")
        details = {
            "status_code": status,
            "id": body.get("id"),
            "country": body.get("country"),
            "charges_enabled": body.get("charges_enabled"),
            "payouts_enabled": body.get("payouts_enabled"),
            "livemode": livemode,
        }
        ok = livemode is True
        return CheckResult(name="stripe_key_valid_live", ok=ok, details=details)
    except Exception as e:
        return CheckResult(name="stripe_key_valid_live", ok=False, details={"error": str(e)})


def _which(cmd: str) -> Optional[str]:
    return shutil.which(cmd)


def _run(cmd: List[str], timeout: int = 10) -> Dict[str, Any]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        return {
            "cmd": cmd,
            "returncode": p.returncode,
            "stdout": (p.stdout or "")[-4000:],
            "stderr": (p.stderr or "")[-4000:],
        }
    except Exception as e:
        return {"cmd": cmd, "error": str(e)}


def check_host_basics() -> CheckResult:
    details: Dict[str, Any] = {"platform": platform.platform(), "python": sys.version.split()[0]}
    # Best-effort: only run if commands exist (Windows may not have these).
    for name, cmd in [
        ("df_h", ["df", "-h"]),
        ("free_m", ["free", "-m"]),
        ("docker_ps", ["docker", "ps"]),
        ("docker_system_df", ["docker", "system", "df"]),
    ]:
        if _which(cmd[0]):
            details[name] = _run(cmd, timeout=12)
        else:
            details[name] = {"skipped": True, "reason": f"{cmd[0]} not found"}

    # Host checks are informational unless explicitly requested; treat as OK if skipped.
    ok = True
    for k, v in details.items():
        if isinstance(v, dict) and v.get("returncode") not in (None, 0) and not v.get("skipped"):
            ok = False
    return CheckResult(name="host_basics", ok=ok, details=details)


def require_real_payment_gate(require_real_payment: bool) -> CheckResult:
    if not require_real_payment:
        return CheckResult(
            name="real_payment_gate",
            ok=True,
            details={"required": False, "note": "Skipped. Use --require-real-payment to enforce."},
        )
    token = os.environ.get("ETHINX_LIVE_PAYMENT_CONFIRMED", "")
    ok = token == "YES"
    return CheckResult(
        name="real_payment_gate",
        ok=ok,
        details={
            "required": True,
            "instruction": "Do a smallest-price LIVE checkout manually, then rerun with ETHINX_LIVE_PAYMENT_CONFIRMED=YES.",
            "confirmed": ok,
        },
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--stripe-secret-key", required=True)
    ap.add_argument("--check-host", action="store_true")
    ap.add_argument("--require-real-payment", action="store_true")
    ap.add_argument("--json-out", required=True)
    args = ap.parse_args()

    if not args.stripe_secret_key.startswith("sk_live_"):
        print("ERROR: STRIPE secret key must be LIVE (sk_live_...).", file=sys.stderr)
        return 2

    results: List[CheckResult] = []
    results.append(check_http_health(args.base_url))
    results.append(check_stripe_key_live(args.stripe_secret_key))
    if args.check_host:
        results.append(check_host_basics())
    results.append(require_real_payment_gate(args.require_real_payment))

    ok_all = all(r.ok for r in results)

    report = {
        "ok": ok_all,
        "base_url": args.base_url,
        "ts_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "results": [asdict(r) for r in results],
    }

    os.makedirs(os.path.dirname(args.json_out), exist_ok=True)
    with open(args.json_out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, sort_keys=True)

    for r in results:
        status = "PASS" if r.ok else "FAIL"
        print(f"[{status}] {r.name}")
        if not r.ok:
            print("  details:", json.dumps(r.details, ensure_ascii=False)[:1500])

    return 0 if ok_all else 1


if __name__ == "__main__":
    raise SystemExit(main())

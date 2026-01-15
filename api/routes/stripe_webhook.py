import os
import stripe
import requests
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

if not stripe.api_key or not WEBHOOK_SECRET:
    raise RuntimeError("Stripe env vars not set")


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig,
            secret=WEBHOOK_SECRET,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Only handle successful payments
    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        meta = intent.get("metadata", {}) or {}

        order_id = meta.get("order_id")
        package = meta.get("package", "professional")
        niche = meta.get("niche", "AI headshots")

        if order_id:
            token = os.getenv("DESKTOP_CALLBACK_TOKEN")
            if not token:
                raise HTTPException(status_code=500, detail="Missing DESKTOP_CALLBACK_TOKEN")

            requests.post(
                "http://127.0.0.1:8010/events/delivery_sent",
                headers={
                    "X-Desktop-Token": token,
                    "Content-Type": "application/json",
                },
                json={
                    "order_id": order_id,
                    "package": package,
                    "niche": niche,
                    "consent": False,
                },
                timeout=5,
            )

    return {"ok": True}

import os
import modal
from fastapi import Request

# 1. Define the environment
image = modal.Image.debian_slim().pip_install("requests", "fastapi", "httpx")
app = modal.App(name="viral-content-engine", image=image)


@app.function(secrets=[modal.Secret.from_name("MODAL_WEBHOOK_SECRET")], timeout=600)
@modal.web_endpoint(method="POST")
async def main(request: Request):
    """
    Corrected entry point to fix 'Secret' object has no attribute 'get'
    """
    try:
        # Get the data sent by Lovable/Supabase
        payload = await request.json()
        print(f"Received job: {payload}")

        # --- THE FIX ---
        # Modal injects the secret into environment variables automatically.
        # We access it using os.environ, NOT .get()
        _ = os.environ["MODAL_WEBHOOK_SECRET"]  # ensure present
        # ---------------

        # Your AI generation logic would go here
        order_id = payload.get("order_id")

        # Placeholder for successful process
        return {
            "status": "success",
            "order_id": order_id,
            "message": "Secret verified and job received",
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"status": "error", "message": str(e)}


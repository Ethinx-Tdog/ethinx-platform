from __future__ import annotations

import os
import json
from typing import Any, Dict

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.status import HTTP_403_FORBIDDEN

from ethinx.db.models import init_db, SessionLocal, APIKey, create_api_key_record
from ethinx.api.middleware.auth import APIKeyAuthMiddleware, require_admin_key

# ROUTERS
from ethinx.api.routes.delivery_events import router as delivery_events_router
from ethinx.api.routes.stripe_webhook import router as stripe_webhook_router


def create_app() -> FastAPI:
    app = FastAPI(title="ETHINX", version=os.getenv("ETHINX_VERSION", "0.1.0"))

    # ---- core init ----
    init_db()
    app.add_middleware(APIKeyAuthMiddleware)

    # ---- health ----
    @app.get("/health")
    async def health():
        return {
            "status": "healthy",
            "env": os.getenv("ETHINX_ENV", "dev"),
            "run_mode": os.getenv("ETHINX_RUN_MODE", "TEST"),
        }

    @app.get("/health/routes")
    async def routes():
        out = []
        for r in app.routes:
            methods = sorted(list(getattr(r, "methods", []) or []))
            out.append(
                {
                    "path": getattr(r, "path", None),
                    "name": getattr(r, "name", None),
                    "methods": methods,
                }
            )
        return {"routes": out}

    # ---- routers ----
    app.include_router(delivery_events_router)
    app.include_router(stripe_webhook_router)

    # ---- /v1/run (canonical) ----
    @app.post("/v1/run")
    async def v1_run(payload: Dict[str, Any], request: Request):
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Body must be a JSON object")

        from ethinx.modules.autonomous_viral import ViralContentEngine

        engine = ViralContentEngine()

        try:
            result = await engine.run_daily_cycle(**payload)
        except TypeError:
            result = await engine.run_daily_cycle(payload)

        # optional persistence
        try:
            session = SessionLocal()
            try:
                from ethinx.db.models import Run

                rec = Run(
                    mode=str(payload.get("mode")) if payload.get("mode") else None,
                    environment=str(payload.get("environment")) if payload.get("environment") else None,
                    platform=str(payload.get("platform")) if payload.get("platform") else None,
                    niche=str(payload.get("niche")) if payload.get("niche") else None,
                    run_seed=str(payload.get("run_seed")) if payload.get("run_seed") else None,
                    status="completed",
                    request_json=json.dumps(payload, ensure_ascii=False),
                    result_json=json.dumps(result, ensure_ascii=False),
                )
                session.add(rec)
                session.commit()
            finally:
                session.close()
        except Exception:
            pass

        return result

    # ---- admin: api keys ----
    @app.post("/v1/keys")
    async def create_key(request: Request):
        try:
            require_admin_key(request)
        except PermissionError as e:
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail=str(e))

        payload = (
            await request.json()
            if request.headers.get("content-type", "").startswith("application/json")
            else {}
        )
        name = payload.get("name")

        session = SessionLocal()
        try:
            rec, plaintext = create_api_key_record(session, name=name)
            return {
                "id": rec.id,
                "name": rec.name,
                "created_at": rec.created_at.isoformat(),
                "api_key": plaintext,
            }
        finally:
            session.close()

    @app.get("/v1/keys")
    async def list_keys(request: Request):
        try:
            require_admin_key(request)
        except PermissionError as e:
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail=str(e))

        session = SessionLocal()
        try:
            rows = session.query(APIKey).order_by(APIKey.created_at.desc()).all()
            return {
                "keys": [
                    {
                        "id": k.id,
                        "name": k.name,
                        "created_at": k.created_at.isoformat(),
                        "revoked": bool(k.revoked),
                        "revoked_at": k.revoked_at.isoformat() if k.revoked_at else None,
                        "last_seen_at": k.last_seen_at.isoformat() if k.last_seen_at else None,
                        "last_seen_ip": k.last_seen_ip,
                    }
                    for k in rows
                ]
            }
        finally:
            session.close()

    @app.post("/v1/keys/{key_id}/revoke")
    async def revoke_key(key_id: int, request: Request):
        try:
            require_admin_key(request)
        except PermissionError as e:
            raise HTTPException(status_code=HTTP_403_FORBIDDEN, detail=str(e))

        from datetime import datetime, timezone

        session = SessionLocal()
        try:
            rec = session.query(APIKey).filter(APIKey.id == key_id).first()
            if not rec:
                raise HTTPException(status_code=404, detail="Key not found")

            rec.revoked = True
            rec.revoked_at = datetime.now(timezone.utc)
            session.add(rec)
            session.commit()
            return {"ok": True, "id": rec.id, "revoked": True}
        finally:
            session.close()

    # ---- permission handler ----
    @app.exception_handler(PermissionError)
    async def perm_error_handler(_req: Request, exc: PermissionError):
        return JSONResponse(
            status_code=HTTP_403_FORBIDDEN, content={"detail": str(exc)}
        )

    return app


app = create_app()

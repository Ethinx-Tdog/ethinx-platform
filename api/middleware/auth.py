from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import JSONResponse, Response
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN

from ethinx.db.models import SessionLocal, APIKey, hash_api_key


@dataclass(frozen=True)
class AuthConfig:
    header_name: str = "X-API-Key"
    exempt_paths: tuple[str, ...] = (
        "/health",
        "/health/routes",
        "/docs",
        "/openapi.json",
        "/redoc",
    )


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """AUTH ONLY. No rate limiting. Must not crash."""

    def __init__(self, app, config: Optional[AuthConfig] = None) -> None:
        super().__init__(app)
        self.cfg = config or AuthConfig()

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        if any(path == p or path.startswith(p + "/") for p in self.cfg.exempt_paths):
            return await call_next(request)

        api_key = request.headers.get(self.cfg.header_name)
        if not api_key:
            return JSONResponse(
                status_code=HTTP_401_UNAUTHORIZED,
                content={"detail": f"Missing {self.cfg.header_name} header"},
            )

        session = SessionLocal()
        try:
            key_rec = self._lookup_key(session, api_key)
            if not key_rec:
                return JSONResponse(status_code=HTTP_401_UNAUTHORIZED, content={"detail": "Invalid API key"})
            if key_rec.revoked:
                return JSONResponse(status_code=HTTP_403_FORBIDDEN, content={"detail": "API key revoked"})

            request.state.api_key_id = key_rec.id
            return await call_next(request)
        finally:
            session.close()

    def _lookup_key(self, session, plaintext: str) -> Optional[APIKey]:
        keys = session.query(APIKey).all()
        for k in keys:
            if not k.revoked and hash_api_key(plaintext, k.salt) == k.key_hash:
                return k
        return None


def require_admin_key(request: Request) -> None:
    admin_key = os.getenv("ETHINX_ADMIN_KEY")
    if not admin_key:
        raise PermissionError("Admin key not configured (ETHINX_ADMIN_KEY)")
    provided = request.headers.get("X-Admin-Key")
    if not provided or provided != admin_key:
        raise PermissionError("Invalid admin key")

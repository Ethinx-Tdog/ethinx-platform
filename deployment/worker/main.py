from __future__ import annotations

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from redis import asyncio as redis

logger = logging.getLogger("ethinx-worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
WORKER_API_KEY = os.getenv("WORKER_API_KEY")
REDIS_STARTUP_TIMEOUT_S = int(os.getenv("REDIS_STARTUP_TIMEOUT_S", "30"))
REDIS_STARTUP_INTERVAL_S = float(os.getenv("REDIS_STARTUP_INTERVAL_S", "0.5"))

redis_pool: Optional[redis.Redis] = None
_processor_task: Optional[asyncio.Task] = None


class JobPayload(BaseModel):
    order_id: str
    payload: dict[str, Any]


async def wait_for_redis(
    client: "redis.Redis", timeout_s: int, interval_s: float
) -> None:
    """Block startup until Redis is reachable or fail startup cleanly."""
    logger.info(
        "Checking Redis availability at %s (timeout=%ss)...", REDIS_URL, timeout_s
    )
    deadline = asyncio.get_event_loop().time() + float(timeout_s)
    last_err: Optional[Exception] = None

    while asyncio.get_event_loop().time() < deadline:
        try:
            await client.ping()
            logger.info("Redis reachable.")
            return
        except Exception as exc:
            last_err = exc
            await asyncio.sleep(interval_s)

    raise RuntimeError(
        "Redis not reachable at %s after %ss: %s" % (REDIS_URL, timeout_s, last_err)
    )


async def job_processor() -> None:
    if redis_pool is None:
        raise RuntimeError("Redis pool not initialized")

    logger.info("Starting job processor")
    while True:
        try:
            result = await redis_pool.brpop("ethinx:jobs", timeout=5)
            if result is None:
                continue

            _, payload = result
            job = json.loads(payload)
            logger.info("Processing job %s", job.get("order_id"))
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Processor error: %s", exc)
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global redis_pool, _processor_task

    logger.info("Starting worker service...")
    redis_pool = redis.from_url(REDIS_URL, decode_responses=True)

    await wait_for_redis(redis_pool, REDIS_STARTUP_TIMEOUT_S, REDIS_STARTUP_INTERVAL_S)

    _processor_task = asyncio.create_task(job_processor())

    yield

    logger.info("Shutting down worker service...")
    if _processor_task and not _processor_task.done():
        _processor_task.cancel()
        try:
            await _processor_task
        except asyncio.CancelledError:
            pass

    if redis_pool is not None:
        await redis_pool.close()


app = FastAPI(title="ETHINX Worker", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/jobs/enqueue")
async def enqueue_job(
    payload: JobPayload, x_api_key: Optional[str] = Header(default=None)
) -> dict[str, str]:
    if WORKER_API_KEY and x_api_key != WORKER_API_KEY:
        logger.warning("Invalid API key for order %s", payload.order_id)
        raise HTTPException(status_code=401, detail="Invalid API key")

    if redis_pool is None:
        raise HTTPException(status_code=503, detail="Redis not ready")

    await redis_pool.lpush("ethinx:jobs", payload.json())
    return {"status": "queued", "order_id": payload.order_id}

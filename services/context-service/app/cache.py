"""Redis cache helpers for context signals (Req 1.3, 1.5)."""
import json
import redis.asyncio as aioredis
from datetime import datetime, timezone
from gcw_utils import get_logger
from .config import settings

logger = get_logger("context-service:cache")
_redis: aioredis.Redis | None = None


def _default(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def cache_get(key: str) -> dict | None:
    r = await get_redis()
    raw = await r.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


async def cache_set(key: str, value: dict, ttl: int) -> None:
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value, default=_default))


async def cache_delete(key: str) -> None:
    r = await get_redis()
    await r.delete(key)

from fastapi import APIRouter
from datetime import datetime, timezone
from ..providers import weather, events, payone

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health() -> dict:
    """Health check with per-source status."""
    results = {}
    for name, check in [
        ("weather", weather.health_check),
        ("events", events.health_check),
        ("payone", payone.health_check),
    ]:
        try:
            await check()
            results[name] = "ok"
        except Exception:
            results[name] = "degraded"

    all_ok = all(v == "ok" for v in results.values())
    return {
        "status": "ok" if all_ok else "degraded",
        "service": "context-service",
        "sources": results,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

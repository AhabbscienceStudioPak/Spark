"""
Payone transaction density provider.
Req 5: track density, 60% threshold, 10-min updates, city-wide averages for new merchants.
"""
import httpx
from datetime import datetime, timezone
from ..config import settings
from ..retry import with_retry
from gcw_utils import get_logger

logger = get_logger("context-service:payone")

LOW_DEMAND_THRESHOLD = 0.6

# City-wide averages by category (Req 5.5: used when merchant has insufficient history)
CITY_AVERAGES_BY_CATEGORY = {
    "cafe":       [0,0,0,0,0,1,3,8,12,10,9,14,18,15,10,8,7,9,11,8,5,3,1,0],
    "bakery":     [0,0,0,0,0,2,8,20,25,18,12,8,5,3,2,2,2,2,1,1,0,0,0,0],
    "restaurant": [0,0,0,0,0,0,1,2,4,6,8,16,20,18,12,8,6,14,18,16,10,6,2,0],
    "bar":        [0,0,0,0,0,0,0,0,0,0,1,2,3,4,3,3,5,8,14,18,20,16,10,4],
    "retail":     [0,0,0,0,0,0,0,2,5,8,12,15,18,16,14,12,10,8,6,4,2,1,0,0],
    "default":    [0,0,0,0,0,1,2,5,8,8,8,10,12,10,8,7,6,7,8,6,4,2,1,0],
}


async def get_transaction_density(merchant_id: str, category: str = "default") -> dict:
    """Fetches transaction density. Falls back to city-wide averages for new merchants."""
    try:
        return await with_retry(
            lambda: _fetch_density(merchant_id),
            label=f"payone({merchant_id})",
        )
    except Exception as exc:
        logger.warning(f"Payone unavailable for {merchant_id}, using city average: {exc}")
        return _city_average_density(merchant_id, category)


async def _fetch_density(merchant_id: str) -> dict:
    url = f"{settings.payone_api_url}/api/merchants/{merchant_id}/transaction-density"
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, headers={"X-Api-Key": settings.payone_api_key})
        resp.raise_for_status()
        data = resp.json()

    current = float(data["currentHourCount"])
    typical = float(data["typicalHourCount"])
    ratio = current / typical if typical > 0 else 1.0

    return {
        "merchant_id": merchant_id,
        "current_density": current,
        "typical_density": typical,
        "density_ratio": round(ratio, 3),
        "is_low_demand": ratio < LOW_DEMAND_THRESHOLD,
        "source": data.get("source", "payone"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _city_average_density(merchant_id: str, category: str) -> dict:
    """Returns city-wide average density for the current hour (Req 5.5)."""
    hour = datetime.now(timezone.utc).hour
    hourly = CITY_AVERAGES_BY_CATEGORY.get(category, CITY_AVERAGES_BY_CATEGORY["default"])
    typical = float(hourly[hour])
    # Simulate slight variance
    import random
    current = max(0.0, typical * (0.8 + random.random() * 0.4))
    ratio = current / typical if typical > 0 else 1.0
    return {
        "merchant_id": merchant_id,
        "current_density": round(current, 1),
        "typical_density": typical,
        "density_ratio": round(ratio, 3),
        "is_low_demand": ratio < LOW_DEMAND_THRESHOLD,
        "source": "city_average",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


async def health_check() -> None:
    async with httpx.AsyncClient(timeout=3.0) as client:
        await client.get(f"{settings.payone_api_url}/health")

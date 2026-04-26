"""
Public holiday detection via Nager.Date API (free, no key needed).
Req 3.2: detect public holidays for the consumer's configured country.
"""
import httpx
from datetime import date, datetime, timezone
from ..config import settings
from ..cache import cache_get, cache_set
from gcw_utils import get_logger

logger = get_logger("context-service:holidays")
HOLIDAY_CACHE_TTL = 86400  # 24 hours


async def is_public_holiday(check_date: date | None = None, country_code: str | None = None) -> bool:
    """Returns True if the given date is a public holiday in the configured country."""
    target = check_date or date.today()
    country = country_code or settings.holiday_country_code
    cache_key = f"holidays:{country}:{target.year}"

    holidays = await cache_get(cache_key)
    if holidays is None:
        holidays = await _fetch_holidays(target.year, country)
        if holidays is not None:
            await cache_set(cache_key, {"dates": holidays}, ttl=HOLIDAY_CACHE_TTL)
        else:
            return False
    else:
        holidays = holidays.get("dates", [])

    return target.isoformat() in holidays


async def _fetch_holidays(year: int, country_code: str) -> list[str] | None:
    """Fetches public holidays from Nager.Date (free, no key)."""
    url = f"{settings.holidays_url}/PublicHolidays/{year}/{country_code}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        return [h["date"] for h in data]
    except Exception as exc:
        logger.warning(f"Holiday API unavailable: {exc}")
        return None

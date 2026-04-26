"""
Weather provider — Open-Meteo (free, no API key) with Redis cache and retry.
Req 1: weather within 3s, 30-min cache, exponential backoff, temperature invariant.
"""
import httpx
from datetime import datetime, timezone
from ..config import settings
from ..cache import cache_get, cache_set
from ..retry import with_retry
from gcw_utils import get_logger, is_valid_temperature

logger = get_logger("context-service:weather")

# WMO weather code → internal condition
WMO_CONDITION_MAP = {
    0: "clear", 1: "clear", 2: "clouds", 3: "clouds",
    45: "fog", 48: "fog",
    51: "rain", 53: "rain", 55: "rain",
    61: "rain", 63: "rain", 65: "rain",
    71: "snow", 73: "snow", 75: "snow", 77: "snow",
    80: "rain", 81: "rain", 82: "rain",
    85: "snow", 86: "snow",
    95: "storm", 96: "storm", 99: "storm",
}
PRECIPITATION_CODES = {51,53,55,61,63,65,71,73,75,77,80,81,82,85,86,95,96,99}


async def fetch_weather(lat: float, lng: float) -> dict:
    """
    Fetches weather from Open-Meteo (free, no key required).
    Falls back to Redis cache if fresh data is unavailable (Req 1.3).
    """
    cache_key = f"weather:{lat:.3f}:{lng:.3f}"

    async def _fetch() -> dict:
        if settings.weather_source == "openweathermap":
            return await _fetch_owm(lat, lng)
        elif settings.weather_source == "dwd":
            return await _fetch_dwd(lat, lng)
        else:
            return await _fetch_open_meteo(lat, lng)

    try:
        result = await with_retry(_fetch, label=f"weather({lat:.3f},{lng:.3f})")
        await cache_set(cache_key, result, ttl=settings.weather_cache_ttl)
        return result
    except Exception as exc:
        # Req 1.3: use cached data if less than 30 minutes old
        cached = await cache_get(cache_key)
        if cached:
            logger.warning(f"Weather API failed, using cache: {exc}")
            return cached
        # Req 1.4: log and continue with defaults
        logger.error(f"Weather unavailable and cache stale: {exc}")
        raise


async def _fetch_open_meteo(lat: float, lng: float) -> dict:
    """Open-Meteo: completely free, no API key needed."""
    url = f"{settings.open_meteo_url}/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code",
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    current = data["current"]
    temp = float(current["temperature_2m"])
    wmo_code = int(current.get("weather_code", 0))

    if not is_valid_temperature(temp):
        logger.warning(f"Out-of-range temperature: {temp}")
    temp = max(-50.0, min(60.0, temp))  # enforce invariant

    return {
        "temperature": temp,
        "condition": WMO_CONDITION_MAP.get(wmo_code, "clear"),
        "precipitation": wmo_code in PRECIPITATION_CODES or float(current.get("precipitation", 0)) > 0,
        "humidity": float(current.get("relative_humidity_2m", 50)),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def _fetch_owm(lat: float, lng: float) -> dict:
    """OpenWeatherMap fallback (requires API key)."""
    url = f"{settings.owm_api_url}/weather"
    params = {"lat": lat, "lon": lng, "appid": settings.weather_api_key, "units": "metric"}
    OWM_MAP = {"Clear":"clear","Rain":"rain","Drizzle":"rain","Snow":"snow",
               "Clouds":"clouds","Fog":"fog","Mist":"fog","Thunderstorm":"storm"}
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    temp = max(-50.0, min(60.0, float(data["main"]["temp"])))
    return {
        "temperature": temp,
        "condition": OWM_MAP.get(data["weather"][0].get("main","Clear"), "clear"),
        "precipitation": bool(data.get("rain") or data.get("snow")),
        "humidity": float(data["main"]["humidity"]),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def _fetch_dwd(lat: float, lng: float) -> dict:
    """DWD via BrightSky (free, no key needed for German locations)."""
    url = f"{settings.dwd_api_url}/current_weather"
    params = {"lat": lat, "lon": lng}
    DWD_MAP = {"dry":"clear","fog":"fog","rain":"rain","sleet":"rain","snow":"snow",
               "hail":"rain","thunderstorm":"storm","null":"clear"}
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    w = data.get("weather", {})
    temp = max(-50.0, min(60.0, float(w.get("temperature", 15))))
    condition_raw = str(w.get("condition", "dry")).lower()
    return {
        "temperature": temp,
        "condition": DWD_MAP.get(condition_raw, "clear"),
        "precipitation": condition_raw in ("rain","sleet","snow","hail","thunderstorm"),
        "humidity": float(w.get("relative_humidity", 50)),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


async def health_check() -> None:
    async with httpx.AsyncClient(timeout=3.0) as client:
        await client.get(f"{settings.open_meteo_url}/forecast",
                         params={"latitude": 48.77, "longitude": 9.18,
                                 "current": "temperature_2m", "timezone": "auto"})

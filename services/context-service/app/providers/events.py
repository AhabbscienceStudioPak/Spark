"""
Events provider — OSM Overpass API (free, no key needed).
Req 4: events within 2km, type/time/attendance, active within 2h, graceful degradation.
"""
import httpx
from datetime import datetime, timezone, timedelta
from ..config import settings
from ..retry import with_retry
from gcw_utils import get_logger, haversine_distance, LatLng

logger = get_logger("context-service:events")

# Overpass query to find event venues and scheduled events near a point
OVERPASS_QUERY = """
[out:json][timeout:10];
(
  node["amenity"~"^(theatre|cinema|stadium|concert_hall|events_venue)$"](around:{radius},{lat},{lng});
  way["amenity"~"^(theatre|cinema|stadium|concert_hall|events_venue)$"](around:{radius},{lat},{lng});
  node["leisure"~"^(stadium|sports_centre|arena)$"](around:{radius},{lat},{lng});
  node["tourism"="attraction"](around:{radius},{lat},{lng});
);
out center 20;
"""


async def fetch_nearby_events(lat: float, lng: float, radius_km: float = 2.0) -> list[dict]:
    """
    Queries OSM Overpass for event venues near the location.
    Returns empty list on failure (Req 4.4 graceful degradation).
    """
    if settings.events_source == "eventbrite":
        return await _fetch_eventbrite(lat, lng, radius_km)

    try:
        return await with_retry(
            lambda: _fetch_overpass(lat, lng, radius_km),
            label=f"events({lat:.3f},{lng:.3f})",
        )
    except Exception as exc:
        logger.warning(f"Event API unavailable, continuing without event signals: {exc}")
        return []


async def _fetch_overpass(lat: float, lng: float, radius_km: float) -> list[dict]:
    """Fetch event venues from OSM Overpass (free, no key)."""
    radius_m = int(radius_km * 1000)
    query = OVERPASS_QUERY.format(radius=radius_m, lat=lat, lng=lng)

    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(
            settings.overpass_url,
            data={"data": query},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        data = resp.json()

    now = datetime.now(timezone.utc)
    events = []
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name", "Local Event")

        # Determine coordinates
        if element.get("type") == "way":
            center = element.get("center", {})
            e_lat = float(center.get("lat", lat))
            e_lng = float(center.get("lon", lng))
        else:
            e_lat = float(element.get("lat", lat))
            e_lng = float(element.get("lon", lng))

        distance = haversine_distance(LatLng(lat, lng), LatLng(e_lat, e_lng))

        # Infer event type from OSM tags
        amenity = tags.get("amenity", "")
        leisure = tags.get("leisure", "")
        event_type = _infer_event_type(amenity, leisure, tags)

        # For OSM venues we simulate "event starting soon" based on time of day
        # (real events would come from a calendar API)
        hour = now.hour
        is_active = (event_type == "concert" and 18 <= hour <= 22) or \
                    (event_type == "sports" and (12 <= hour <= 14 or 18 <= hour <= 21)) or \
                    (event_type == "festival" and 10 <= hour <= 20)

        # Estimate attendance from capacity tag or defaults
        capacity_str = tags.get("capacity", "0")
        try:
            capacity = int(capacity_str)
        except (ValueError, TypeError):
            capacity = _default_capacity(event_type)

        events.append({
            "id": str(element.get("id", "")),
            "name": name,
            "type": event_type,
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "estimated_attendance": capacity,
            "distance_meters": distance,
            "is_active": is_active,
        })

    return events[:10]  # cap at 10 events


def _infer_event_type(amenity: str, leisure: str, tags: dict) -> str:
    if amenity in ("theatre", "cinema", "concert_hall"):
        return "concert"
    if leisure in ("stadium", "sports_centre", "arena") or amenity == "stadium":
        return "sports"
    if tags.get("tourism") == "attraction":
        return "festival"
    return "other"


def _default_capacity(event_type: str) -> int:
    return {"concert": 500, "sports": 2000, "festival": 1000, "conference": 200}.get(event_type, 100)


async def _fetch_eventbrite(lat: float, lng: float, radius_km: float) -> list[dict]:
    """
    Fetches real events from Eventbrite API using Bearer token auth.
    Uses private token for full access to event details.
    """
    # Prefer private token (Bearer auth), fall back to legacy token param
    token = settings.eventbrite_private_token or settings.eventbrite_api_key
    if not token:
        logger.warning("Eventbrite token not configured, returning empty events")
        return []

    url = f"{settings.eventbrite_api_url}/events/search/"
    params = {
        "location.latitude": lat,
        "location.longitude": lng,
        "location.within": f"{radius_km}km",
        "expand": "venue",
        "status": "live",
        "sort_by": "date",
    }
    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning(f"Eventbrite API failed: {exc}")
        return []

    now = datetime.now(timezone.utc)
    results = []

    for e in data.get("events", []):
        venue = e.get("venue") or {}
        address = venue.get("address") or {}
        e_lat = float(address.get("latitude") or venue.get("latitude") or lat)
        e_lng = float(address.get("longitude") or venue.get("longitude") or lng)
        distance = haversine_distance(LatLng(lat, lng), LatLng(e_lat, e_lng))

        start_str = e.get("start", {}).get("utc", "")
        try:
            start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            start = now + timedelta(hours=2)

        hours_until = (start - now).total_seconds() / 3600

        # Map Eventbrite category IDs to our types
        category_id = str(e.get("category_id", ""))
        event_type = _map_eventbrite_category(category_id)

        # Estimate attendance
        capacity = e.get("capacity") or _default_capacity(event_type)

        results.append({
            "id": e["id"],
            "name": e.get("name", {}).get("text", "Event"),
            "type": event_type,
            "start_time": start.isoformat(),
            "estimated_attendance": capacity,
            "distance_meters": distance,
            "is_active": 0 <= hours_until <= 2,
        })

    logger.info(f"Eventbrite returned {len(results)} events near ({lat:.3f},{lng:.3f})")
    return results


def _map_eventbrite_category(category_id: str) -> str:
    """Maps Eventbrite category IDs to internal event types."""
    # https://www.eventbrite.com/platform/api#/reference/event/list/list-categories
    mapping = {
        "103": "concert",   # Music
        "108": "sports",    # Sports & Fitness
        "110": "festival",  # Food & Drink
        "113": "festival",  # Community & Culture
        "105": "festival",  # Performing & Visual Arts
        "104": "festival",  # Film, Media & Entertainment
        "101": "conference", # Business & Professional
        "102": "conference", # Science & Technology
    }
    return mapping.get(category_id, "other")


async def health_check() -> None:
    async with httpx.AsyncClient(timeout=3.0) as client:
        await client.get(settings.overpass_url.replace("/interpreter", "/status"))

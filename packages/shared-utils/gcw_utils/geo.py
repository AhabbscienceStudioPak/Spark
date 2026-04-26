"""Geo utilities. Haversine satisfies the confluence property: order of args doesn't affect result."""
import math
from dataclasses import dataclass

EARTH_RADIUS_METERS = 6_371_000
WALKING_SPEED_MPS = 5000 / 3600  # 5 km/h in m/s


@dataclass
class LatLng:
    lat: float
    lng: float


def haversine_distance(a: LatLng, b: LatLng) -> float:
    """Returns great-circle distance in meters between two coordinates."""
    lat1, lng1 = math.radians(a.lat), math.radians(a.lng)
    lat2, lng2 = math.radians(b.lat), math.radians(b.lng)

    d_lat = lat2 - lat1
    d_lng = lng2 - lng1

    h = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(h))


def estimate_walking_minutes(distance_meters: float) -> int:
    """Estimates walking time in minutes at 5 km/h."""
    return math.ceil(distance_meters / WALKING_SPEED_MPS / 60)


def is_within_geo_fence(consumer: LatLng, merchant: LatLng, radius_meters: float) -> bool:
    """Returns True if consumer is within the merchant's geo-fence radius."""
    return haversine_distance(consumer, merchant) <= radius_meters

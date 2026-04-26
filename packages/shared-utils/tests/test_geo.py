"""Tests for geo utilities — confluence and correctness properties."""
import pytest
import math
from gcw_utils.geo import haversine_distance, estimate_walking_minutes, is_within_geo_fence, LatLng


# ── haversine_distance ────────────────────────────────────────────────────────

def test_distance_same_point_is_zero():
    """Distance from a point to itself must be 0."""
    p = LatLng(48.7758, 9.1829)
    assert haversine_distance(p, p) == pytest.approx(0.0, abs=1e-6)


def test_distance_is_symmetric():
    """Confluence property: haversine_distance(a, b) == haversine_distance(b, a)."""
    a = LatLng(48.7758, 9.1829)
    b = LatLng(52.5200, 13.4050)
    assert haversine_distance(a, b) == pytest.approx(haversine_distance(b, a), rel=1e-9)


def test_distance_stuttgart_to_berlin():
    """Stuttgart to Berlin is approximately 511 km."""
    stuttgart = LatLng(48.7758, 9.1829)
    berlin = LatLng(52.5200, 13.4050)
    dist = haversine_distance(stuttgart, berlin)
    assert 500_000 < dist < 520_000  # meters


def test_distance_nearby_merchants():
    """Two merchants 80m apart should return ~80m distance."""
    a = LatLng(48.7758, 9.1829)
    b = LatLng(48.7765, 9.1829)  # ~78m north
    dist = haversine_distance(a, b)
    assert 50 < dist < 120


# ── estimate_walking_minutes ──────────────────────────────────────────────────

def test_walking_time_500m():
    """500m at 5 km/h should take ~6 minutes."""
    minutes = estimate_walking_minutes(500)
    assert minutes == 6


def test_walking_time_zero():
    """0m distance should return 0 minutes."""
    assert estimate_walking_minutes(0) == 0


def test_walking_time_rounds_up():
    """Walking time should always round up (ceiling)."""
    # 100m at 5km/h = 1.2 minutes → rounds up to 2
    minutes = estimate_walking_minutes(100)
    assert minutes == 2


# ── is_within_geo_fence ───────────────────────────────────────────────────────

def test_within_geo_fence_true():
    """Consumer 80m from merchant should be within 500m geo-fence."""
    consumer = LatLng(48.7758, 9.1829)
    merchant = LatLng(48.7765, 9.1829)
    assert is_within_geo_fence(consumer, merchant, 500) is True


def test_outside_geo_fence():
    """Consumer 600m from merchant should be outside 500m geo-fence."""
    consumer = LatLng(48.7758, 9.1829)
    merchant = LatLng(48.7812, 9.1829)  # ~600m north
    assert is_within_geo_fence(consumer, merchant, 500) is False


def test_geo_fence_boundary():
    """Consumer exactly at radius boundary should be within geo-fence."""
    consumer = LatLng(48.7758, 9.1829)
    merchant = LatLng(48.7758, 9.1829)
    assert is_within_geo_fence(consumer, merchant, 0) is True

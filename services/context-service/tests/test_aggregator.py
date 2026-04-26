"""Tests for the context aggregator and providers."""
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

from app.aggregator import aggregate_context, _calculate_relevance


@pytest.mark.asyncio
async def test_aggregate_context_returns_valid_state():
    """aggregate_context should return a CompositeContextState-shaped dict."""
    mock_weather = {
        "temperature": 11.0, "condition": "clouds",
        "precipitation": False, "humidity": 65,
        "fetched_at": datetime.now(timezone.utc),
    }
    mock_events = []
    mock_density = {
        "merchant_id": "merchant-001",
        "current_density": 3, "typical_density": 10,
        "density_ratio": 0.3, "is_low_demand": True,
        "updated_at": datetime.now(timezone.utc),
    }

    with (
        patch("app.aggregator.weather.fetch_weather", new=AsyncMock(return_value=mock_weather)),
        patch("app.aggregator.events.fetch_nearby_events", new=AsyncMock(return_value=mock_events)),
        patch("app.aggregator.payone.get_transaction_density", new=AsyncMock(return_value=mock_density)),
        patch("app.aggregator.load_city_config", return_value={
            "cityCode": "stuttgart",
            "defaultGeoFenceRadiusMeters": 500,
            "merchants": [{"id": "merchant-001"}],
        }),
    ):
        state = await aggregate_context(48.7758, 9.1829, "stuttgart")

    assert "id" in state
    assert state["weather"]["temperature"] == 11.0
    assert state["weather"]["condition"] == "clouds"
    assert state["location"]["city"] == "stuttgart"
    assert 0 <= state["relevance_score"] <= 100
    assert len(state["transaction_density"]) == 1
    assert state["transaction_density"][0]["is_low_demand"] is True


@pytest.mark.asyncio
async def test_aggregate_context_handles_weather_failure():
    """aggregate_context should use default weather when provider fails."""
    with (
        patch("app.aggregator.weather.fetch_weather", new=AsyncMock(side_effect=Exception("API down"))),
        patch("app.aggregator.events.fetch_nearby_events", new=AsyncMock(return_value=[])),
        patch("app.aggregator.load_city_config", return_value={
            "cityCode": "stuttgart",
            "defaultGeoFenceRadiusMeters": 500,
            "merchants": [],
        }),
    ):
        state = await aggregate_context(48.7758, 9.1829, "stuttgart")

    # Should fall back to default weather, not raise
    assert state["weather"]["temperature"] == 15.0
    assert state["weather"]["condition"] == "clear"


def test_relevance_score_low_demand_merchant():
    """Low-demand merchant should increase relevance score."""
    weather = {"temperature": 20, "condition": "clear"}
    events = []
    density = [{"is_low_demand": True}]
    score = _calculate_relevance(weather, events, density)
    assert score >= 60  # base 30 + low demand 30


def test_relevance_score_cold_rainy_event():
    """Cold + rain + active event should push score to max."""
    weather = {"temperature": 5, "condition": "rain"}
    events = [{"is_active": True}]
    density = [{"is_low_demand": True}]
    score = _calculate_relevance(weather, events, density)
    assert score == 100


def test_relevance_score_capped_at_100():
    """Relevance score must never exceed 100 (invariant)."""
    weather = {"temperature": 2, "condition": "snow"}
    events = [{"is_active": True}, {"is_active": True}]
    density = [{"is_low_demand": True}, {"is_low_demand": True}]
    score = _calculate_relevance(weather, events, density)
    assert score <= 100

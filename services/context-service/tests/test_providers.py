"""Tests for context data providers."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone

from app.providers.weather import fetch_weather
from app.providers.payone import get_transaction_density


@pytest.mark.asyncio
async def test_fetch_weather_clamps_temperature():
    """Temperature must be clamped to -50..60 invariant even if API returns out-of-range."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "main": {"temp": 999.0, "humidity": 50},
        "weather": [{"main": "Clear"}],
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.providers.weather.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        result = await fetch_weather(48.7758, 9.1829)

    assert result["temperature"] <= 60.0


@pytest.mark.asyncio
async def test_fetch_weather_maps_condition():
    """Weather condition should be mapped from OWM format to internal format."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "main": {"temp": 8.0, "humidity": 80},
        "weather": [{"main": "Rain"}],
        "rain": {"1h": 2.5},
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.providers.weather.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        result = await fetch_weather(48.7758, 9.1829)

    assert result["condition"] == "rain"
    assert result["precipitation"] is True


@pytest.mark.asyncio
async def test_payone_returns_default_on_failure():
    """Payone provider should return safe defaults when API is unavailable."""
    with patch("app.providers.payone.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(
            side_effect=Exception("Connection refused")
        )
        result = await get_transaction_density("merchant-001")

    assert result["merchant_id"] == "merchant-001"
    assert result["is_low_demand"] is False
    assert result["density_ratio"] == 1.0


@pytest.mark.asyncio
async def test_payone_marks_low_demand_correctly():
    """Density ratio < 0.6 should be marked as low demand."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "currentHourCount": 2,
        "typicalHourCount": 10,
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.providers.payone.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        result = await get_transaction_density("merchant-001")

    assert result["density_ratio"] == pytest.approx(0.2)
    assert result["is_low_demand"] is True

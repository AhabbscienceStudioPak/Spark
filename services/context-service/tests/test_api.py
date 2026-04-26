"""Integration tests for the context service HTTP API."""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code in (200, 207)
    data = response.json()
    assert data["service"] == "context-service"
    assert "sources" in data


@pytest.mark.asyncio
async def test_aggregate_endpoint_missing_params():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/context/aggregate", json={})
    assert response.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_aggregate_endpoint_unknown_city():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/context/aggregate", json={
            "lat": 48.7758, "lng": 9.1829, "city_code": "nonexistent_city_xyz"
        })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_aggregate_endpoint_success():
    mock_state = {
        "id": "00000000-0000-0000-0000-000000000001",
        "weather": {"temperature": 11.0, "condition": "clouds", "precipitation": False, "humidity": 65, "fetched_at": datetime.now(timezone.utc).isoformat()},
        "location": {"coordinates": {"lat": 48.7758, "lng": 9.1829}, "accuracy": 50, "city": "stuttgart", "fetched_at": datetime.now(timezone.utc).isoformat()},
        "time": {"local_time": datetime.now(timezone.utc).isoformat(), "time_of_day": "lunch", "day_type": "weekday", "day_of_week": 2, "is_holiday": False},
        "events": [],
        "transaction_density": [],
        "relevance_score": 60,
        "triggered_at": datetime.now(timezone.utc).isoformat(),
    }

    with patch("app.routers.context.aggregate_context", new=AsyncMock(return_value=mock_state)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/context/aggregate", json={
                "lat": 48.7758, "lng": 9.1829, "city_code": "stuttgart"
            })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["relevance_score"] == 60

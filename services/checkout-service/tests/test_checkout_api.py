"""Integration tests for the checkout service HTTP API."""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta

from app.main import app


def make_mock_pool():
    """Creates a mock asyncpg pool for testing without a real database."""
    pool = MagicMock()
    conn = AsyncMock()
    pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
    pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
    return pool, conn


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "checkout-service"


@pytest.mark.asyncio
async def test_accept_offer_creates_token():
    """Accepting an offer should return a token and QR payload."""
    pool, conn = make_mock_pool()
    conn.fetchrow.side_effect = [
        None,  # no existing token
        {  # offer row
            "merchant_id": "00000000-0000-0000-0000-000000000001",
            "discount_percentage": 15.0,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=2),
        },
    ]
    conn.execute = AsyncMock()

    with patch("app.routers.checkout.get_pool", return_value=pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/checkout/accept", json={
                "offer_id": "00000000-0000-0000-0000-000000000002",
                "consumer_id": "consumer-abc",
            })

    assert response.status_code == 201
    data = response.json()["data"]
    assert "token" in data
    assert len(data["token"]) == 32  # 128-bit hex
    assert "qr_payload" in data


@pytest.mark.asyncio
async def test_accept_offer_rejects_duplicate():
    """Accepting an already-accepted offer should return 409."""
    pool, conn = make_mock_pool()
    conn.fetchrow.return_value = {"token": "existing-token"}  # already accepted

    with patch("app.routers.checkout.get_pool", return_value=pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/checkout/accept", json={
                "offer_id": "00000000-0000-0000-0000-000000000002",
                "consumer_id": "consumer-abc",
            })

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_validate_token_expired():
    """Expired token should return is_valid=False with EXPIRED error code."""
    pool, conn = make_mock_pool()
    conn.fetchrow.return_value = {
        "token": "abc123",
        "offer_id": "00000000-0000-0000-0000-000000000002",
        "merchant_id": "00000000-0000-0000-0000-000000000001",
        "discount_percentage": 15.0,
        "expires_at": datetime.now(timezone.utc) - timedelta(hours=1),  # expired
        "redeemed_at": None,
    }

    with patch("app.routers.validation.get_pool", return_value=pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/validate/token", json={
                "token": "abc123",
                "merchant_id": "00000000-0000-0000-0000-000000000001",
            })

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["is_valid"] is False
    assert data["error_code"] == "EXPIRED"


@pytest.mark.asyncio
async def test_validate_token_already_redeemed():
    """Already-redeemed token should return ALREADY_REDEEMED error."""
    pool, conn = make_mock_pool()
    conn.fetchrow.return_value = {
        "token": "abc123",
        "offer_id": "00000000-0000-0000-0000-000000000002",
        "merchant_id": "00000000-0000-0000-0000-000000000001",
        "discount_percentage": 15.0,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "redeemed_at": datetime.now(timezone.utc) - timedelta(minutes=5),  # already redeemed
    }

    with patch("app.routers.validation.get_pool", return_value=pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/validate/token", json={
                "token": "abc123",
                "merchant_id": "00000000-0000-0000-0000-000000000001",
            })

    data = response.json()["data"]
    assert data["is_valid"] is False
    assert data["error_code"] == "ALREADY_REDEEMED"

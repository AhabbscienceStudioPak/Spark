"""Merchant onboarding endpoint."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Literal
import asyncpg
from ..db import get_pool

router = APIRouter(prefix="/api/v1/merchants", tags=["Onboarding"])


class OnboardRequest(BaseModel):
    name: str
    category: Literal["cafe", "restaurant", "retail", "bakery", "bar", "gym", "pharmacy", "other"]
    address: str
    city: str
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    geo_fence_radius_meters: int = Field(default=500, ge=50, le=2000)
    offer_preview_mode: bool = True
    max_discount_percentage: float = Field(..., ge=1, le=100)


@router.post("/onboard", status_code=201)
async def onboard_merchant(
    body: OnboardRequest,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """
    Onboards a new merchant and creates a default campaign rule.
    Activates the merchant for offer generation within 5 minutes (Req 29).
    """
    async with pool.acquire() as conn:
        # Create merchant
        merchant = await conn.fetchrow(
            """INSERT INTO merchants
               (name, category, lat, lng, address, city,
                geo_fence_radius_meters, offer_preview_mode, is_active)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
               RETURNING *""",
            body.name, body.category, body.lat, body.lng,
            body.address, body.city,
            body.geo_fence_radius_meters, body.offer_preview_mode,
        )

        # Create a default campaign rule based on category
        default_windows = _default_time_windows(body.category)
        await conn.execute(
            """INSERT INTO campaign_rules
               (merchant_id, name, max_discount_percentage, target_time_windows,
                target_days_of_week, eligible_categories, goal, is_active)
               VALUES ($1,$2,$3,$4,$5,$6,$7,true)""",
            str(merchant["id"]),
            f"{body.name} — Default Rule",
            body.max_discount_percentage,
            default_windows,
            "[1,2,3,4,5]",  # weekdays
            "[]",
            "increase_foot_traffic",
        )

    return {
        "success": True,
        "data": {
            "merchant_id": str(merchant["id"]),
            "name": merchant["name"],
            "is_active": True,
            "message": "Merchant activated. Offer generation will begin within 5 minutes.",
        },
    }


def _default_time_windows(category: str) -> str:
    """Returns JSON string of default time windows based on merchant category."""
    windows = {
        "cafe": '[{"start":"07:00","end":"11:00"},{"start":"14:00","end":"17:00"}]',
        "restaurant": '[{"start":"11:00","end":"14:00"},{"start":"17:00","end":"21:00"}]',
        "bakery": '[{"start":"07:00","end":"10:00"}]',
        "bar": '[{"start":"17:00","end":"23:00"}]',
        "gym": '[{"start":"06:00","end":"09:00"},{"start":"17:00","end":"20:00"}]',
    }
    return windows.get(category, '[{"start":"09:00","end":"18:00"}]')

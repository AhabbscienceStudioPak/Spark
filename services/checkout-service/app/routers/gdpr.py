"""
GDPR endpoints — data export and account deletion (Req 24).
"""
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import asyncpg
from ..db import get_pool
from gcw_utils import get_logger

router = APIRouter(prefix="/api/v1/gdpr", tags=["GDPR"])
logger = get_logger("checkout-service:gdpr")


@router.get("/export/{consumer_id}")
async def export_data(consumer_id: str, pool: asyncpg.Pool = Depends(get_pool)) -> JSONResponse:
    """
    Req 24.1: Export all consumer data as JSON.
    Returns offer history, redemptions, and dismissals.
    """
    async with pool.acquire() as conn:
        tokens = await conn.fetch(
            "SELECT offer_id, discount_percentage, expires_at, redeemed_at, created_at "
            "FROM offer_tokens WHERE consumer_id = $1 ORDER BY created_at DESC",
            consumer_id,
        )
        redemptions = await conn.fetch(
            "SELECT offer_id, merchant_id, original_price, discount_amount, final_price, redeemed_at "
            "FROM redemptions WHERE consumer_id = $1 ORDER BY redeemed_at DESC",
            consumer_id,
        )
        dismissals = await conn.fetch(
            "SELECT offer_id, reason, dismissed_at FROM dismissals WHERE consumer_id = $1",
            consumer_id,
        )

    export = {
        "consumer_id": consumer_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "data_categories": {
            "accepted_offers": [dict(r) for r in tokens],
            "redemptions": [dict(r) for r in redemptions],
            "dismissals": [dict(r) for r in dismissals],
        },
        "privacy_note": (
            "Raw location coordinates and behavioral data are stored on-device only "
            "and are not included in this export."
        ),
    }

    logger.info(f"GDPR data export for consumer {consumer_id[:8]}...")
    return JSONResponse(
        content=json.loads(json.dumps(export, default=str)),
        headers={"Content-Disposition": f"attachment; filename=gcw-data-{consumer_id[:8]}.json"},
    )


@router.delete("/delete/{consumer_id}", status_code=200)
async def delete_account(consumer_id: str, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """
    Req 24.2: Delete all consumer data from backend systems.
    Req 24.3: Completes within 30 days (immediate for backend data).
    """
    async with pool.acquire() as conn:
        # Delete in dependency order
        await conn.execute("DELETE FROM dismissals WHERE consumer_id = $1", consumer_id)
        await conn.execute("DELETE FROM redemptions WHERE consumer_id = $1", consumer_id)
        await conn.execute(
            "UPDATE offer_tokens SET consumer_id = 'DELETED' WHERE consumer_id = $1",
            consumer_id,
        )
        await conn.execute(
            "UPDATE offers SET consumer_id = 'DELETED' WHERE consumer_id = $1",
            consumer_id,
        )

    logger.info(f"GDPR account deletion completed for consumer {consumer_id[:8]}...")
    return {
        "success": True,
        "message": "All backend data deleted. Please also clear local app data from Settings.",
        "deleted_at": datetime.now(timezone.utc).isoformat(),
    }

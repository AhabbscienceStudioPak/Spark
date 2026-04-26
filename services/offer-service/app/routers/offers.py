from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import asyncpg

from ..db import get_pool
from ..engine.offer_generator import generate_offers

router = APIRouter(prefix="/api/v1/offers", tags=["Offers"])


class GenerateRequest(BaseModel):
    context_state: dict
    consumer_id: str
    consumer_language: str = "de"
    consumer_max_per_day: Optional[int] = Field(default=None, ge=1, le=10)


@router.post("/generate")
async def generate(body: GenerateRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Triggers offer generation from a composite context state (Req 9, 10, 28)."""
    try:
        offers = await generate_offers(
            body.context_state,
            body.consumer_id,
            pool,
            consumer_language=body.consumer_language,
            consumer_max_per_day=body.consumer_max_per_day,
        )
        return {"success": True, "data": offers}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}")


@router.get("/{offer_id}")
async def get_offer(offer_id: str, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM offers WHERE id = $1", offer_id)
    if not row:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True, "data": dict(row)}


@router.get("")
async def list_offers(
    merchant_id: Optional[str] = None,
    status: Optional[str] = None,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """List offers with optional filters (used by merchant approval queue)."""
    query = "SELECT * FROM offers WHERE 1=1"
    params = []
    if merchant_id:
        params.append(merchant_id)
        query += f" AND merchant_id = ${len(params)}"
    if status:
        params.append(status)
        query += f" AND status = ${len(params)}"
    query += " ORDER BY generated_at DESC LIMIT 100"

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    import json as _json
    result = []
    for r in rows:
        d = dict(r)
        for col in ("content", "visual_design"):
            if isinstance(d.get(col), str):
                try:
                    d[col] = _json.loads(d[col])
                except Exception:
                    pass
        result.append(d)
    return {"success": True, "data": result}


@router.patch("/{offer_id}/approve")
async def approve_offer(offer_id: str, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Merchant approves a pending offer — available to consumers within 30s (Req 13.3)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE offers SET status='active', updated_at=NOW() WHERE id=$1 RETURNING *",
            offer_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True, "data": dict(row)}


@router.patch("/{offer_id}/reject")
async def reject_offer(offer_id: str, body: dict, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Merchant rejects a pending offer with a reason (Req 13.4)."""
    reason = body.get("reason", "")
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE offers SET status='rejected', rejection_reason=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
            reason, offer_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True, "data": dict(row)}


@router.post("/expire-stale")
async def expire_stale_offers(pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """
    Marks expired offers as 'expired' (Req 26.1: within 10 seconds of expiry time).
    Called by a background scheduler every 10 seconds.
    """
    async with pool.acquire() as conn:
        result = await conn.execute(
            """UPDATE offers SET status='expired', updated_at=NOW()
               WHERE status IN ('active','pending_approval')
               AND expires_at < NOW()"""
        )
    count = int(result.split()[-1]) if result else 0
    return {"success": True, "expired_count": count}


@router.get("/{offer_id}/similar")
async def get_similar_offers(
    offer_id: str,
    consumer_id: str,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """
    Req 26.4: Suggest similar active offers when a consumer tries to redeem an expired one.
    """
    async with pool.acquire() as conn:
        expired = await conn.fetchrow("SELECT merchant_id FROM offers WHERE id = $1", offer_id)
        if not expired:
            return {"success": True, "data": []}

        similar = await conn.fetch(
            """SELECT * FROM offers
               WHERE status = 'active'
               AND consumer_id = $1
               AND expires_at > NOW()
               AND id != $2
               ORDER BY relevance_score DESC
               LIMIT 3""",
            consumer_id, offer_id,
        )
    return {"success": True, "data": [dict(r) for r in similar]}

import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from ..db import get_pool
import asyncpg

router = APIRouter(prefix="/api/v1/merchants", tags=["Merchants"])


class CampaignRuleCreate(BaseModel):
    name: str
    max_discount_percentage: float = Field(..., ge=0, le=100)
    target_time_windows: list[dict] = []
    target_days_of_week: list[int] = []
    eligible_categories: list[str] = []
    goal: str = "increase_foot_traffic"


@router.get("/{merchant_id}")
async def get_merchant(merchant_id: str, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Returns merchant details including name and coordinates."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, name, category, lat, lng, address, city, geo_fence_radius_meters, is_active "
            "FROM merchants WHERE id = $1",
            merchant_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return {"success": True, "data": dict(row)}


@router.get("/{merchant_id}/campaign-rules")
async def get_campaign_rules(merchant_id: str, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM campaign_rules WHERE merchant_id = $1 ORDER BY created_at DESC",
            merchant_id,
        )
    import json as _json
    result = []
    for r in rows:
        d = dict(r)
        # Parse JSONB columns that asyncpg returns as strings
        for col in ("target_time_windows", "target_days_of_week", "eligible_categories"):
            if isinstance(d.get(col), str):
                try:
                    d[col] = _json.loads(d[col])
                except Exception:
                    d[col] = []
        result.append(d)
    return {"success": True, "data": result}


@router.post("/{merchant_id}/campaign-rules", status_code=201)
async def create_campaign_rule(
    merchant_id: str,
    body: CampaignRuleCreate,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    # Enforce invariant at application layer (DB constraint also enforces this)
    max_disc = max(0.0, min(100.0, body.max_discount_percentage))
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO campaign_rules
               (merchant_id, name, max_discount_percentage, target_time_windows,
                target_days_of_week, eligible_categories, goal)
               VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *""",
            merchant_id, body.name, max_disc,
            json.dumps(body.target_time_windows),
            json.dumps(body.target_days_of_week),
            json.dumps(body.eligible_categories),
            body.goal,
        )
    return {"success": True, "data": dict(row)}


@router.patch("/{merchant_id}/campaign-rules/{rule_id}/toggle")
async def toggle_campaign_rule(
    merchant_id: str,
    rule_id: str,
    body: dict,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """Req 8.5: Activate or deactivate a campaign rule without deleting it."""
    is_active = body.get("is_active", True)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE campaign_rules SET is_active=$1, updated_at=NOW()
               WHERE id=$2 AND merchant_id=$3 RETURNING *""",
            is_active, rule_id, merchant_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Campaign rule not found")
    return {"success": True, "data": dict(row)}


@router.get("/{merchant_id}/performance")
async def get_performance(
    merchant_id: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    from datetime import datetime, timedelta
    period_start = start or (datetime.utcnow() - timedelta(days=30)).isoformat()
    period_end = end or datetime.utcnow().isoformat()

    # asyncpg needs datetime objects, not strings
    ps = datetime.fromisoformat(period_start) if isinstance(period_start, str) else period_start
    pe = datetime.fromisoformat(period_end) if isinstance(period_end, str) else period_end

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status IN ('accepted','redeemed')) AS accepted,
                COUNT(*) FILTER (WHERE status = 'redeemed') AS redeemed,
                AVG(discount_percentage) AS avg_discount,
                SUM(discount_percentage) AS total_discount
               FROM offers
               WHERE merchant_id = $1 AND generated_at BETWEEN $2 AND $3""",
            merchant_id, ps, pe,
        )

    total = row["total"] or 0
    accepted = row["accepted"] or 0
    redeemed = row["redeemed"] or 0

    return {
        "success": True,
        "data": {
            "merchant_id": merchant_id,
            "total_offers_generated": total,
            "acceptance_rate": accepted / total if total > 0 else 0,
            "redemption_rate": redeemed / accepted if accepted > 0 else 0,
            "average_discount_given": float(row["avg_discount"] or 0),
            "total_discount_amount": float(row["total_discount"] or 0),
            "period_start": period_start,
            "period_end": period_end,
        },
    }

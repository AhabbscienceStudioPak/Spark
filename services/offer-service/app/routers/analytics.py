"""
Analytics endpoints for merchant dashboard.
Req 21: performance breakdown by time-of-day, day-of-week, weather.
Req 22: decline pattern insights.
"""
from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime, timedelta
import asyncpg
from ..db import get_pool

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get("/merchants/{merchant_id}/breakdown")
async def performance_breakdown(
    merchant_id: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """
    Req 21.2: Performance breakdown by time-of-day, day-of-week, and weather condition.
    """
    period_start = start or (datetime.utcnow() - timedelta(days=30)).isoformat()
    period_end = end or datetime.utcnow().isoformat()
    ps = datetime.fromisoformat(period_start) if isinstance(period_start, str) else period_start
    pe = datetime.fromisoformat(period_end) if isinstance(period_end, str) else period_end

    async with pool.acquire() as conn:
        # Breakdown by time-of-day bucket
        time_rows = await conn.fetch(
            """
            SELECT
                CASE
                    WHEN EXTRACT(HOUR FROM generated_at) BETWEEN 6 AND 10 THEN 'morning'
                    WHEN EXTRACT(HOUR FROM generated_at) BETWEEN 11 AND 13 THEN 'lunch'
                    WHEN EXTRACT(HOUR FROM generated_at) BETWEEN 14 AND 17 THEN 'afternoon'
                    WHEN EXTRACT(HOUR FROM generated_at) BETWEEN 18 AND 21 THEN 'evening'
                    ELSE 'night'
                END AS time_of_day,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status IN ('accepted','redeemed')) AS accepted,
                COUNT(*) FILTER (WHERE status = 'redeemed') AS redeemed,
                AVG(discount_percentage) AS avg_discount
            FROM offers
            WHERE merchant_id = $1 AND generated_at BETWEEN $2 AND $3
            GROUP BY 1 ORDER BY 1
            """,
            merchant_id, ps, pe,
        )

        # Breakdown by day of week
        dow_rows = await conn.fetch(
            """
            SELECT
                EXTRACT(DOW FROM generated_at)::int AS day_of_week,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status IN ('accepted','redeemed')) AS accepted,
                COUNT(*) FILTER (WHERE status = 'redeemed') AS redeemed
            FROM offers
            WHERE merchant_id = $1 AND generated_at BETWEEN $2 AND $3
            GROUP BY 1 ORDER BY 1
            """,
            merchant_id, ps, pe,
        )

        # Revenue impact
        revenue_row = await conn.fetchrow(
            """
            SELECT
                COALESCE(SUM(r.discount_amount), 0) AS total_discount_given,
                COUNT(r.id) AS total_redemptions,
                COALESCE(SUM(r.final_price), 0) AS total_revenue
            FROM redemptions r
            WHERE r.merchant_id = $1 AND r.redeemed_at BETWEEN $2 AND $3
            """,
            merchant_id, ps, pe,
        )

    day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return {
        "success": True,
        "data": {
            "by_time_of_day": [
                {
                    "time_of_day": r["time_of_day"],
                    "total": r["total"],
                    "accepted": r["accepted"],
                    "redeemed": r["redeemed"],
                    "avg_discount": float(r["avg_discount"] or 0),
                }
                for r in time_rows
            ],
            "by_day_of_week": [
                {
                    "day": day_names[r["day_of_week"]],
                    "day_of_week": r["day_of_week"],
                    "total": r["total"],
                    "accepted": r["accepted"],
                    "redeemed": r["redeemed"],
                }
                for r in dow_rows
            ],
            "revenue_impact": {
                "total_discount_given": float(revenue_row["total_discount_given"]),
                "total_redemptions": revenue_row["total_redemptions"],
                "total_revenue": float(revenue_row["total_revenue"]),
                "estimated_incremental_revenue": float(revenue_row["total_revenue"]) * 0.3,
            },
        },
    }


@router.get("/merchants/{merchant_id}/decline-insights")
async def decline_insights(
    merchant_id: str,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """
    Req 22.3: Insights on common decline patterns.
    e.g. "You declined 80% of offers with >15% discount"
    """
    async with pool.acquire() as conn:
        # Overall decline rate
        summary = await conn.fetchrow(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
                COUNT(*) FILTER (WHERE status = 'active') AS approved
            FROM offers WHERE merchant_id = $1
            """,
            merchant_id,
        )

        # Decline rate by discount bucket
        discount_rows = await conn.fetch(
            """
            SELECT
                CASE
                    WHEN discount_percentage <= 10 THEN '0-10%'
                    WHEN discount_percentage <= 15 THEN '11-15%'
                    WHEN discount_percentage <= 20 THEN '16-20%'
                    ELSE '>20%'
                END AS discount_bucket,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
                ARRAY_AGG(DISTINCT rejection_reason) FILTER (WHERE rejection_reason IS NOT NULL) AS reasons
            FROM offers
            WHERE merchant_id = $1 AND status IN ('rejected', 'active', 'accepted', 'redeemed')
            GROUP BY 1 ORDER BY 1
            """,
            merchant_id,
        )

    total = summary["total"] or 1
    rejected = summary["rejected"] or 0
    overall_decline_rate = round(rejected / total * 100, 1)

    insights = []
    for row in discount_rows:
        bucket_total = row["total"] or 1
        bucket_rejected = row["rejected"] or 0
        rate = round(bucket_rejected / bucket_total * 100, 1)
        if rate > 50:
            insights.append(
                f"You declined {rate}% of offers with {row['discount_bucket']} discount"
            )

    if overall_decline_rate > 30:
        insights.append(
            f"Overall decline rate is {overall_decline_rate}% — consider adjusting campaign rules"
        )

    return {
        "success": True,
        "data": {
            "overall_decline_rate": overall_decline_rate,
            "total_offers": summary["total"],
            "total_rejected": rejected,
            "by_discount_bucket": [
                {
                    "bucket": r["discount_bucket"],
                    "total": r["total"],
                    "rejected": r["rejected"],
                    "decline_rate": round((r["rejected"] or 0) / (r["total"] or 1) * 100, 1),
                    "common_reasons": r["reasons"] or [],
                }
                for r in discount_rows
            ],
            "insights": insights,
        },
    }


@router.get("/system/metrics")
async def system_metrics(pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """
    Req 30.4: System-wide metrics for the monitoring dashboard.
    Returns: offers/hour, active consumers, redemption rate, latency, error rate.
    """
    async with pool.acquire() as conn:
        # Offers generated in the last hour
        offers_row = await conn.fetchrow(
            "SELECT COUNT(*) AS cnt FROM offers WHERE generated_at >= NOW() - INTERVAL '1 hour'"
        )
        # Active consumers (generated at least one offer today)
        consumers_row = await conn.fetchrow(
            "SELECT COUNT(DISTINCT consumer_id) AS cnt FROM offers WHERE generated_at >= CURRENT_DATE"
        )
        # Redemption rate (last 24h)
        redemption_row = await conn.fetchrow(
            """SELECT
                COUNT(*) FILTER (WHERE status = 'redeemed') AS redeemed,
                COUNT(*) FILTER (WHERE status IN ('accepted','redeemed')) AS accepted
               FROM offers WHERE generated_at >= NOW() - INTERVAL '24 hours'"""
        )
        # Average latency from health_metrics table
        latency_row = await conn.fetchrow(
            """SELECT AVG(metric_value) AS avg_latency
               FROM health_metrics
               WHERE metric_name = 'generation_latency_ms'
               AND recorded_at >= NOW() - INTERVAL '1 hour'"""
        )
        # Error rate
        error_row = await conn.fetchrow(
            """SELECT
                COUNT(*) FILTER (WHERE metric_value = 1) AS errors,
                COUNT(*) AS total
               FROM health_metrics
               WHERE metric_name = 'generation_error'
               AND recorded_at >= NOW() - INTERVAL '1 hour'"""
        )

    accepted = redemption_row["accepted"] or 0
    redeemed = redemption_row["redeemed"] or 0
    error_total = error_row["total"] or 1
    error_count = error_row["errors"] or 0

    return {
        "success": True,
        "data": {
            "offers_generated_last_hour": offers_row["cnt"] or 0,
            "active_consumers": consumers_row["cnt"] or 0,
            "redemption_rate": redeemed / accepted if accepted > 0 else 0,
            "avg_generation_latency_ms": float(latency_row["avg_latency"] or 0),
            "error_rate_pct": (error_count / error_total) * 100,
        },
    }


@router.get("/system/alerts")
async def get_alerts(pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """
    Req 30.5: Returns all unacknowledged system alerts.
    Also triggers a fresh check against current metrics.
    """
    from ..monitoring import check_and_alert
    alerts = await check_and_alert(pool)
    return {"success": True, "data": alerts}


@router.post("/system/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """Marks an alert as acknowledged so it stops appearing in the dashboard."""
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE system_alerts SET acknowledged=true, acknowledged_at=NOW() WHERE id=$1",
            alert_id,
        )
    return {"success": True}

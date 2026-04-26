"""
Offer generation engine.
Req 9: language-aware content generation.
Req 10: 1-hour minimum spacing between offers.
Req 15: push notification delivery after generation.
Req 28: consumer-configurable daily max, 1-hour spacing, relevance prioritization.
Req 30.2: log generation latency, success rate, error rate.
"""
import asyncio
import time
from uuid import uuid4
from datetime import datetime, timezone, timedelta

import asyncpg
import httpx
from gcw_utils import get_logger, is_valid_discount, haversine_distance, LatLng, estimate_walking_minutes
from ..llm.ollama_client import OllamaClient
from ..engine.rule_engine import select_best_rule, calculate_discount, calculate_expiry
from ..config import settings
from ..monitoring import record_metric

logger = get_logger("offer-service:engine")
_ollama = OllamaClient()

DEFAULT_MAX_OFFERS_PER_DAY = 5
MIN_OFFER_SPACING_HOURS = 1
HIGH_RELEVANCE_BYPASS_SCORE = 90  # Req 28.4: bypass spacing if score > 90


async def generate_offers(
    context: dict,
    consumer_id: str,
    pool: asyncpg.Pool,
    consumer_language: str = "de",
    consumer_max_per_day: int | None = None,
) -> list[dict]:
    """
    Generates offers for eligible low-demand merchants.
    Respects daily rate limits and 1-hour minimum spacing (Req 28).
    """
    start_time = time.monotonic()
    max_per_day = consumer_max_per_day or DEFAULT_MAX_OFFERS_PER_DAY

    # Req 28.1: daily rate limit
    today_count = await _count_today_offers(consumer_id, pool)
    if today_count >= max_per_day:
        logger.info(f"Daily offer limit ({max_per_day}) reached for consumer {consumer_id[:8]}")
        return []

    # Req 28.4: check 1-hour spacing (bypass if relevance > 90)
    relevance_score = context.get("relevance_score", 0)
    if relevance_score <= HIGH_RELEVANCE_BYPASS_SCORE:
        last_offer_time = await _get_last_offer_time(consumer_id, pool)
        if last_offer_time:
            elapsed = (datetime.now(timezone.utc) - last_offer_time).total_seconds() / 3600
            if elapsed < MIN_OFFER_SPACING_HOURS:
                logger.info(f"Offer spacing not met ({elapsed:.1f}h < 1h) for consumer {consumer_id[:8]}")
                return []

    # Req 28.3: sort by relevance — low-demand merchants first
    density_signals = context.get("transaction_density", [])
    low_demand = sorted(
        [d for d in density_signals if d.get("is_low_demand")],
        key=lambda d: d.get("density_ratio", 1.0),  # lowest ratio = most urgent
    )

    if not low_demand:
        logger.info("No low-demand merchants, skipping generation")
        return []

    offers = []
    errors = 0
    consumer_lat = context.get("location", {}).get("coordinates", {}).get("lat", 0)
    consumer_lng = context.get("location", {}).get("coordinates", {}).get("lng", 0)

    for density in low_demand[:3]:
        merchant_id = density["merchant_id"]
        try:
            rules = await _get_active_rules(merchant_id, pool)
            if not rules:
                continue

            rule = select_best_rule(rules, context)
            if not rule:
                continue

            density_ratio = density.get("density_ratio", 1.0)

            # Generate content (language-aware, Req 9.4) and visual design concurrently
            content, visual = await asyncio.gather(
                _ollama.generate_offer_content(context, rule, language=consumer_language),
                _ollama.generate_visual_design(context),
            )

            discount = min(calculate_discount(rule, density_ratio), rule["max_discount_percentage"])
            if not is_valid_discount(discount):
                logger.warning(f"Invalid discount {discount} for {merchant_id}, skipping")
                continue

            expires_at = calculate_expiry(context)

            # Calculate walking distance from consumer to merchant (Req 2.4, 14.4)
            merchant_lat = density.get("merchant_lat", consumer_lat)
            merchant_lng = density.get("merchant_lng", consumer_lng)
            dist = haversine_distance(LatLng(consumer_lat, consumer_lng), LatLng(merchant_lat, merchant_lng))
            walk_minutes = estimate_walking_minutes(dist)

            now = datetime.now(timezone.utc)
            offer = {
                "id": str(uuid4()),
                "merchant_id": merchant_id,
                "consumer_id": consumer_id,
                "context_state_id": str(context.get("id", "")),
                "content": content,
                "visual_design": visual,
                "discount_percentage": discount,
                "expires_at": expires_at.isoformat(),
                "status": "active",
                "relevance_score": relevance_score,
                "walking_distance_meters": round(dist),
                "walking_time_minutes": walk_minutes,
                "generated_at": now.isoformat(),
                "generation_model": _ollama.model,
            }

            await _save_offer(offer, pool)
            offers.append(offer)

        except Exception as exc:
            errors += 1
            logger.error(f"Offer generation failed for merchant {merchant_id}: {exc}")

    # Req 30.2: log generation metrics and record to health_metrics table
    elapsed_ms = (time.monotonic() - start_time) * 1000
    logger.info(
        f"Offer generation complete",
        extra={
            "consumer_id": consumer_id[:8],
            "generated": len(offers),
            "errors": errors,
            "latency_ms": round(elapsed_ms),
            "relevance_score": relevance_score,
        },
    )
    # Record metrics for monitoring dashboard (Req 30.4)
    await record_metric(pool, "offer-service", "generation_latency_ms", elapsed_ms)
    if errors > 0:
        await record_metric(pool, "offer-service", "generation_error", 1.0)

    # Req 15.3: deliver offers through consumer's configured channels
    if offers:
        await _notify_consumer(consumer_id, offers[0])

    return offers


async def _notify_consumer(consumer_id: str, offer: dict) -> None:
    """Sends a push notification for the highest-relevance offer (Req 15.3)."""
    notification_url = settings.notification_service_url
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{notification_url}/api/v1/notifications/notify",
                json={
                    "consumer_id": consumer_id,
                    "offer_id": offer["id"],
                    "headline": offer["content"].get("headline", "New offer nearby"),
                    "discount_percentage": offer["discount_percentage"],
                },
            )
    except Exception as exc:
        # Non-critical — offer is still available in-app
        logger.warning(f"Push notification failed (non-critical): {exc}")


async def _count_today_offers(consumer_id: str, pool: asyncpg.Pool) -> int:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT COUNT(*) AS cnt FROM offers WHERE consumer_id = $1 AND generated_at >= CURRENT_DATE",
            consumer_id,
        )
        return row["cnt"] if row else 0


async def _get_last_offer_time(consumer_id: str, pool: asyncpg.Pool) -> datetime | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT MAX(generated_at) AS last FROM offers WHERE consumer_id = $1",
            consumer_id,
        )
        return row["last"] if row and row["last"] else None


async def _get_active_rules(merchant_id: str, pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM campaign_rules WHERE merchant_id = $1 AND is_active = true",
            merchant_id,
        )
        return [dict(r) for r in rows]


async def _save_offer(offer: dict, pool: asyncpg.Pool) -> None:
    import json
    from datetime import datetime
    # Parse ISO strings back to datetime objects for asyncpg
    expires_at = offer["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    generated_at = offer["generated_at"]
    if isinstance(generated_at, str):
        generated_at = datetime.fromisoformat(generated_at)

    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO offers
               (id, merchant_id, consumer_id, context_state_id, content, visual_design,
                discount_percentage, expires_at, status, relevance_score,
                walking_distance_meters, walking_time_minutes, generated_at, generation_model)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
            offer["id"], offer["merchant_id"], offer["consumer_id"],
            offer["context_state_id"],
            json.dumps(offer["content"]), json.dumps(offer["visual_design"]),
            offer["discount_percentage"], expires_at,
            offer["status"], offer["relevance_score"],
            offer["walking_distance_meters"], offer["walking_time_minutes"],
            generated_at, offer["generation_model"],
        )

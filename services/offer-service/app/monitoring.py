"""
System health monitoring and alerting (Req 30).
Req 30.5: Alerts stored in system_alerts table and surfaced in the monitoring dashboard.
No external email/webhook needed — fully self-contained and free.
"""
import asyncpg
from gcw_utils import get_logger

logger = get_logger("offer-service:monitoring")

# Thresholds for Req 30.5
ERROR_RATE_THRESHOLD_PCT = 10.0
LATENCY_THRESHOLD_MS = 3000.0


async def record_metric(
    pool: asyncpg.Pool,
    service: str,
    metric_name: str,
    metric_value: float,
) -> None:
    """Records a metric to the health_metrics table."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO health_metrics (service, metric_name, metric_value, recorded_at)
                   VALUES ($1, $2, $3, NOW())""",
                service, metric_name, metric_value,
            )
    except Exception as exc:
        logger.error(f"Failed to record metric {metric_name}: {exc}")


async def raise_alert(
    pool: asyncpg.Pool,
    severity: str,
    service: str,
    message: str,
    metric_name: str | None = None,
    metric_value: float | None = None,
    threshold: float | None = None,
) -> None:
    """
    Req 30.5: Persists an alert to system_alerts table.
    Deduplicates — won't create a duplicate unacknowledged alert for the same message.
    """
    try:
        async with pool.acquire() as conn:
            existing = await conn.fetchrow(
                """SELECT id FROM system_alerts
                   WHERE service = $1 AND message = $2 AND acknowledged = false
                   AND created_at >= NOW() - INTERVAL '1 hour'""",
                service, message,
            )
            if existing:
                return  # already alerted recently

            await conn.execute(
                """INSERT INTO system_alerts
                   (severity, service, message, metric_name, metric_value, threshold)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                severity, service, message, metric_name, metric_value, threshold,
            )
            logger.error(f"ALERT [{severity.upper()}] {service}: {message}")
    except Exception as exc:
        logger.error(f"Failed to raise alert: {exc}")


async def check_and_alert(pool: asyncpg.Pool) -> list[dict]:
    """
    Req 30.5: Evaluates metrics and raises alerts for critical conditions.
    Returns list of active unacknowledged alerts.
    """
    try:
        async with pool.acquire() as conn:
            # Check error rate in last hour
            row = await conn.fetchrow(
                """SELECT
                    COUNT(*) FILTER (WHERE metric_value = 1) AS errors,
                    COUNT(*) AS total
                   FROM health_metrics
                   WHERE metric_name = 'generation_error'
                   AND recorded_at >= NOW() - INTERVAL '1 hour'"""
            )
            if row and (row["total"] or 0) > 0:
                error_rate = ((row["errors"] or 0) / row["total"]) * 100
                if error_rate > ERROR_RATE_THRESHOLD_PCT:
                    await raise_alert(
                        pool, "critical", "offer-service",
                        f"Offer generation error rate is {error_rate:.1f}% — exceeds {ERROR_RATE_THRESHOLD_PCT}% threshold",
                        metric_name="error_rate_pct",
                        metric_value=error_rate,
                        threshold=ERROR_RATE_THRESHOLD_PCT,
                    )

            # Check average latency
            latency_row = await conn.fetchrow(
                """SELECT AVG(metric_value) AS avg_latency
                   FROM health_metrics
                   WHERE metric_name = 'generation_latency_ms'
                   AND recorded_at >= NOW() - INTERVAL '1 hour'"""
            )
            if latency_row and latency_row["avg_latency"]:
                avg_latency = float(latency_row["avg_latency"])
                if avg_latency > LATENCY_THRESHOLD_MS:
                    await raise_alert(
                        pool, "warning", "offer-service",
                        f"Average generation latency is {avg_latency:.0f}ms — exceeds {LATENCY_THRESHOLD_MS}ms threshold",
                        metric_name="avg_generation_latency_ms",
                        metric_value=avg_latency,
                        threshold=LATENCY_THRESHOLD_MS,
                    )

            # Return all unacknowledged alerts
            alerts = await conn.fetch(
                """SELECT id, severity, service, message, metric_name,
                          metric_value, threshold, created_at
                   FROM system_alerts
                   WHERE acknowledged = false
                   ORDER BY created_at DESC
                   LIMIT 20"""
            )
            return [dict(a) for a in alerts]

    except Exception as exc:
        logger.error(f"Alert check failed: {exc}")
        return []

"""
Context aggregator — combines all signals into a CompositeContextState.
Req 6: composite state with AND/OR/NOT logic, relevance score, confluence property.
Req 3: holiday detection, time-of-day transitions.
Req 27: graceful degradation when sources fail.
"""
import asyncio
import json
from datetime import datetime, timezone
from uuid import uuid4

from gcw_utils import get_logger, get_time_of_day, get_day_type, haversine_distance, LatLng, estimate_walking_minutes
from .providers import weather, events, payone, holidays
from .city_config import load_city_config

logger = get_logger("context-service:aggregator")


async def aggregate_context(lat: float, lng: float, city_code: str) -> dict:
    """
    Fetches all context signals in parallel and builds a CompositeContextState.
    Individual provider failures are handled gracefully (Req 27.1).
    """
    config = load_city_config(city_code)
    merchants = config.get("merchants", [])
    country_code = config.get("countryCode", "DE")

    # Fetch all signals concurrently (Req 27: each failure is isolated)
    tasks = [
        weather.fetch_weather(lat, lng),
        events.fetch_nearby_events(lat, lng, radius_km=2.0),
        holidays.is_public_holiday(country_code=country_code),
        *[payone.get_transaction_density(m["id"], m.get("category", "default")) for m in merchants],
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    weather_signal = results[0] if not isinstance(results[0], Exception) else _default_weather()
    event_signals = results[1] if not isinstance(results[1], Exception) else []
    is_holiday = results[2] if not isinstance(results[2], Exception) else False
    density_signals = []
    for i, m in enumerate(merchants):
        r = results[3 + i]
        density_signals.append(r if not isinstance(r, Exception) else _default_density(m["id"]))

    if isinstance(results[0], Exception):
        logger.warning(f"Weather fetch failed: {results[0]}")
    if isinstance(results[1], Exception):
        logger.warning(f"Events fetch failed: {results[1]}")

    # Enrich density signals with walking distance (Req 2.4)
    for i, m in enumerate(merchants):
        dist = haversine_distance(LatLng(lat, lng), LatLng(m["lat"], m["lng"]))
        density_signals[i]["walking_distance_meters"] = round(dist)
        density_signals[i]["walking_time_minutes"] = estimate_walking_minutes(dist)

    now = datetime.now(timezone.utc)
    time_of_day = get_time_of_day(now.hour)
    day_type = get_day_type(now, is_holiday=bool(is_holiday))

    time_signal = {
        "local_time": now.isoformat(),
        "time_of_day": time_of_day,
        "day_type": day_type,
        "day_of_week": now.weekday(),
        "is_holiday": bool(is_holiday),
    }

    # Evaluate composite context state (Req 6)
    composite_rules = config.get("compositeRules", [])
    relevance_score = _evaluate_composite_rules(
        composite_rules, weather_signal, event_signals, density_signals, time_signal
    )

    state = {
        "id": str(uuid4()),
        "weather": weather_signal,
        "location": {
            "coordinates": {"lat": lat, "lng": lng},
            "accuracy": 50,
            "city": city_code,
            "fetched_at": now.isoformat(),
        },
        "time": time_signal,
        "events": event_signals,
        "transaction_density": density_signals,
        "relevance_score": relevance_score,
        "triggered_at": now.isoformat(),
    }

    # Req 6.4: log all context signals and evaluations
    logger.info("Context aggregated", extra={
        "city": city_code, "relevance_score": relevance_score,
        "weather_condition": weather_signal.get("condition"),
        "temperature": weather_signal.get("temperature"),
        "time_of_day": time_of_day, "day_type": day_type,
        "active_events": sum(1 for e in event_signals if e.get("is_active")),
        "low_demand_merchants": sum(1 for d in density_signals if d.get("is_low_demand")),
    })

    return state


def _evaluate_composite_rules(
    rules: list[dict],
    weather_signal: dict,
    event_signals: list,
    density_signals: list,
    time_signal: dict,
) -> int:
    """
    Evaluates composite context rules with AND/OR/NOT operators (Req 6.2).
    Confluence property: same signals in any order produce the same score (Req 6.5).
    """
    if not rules:
        return _default_relevance(weather_signal, event_signals, density_signals)

    # Build a signal context dict for rule evaluation
    ctx = {
        "temperature": weather_signal.get("temperature", 15),
        "condition": weather_signal.get("condition", "clear"),
        "precipitation": weather_signal.get("precipitation", False),
        "time_of_day": time_signal.get("time_of_day", "afternoon"),
        "day_type": time_signal.get("day_type", "weekday"),
        "is_holiday": time_signal.get("is_holiday", False),
        "has_active_event": any(e.get("is_active") for e in event_signals),
        "has_low_demand_merchant": any(d.get("is_low_demand") for d in density_signals),
    }

    total_score = 0
    matched_rules = 0
    for rule in rules:
        if _evaluate_rule(rule, ctx):
            total_score += rule.get("score", 20)
            matched_rules += 1

    if matched_rules == 0:
        return _default_relevance(weather_signal, event_signals, density_signals)

    return min(100, 30 + total_score)


def _evaluate_rule(rule: dict, ctx: dict) -> bool:
    """Evaluates a single composite rule with AND/OR/NOT operators."""
    op = rule.get("operator", "AND").upper()
    conditions = rule.get("conditions", [])

    if not conditions:
        return False

    results = [_evaluate_condition(c, ctx) for c in conditions]

    if op == "AND":
        return all(results)
    elif op == "OR":
        return any(results)
    elif op == "NOT":
        return not any(results)
    return False


def _evaluate_condition(condition: dict, ctx: dict) -> bool:
    """Evaluates a single condition against the context."""
    field = condition.get("field", "")
    op = condition.get("op", "eq")
    value = condition.get("value")
    ctx_value = ctx.get(field)

    if ctx_value is None:
        return False

    if op == "eq":
        return ctx_value == value
    elif op == "neq":
        return ctx_value != value
    elif op == "lt":
        return float(ctx_value) < float(value)
    elif op == "lte":
        return float(ctx_value) <= float(value)
    elif op == "gt":
        return float(ctx_value) > float(value)
    elif op == "gte":
        return float(ctx_value) >= float(value)
    elif op == "in":
        return ctx_value in value
    elif op == "is_true":
        return bool(ctx_value)
    return False


def _default_relevance(weather_signal: dict, event_signals: list, density_signals: list) -> int:
    """Fallback scoring when no composite rules are configured."""
    score = 30
    if any(d.get("is_low_demand") for d in density_signals):
        score += 30
    if any(e.get("is_active") for e in event_signals):
        score += 20
    if weather_signal.get("condition") in ("rain", "snow"):
        score += 10
    if weather_signal.get("temperature", 20) < 10:
        score += 10
    return min(100, score)


def _default_weather() -> dict:
    return {
        "temperature": 15.0, "condition": "clear",
        "precipitation": False, "humidity": 50,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _default_density(merchant_id: str) -> dict:
    return {
        "merchant_id": merchant_id, "current_density": 0,
        "typical_density": 0, "density_ratio": 1.0,
        "is_low_demand": False, "source": "default",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

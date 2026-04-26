"""Rule engine — selects campaign rules and calculates discount/expiry."""
import json
from datetime import datetime, timezone, timedelta


def select_best_rule(rules: list[dict], context: dict) -> dict | None:
    """Selects the most applicable active campaign rule for the current context."""
    now = datetime.now(timezone.utc)
    current_time_str = now.strftime("%H:%M")
    current_day = now.weekday()  # 0=Monday

    eligible = []
    for rule in rules:
        if not rule.get("is_active"):
            continue

        # target_days_of_week may be stored as JSON string from DB
        days = rule.get("target_days_of_week", [])
        if isinstance(days, str):
            try:
                days = json.loads(days)
            except (ValueError, TypeError):
                days = []

        if days and current_day not in days:
            continue

        windows = rule.get("target_time_windows", [])
        if isinstance(windows, str):
            try:
                windows = json.loads(windows)
            except (ValueError, TypeError):
                windows = []

        if windows:
            in_window = any(
                w.get("start", "00:00") <= current_time_str <= w.get("end", "23:59")
                for w in windows
            )
            if not in_window:
                continue

        eligible.append(rule)

    if not eligible:
        return None

    return max(eligible, key=lambda r: float(r.get("max_discount_percentage", 0)))


def calculate_discount(rule: dict, density_ratio: float) -> float:
    """
    Calculates optimal discount. Higher when demand is lower.
    Invariant: result is always <= rule.max_discount_percentage.
    """
    max_disc = float(rule.get("max_discount_percentage", 0))
    urgency = max(0.0, 1.0 - density_ratio)
    raw = max_disc * (0.5 + urgency * 0.5)
    return min(round(raw, 2), max_disc)


def calculate_expiry(context: dict) -> datetime:
    """
    Calculates offer expiry based on context urgency.
    Event starting soon → 30 min. Lunch rush → 45 min. Default → 2 hours.
    """
    now = datetime.now(timezone.utc)
    has_urgent_event = any(e.get("is_active") for e in context.get("events", []))
    is_lunch = context.get("time", {}).get("time_of_day") == "lunch"

    if has_urgent_event:
        return now + timedelta(minutes=30)
    if is_lunch:
        return now + timedelta(minutes=45)
    return now + timedelta(hours=2)

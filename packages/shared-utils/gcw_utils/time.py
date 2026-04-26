"""Time utilities for context signal processing."""
from datetime import datetime, timedelta
from typing import Literal

TimeOfDay = Literal["morning", "lunch", "afternoon", "evening", "night"]
DayType = Literal["weekday", "weekend", "holiday"]


def get_time_of_day(hour: int) -> TimeOfDay:
    """Maps an hour (0-23) to a named time-of-day category."""
    if 6 <= hour < 11:
        return "morning"
    if 11 <= hour < 14:
        return "lunch"
    if 14 <= hour < 18:
        return "afternoon"
    if 18 <= hour < 22:
        return "evening"
    return "night"


def get_day_type(dt: datetime, is_holiday: bool = False) -> DayType:
    """Returns weekday, weekend, or holiday for a given datetime."""
    if is_holiday:
        return "holiday"
    return "weekend" if dt.weekday() >= 5 else "weekday"


def is_within_refresh_window(last_fetch: datetime, now: datetime, window_minutes: int) -> bool:
    """Returns True if last_fetch is still within the refresh window."""
    return (now - last_fetch) < timedelta(minutes=window_minutes)


def format_countdown(seconds_remaining: int) -> str:
    """Formats a countdown in seconds to a human-readable string."""
    if seconds_remaining <= 0:
        return "Expired"
    minutes = seconds_remaining // 60
    seconds = seconds_remaining % 60
    if minutes == 0:
        return f"{seconds}s"
    return f"{minutes}m {seconds}s"

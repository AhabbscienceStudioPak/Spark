"""Tests for time utilities."""
import pytest
from datetime import datetime, timezone
from gcw_utils.time import get_time_of_day, get_day_type, format_countdown, is_within_refresh_window


@pytest.mark.parametrize("hour,expected", [
    (6, "morning"), (10, "morning"),
    (11, "lunch"), (13, "lunch"),
    (14, "afternoon"), (17, "afternoon"),
    (18, "evening"), (21, "evening"),
    (22, "night"), (3, "night"), (5, "night"),
])
def test_get_time_of_day(hour, expected):
    assert get_time_of_day(hour) == expected


def test_weekday():
    # Monday = weekday
    monday = datetime(2026, 4, 27, 12, 0, tzinfo=timezone.utc)  # Monday
    assert get_day_type(monday) == "weekday"


def test_weekend():
    saturday = datetime(2026, 4, 25, 12, 0, tzinfo=timezone.utc)  # Saturday
    assert get_day_type(saturday) == "weekend"


def test_holiday_overrides_weekday():
    monday = datetime(2026, 4, 27, 12, 0, tzinfo=timezone.utc)
    assert get_day_type(monday, is_holiday=True) == "holiday"


def test_format_countdown_minutes_and_seconds():
    assert format_countdown(125) == "2m 5s"


def test_format_countdown_seconds_only():
    assert format_countdown(45) == "45s"


def test_format_countdown_expired():
    assert format_countdown(0) == "Expired"
    assert format_countdown(-1) == "Expired"


def test_within_refresh_window_true():
    now = datetime.now(timezone.utc)
    last = datetime(now.year, now.month, now.day, now.hour, now.minute - 5, tzinfo=timezone.utc)
    assert is_within_refresh_window(last, now, window_minutes=15) is True


def test_outside_refresh_window():
    now = datetime.now(timezone.utc)
    last = datetime(now.year, now.month, now.day, now.hour - 1, now.minute, tzinfo=timezone.utc)
    assert is_within_refresh_window(last, now, window_minutes=15) is False

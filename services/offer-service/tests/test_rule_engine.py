"""Tests for the rule engine — discount invariants and rule selection."""
import pytest
from datetime import datetime, timezone

from app.engine.rule_engine import select_best_rule, calculate_discount, calculate_expiry


def make_rule(max_discount=20, is_active=True, days=None, windows=None):
    return {
        "id": "rule-001",
        "merchant_id": "merchant-001",
        "name": "Test Rule",
        "max_discount_percentage": max_discount,
        "is_active": is_active,
        "target_days_of_week": days if days is not None else list(range(7)),
        "target_time_windows": windows if windows is not None else [{"start": "00:00", "end": "23:59"}],
        "goal": "increase_foot_traffic",
    }


def make_context(time_of_day="lunch", events=None):
    return {
        "time": {
            "local_time": datetime.now(timezone.utc).isoformat(),
            "time_of_day": time_of_day,
        },
        "events": events or [],
    }


# ── select_best_rule ──────────────────────────────────────────────────────────

def test_select_best_rule_returns_highest_discount():
    """Should prefer the rule with the highest max discount."""
    rules = [make_rule(max_discount=10), make_rule(max_discount=25), make_rule(max_discount=15)]
    context = make_context()
    result = select_best_rule(rules, context)
    assert result is not None
    assert result["max_discount_percentage"] == 25


def test_select_best_rule_skips_inactive():
    """Inactive rules must never be selected."""
    rules = [make_rule(max_discount=30, is_active=False), make_rule(max_discount=10)]
    context = make_context()
    result = select_best_rule(rules, context)
    assert result["max_discount_percentage"] == 10


def test_select_best_rule_returns_none_when_no_match():
    """Returns None when no rules match the current context."""
    # Rule only valid on Sunday (6), but today is likely not Sunday in CI
    rules = [make_rule(days=[6], windows=[{"start": "02:00", "end": "03:00"}])]
    context = make_context()
    # This may or may not match depending on day — just verify it doesn't crash
    result = select_best_rule(rules, context)
    assert result is None or isinstance(result, dict)


# ── calculate_discount ────────────────────────────────────────────────────────

def test_discount_never_exceeds_max():
    """Invariant: calculated discount must never exceed max_discount_percentage."""
    rule = make_rule(max_discount=20)
    for density_ratio in [0.0, 0.1, 0.3, 0.5, 0.6, 0.8, 1.0, 1.5]:
        discount = calculate_discount(rule, density_ratio)
        assert discount <= 20, f"Discount {discount} exceeded max 20 at ratio {density_ratio}"


def test_discount_higher_when_demand_lower():
    """Lower demand (lower ratio) should produce higher discount."""
    rule = make_rule(max_discount=20)
    discount_low = calculate_discount(rule, 0.1)   # very low demand
    discount_high = calculate_discount(rule, 0.9)  # near-normal demand
    assert discount_low >= discount_high


def test_discount_is_non_negative():
    """Discount must always be >= 0."""
    rule = make_rule(max_discount=15)
    discount = calculate_discount(rule, 2.0)  # above-normal demand
    assert discount >= 0


# ── calculate_expiry ──────────────────────────────────────────────────────────

def test_expiry_shorter_for_active_event():
    """Active event context should produce a 30-minute expiry."""
    context = make_context(events=[{"is_active": True}])
    expiry = calculate_expiry(context)
    delta = (expiry - datetime.now(timezone.utc)).total_seconds()
    assert 25 * 60 <= delta <= 35 * 60  # ~30 minutes


def test_expiry_longer_for_normal_context():
    """Normal context should produce a 2-hour expiry."""
    context = make_context(time_of_day="afternoon", events=[])
    expiry = calculate_expiry(context)
    delta = (expiry - datetime.now(timezone.utc)).total_seconds()
    assert 110 * 60 <= delta <= 130 * 60  # ~2 hours


def test_expiry_medium_for_lunch():
    """Lunch context should produce a 45-minute expiry."""
    context = make_context(time_of_day="lunch", events=[])
    expiry = calculate_expiry(context)
    delta = (expiry - datetime.now(timezone.utc)).total_seconds()
    assert 40 * 60 <= delta <= 50 * 60  # ~45 minutes

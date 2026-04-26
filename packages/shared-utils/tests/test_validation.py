"""Tests for invariant validators."""
import pytest
from gcw_utils.validation import (
    is_valid_discount, is_valid_temperature,
    is_valid_relevance_score, is_valid_headline, is_valid_description,
)


# ── Discount invariant: 0 <= value <= 100 ────────────────────────────────────

@pytest.mark.parametrize("value", [0, 1, 50, 99.9, 100])
def test_valid_discounts(value):
    assert is_valid_discount(value) is True


@pytest.mark.parametrize("value", [-0.1, -1, 100.1, 101, float('inf'), float('nan')])
def test_invalid_discounts(value):
    assert is_valid_discount(value) is False


# ── Temperature invariant: -50 <= value <= 60 ────────────────────────────────

@pytest.mark.parametrize("value", [-50, -10, 0, 20, 37, 60])
def test_valid_temperatures(value):
    assert is_valid_temperature(value) is True


@pytest.mark.parametrize("value", [-50.1, -51, 60.1, 100, float('inf')])
def test_invalid_temperatures(value):
    assert is_valid_temperature(value) is False


# ── Relevance score invariant: 0 <= value <= 100 ─────────────────────────────

@pytest.mark.parametrize("value", [0, 1, 50, 99, 100])
def test_valid_relevance_scores(value):
    assert is_valid_relevance_score(value) is True


@pytest.mark.parametrize("value", [-1, 101, 200])
def test_invalid_relevance_scores(value):
    assert is_valid_relevance_score(value) is False


# ── Headline length: 10-150 chars ─────────────────────────────────────────────

def test_valid_headline():
    assert is_valid_headline("Warm up with 15% off") is True


def test_headline_too_short():
    assert is_valid_headline("Short") is False


def test_headline_too_long():
    assert is_valid_headline("x" * 151) is False


def test_headline_exact_min():
    assert is_valid_headline("x" * 10) is True


def test_headline_exact_max():
    assert is_valid_headline("x" * 150) is True


# ── Description length: 20-300 chars ─────────────────────────────────────────

def test_valid_description():
    assert is_valid_description("It's cold outside. Perfect time for a warm drink.") is True


def test_description_too_short():
    assert is_valid_description("Too short") is False


def test_description_too_long():
    assert is_valid_description("x" * 301) is False

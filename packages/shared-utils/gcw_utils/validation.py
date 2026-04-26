"""Invariant validators matching the requirements document."""


def is_valid_discount(value: float) -> bool:
    """Invariant: discount must be 0 <= value <= 100."""
    return isinstance(value, (int, float)) and 0 <= value <= 100


def is_valid_temperature(value: float) -> bool:
    """Invariant: temperature must be -50 <= value <= 60 (Celsius)."""
    return isinstance(value, (int, float)) and -50 <= value <= 60


def is_valid_relevance_score(value: int) -> bool:
    """Invariant: relevance score must be 0 <= value <= 100."""
    return isinstance(value, int) and 0 <= value <= 100


def is_valid_headline(text: str) -> bool:
    """Headline must be 10-150 characters."""
    return 10 <= len(text) <= 150


def is_valid_description(text: str) -> bool:
    """Description must be 20-300 characters."""
    return 20 <= len(text) <= 300

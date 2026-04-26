"""Tests for token utilities — round-trip property and entropy."""
import pytest
from gcw_utils.token import generate_offer_token, encode_qr_payload, decode_qr_payload


def test_token_length():
    """Token must be 32 hex characters (128-bit entropy)."""
    token = generate_offer_token()
    assert len(token) == 32


def test_token_is_hex():
    """Token must be a valid hex string."""
    token = generate_offer_token()
    int(token, 16)  # raises ValueError if not valid hex


def test_tokens_are_unique():
    """Two generated tokens must not be equal (probabilistic)."""
    tokens = {generate_offer_token() for _ in range(100)}
    assert len(tokens) == 100


def test_qr_payload_round_trip():
    """Round-trip property: decode(encode(payload)) == payload."""
    payload = {
        "t": "abc123def456",
        "o": "offer-001",
        "m": "merchant-001",
        "d": 15.0,
        "exp": "2026-04-26T12:00:00Z",
        "ts": 1714128000,
    }
    encoded = encode_qr_payload(payload)
    decoded = decode_qr_payload(encoded)
    assert decoded == payload


def test_qr_payload_is_url_safe():
    """Encoded QR payload must only contain URL-safe characters."""
    payload = {"t": "abc", "d": 15.5, "nested": {"key": "value"}}
    encoded = encode_qr_payload(payload)
    # URL-safe base64 uses A-Z, a-z, 0-9, -, _, =
    import re
    assert re.match(r'^[A-Za-z0-9\-_=]+$', encoded)


def test_qr_payload_handles_unicode():
    """QR payload should handle unicode content correctly."""
    payload = {"headline": "Wärme dich auf ☕", "city": "Stuttgart"}
    encoded = encode_qr_payload(payload)
    decoded = decode_qr_payload(encoded)
    assert decoded["headline"] == "Wärme dich auf ☕"

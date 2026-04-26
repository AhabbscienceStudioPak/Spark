"""Cryptographic token utilities. Round-trip property: decode(encode(x)) == x."""
import secrets
import base64
import json
from typing import Any


def generate_offer_token() -> str:
    """Generates a cryptographically secure token with 128-bit entropy."""
    return secrets.token_hex(16)  # 16 bytes = 128 bits = 32 hex chars


def encode_qr_payload(payload: dict[str, Any]) -> str:
    """Encodes a dict payload to a URL-safe base64 string for QR codes."""
    json_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(json_bytes).decode("ascii")


def decode_qr_payload(encoded: str) -> dict[str, Any]:
    """Decodes a URL-safe base64 QR payload back to a dict."""
    json_bytes = base64.urlsafe_b64decode(encoded.encode("ascii"))
    return json.loads(json_bytes.decode("utf-8"))

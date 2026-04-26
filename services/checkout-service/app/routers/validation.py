"""
Token validation with fraud detection logging (Req 19.5).
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
import asyncpg

from gcw_utils import get_logger
from ..db import get_pool

router = APIRouter(prefix="/api/v1/validate", tags=["Validation"])
logger = get_logger("checkout-service:validation")


class ValidateRequest(BaseModel):
    token: str
    merchant_id: str


@router.post("/token")
async def validate_token(body: ValidateRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """
    Merchant scans QR code — validates token within 2 seconds (Req 19.1).
    Logs all validation attempts for fraud detection (Req 19.5).
    """
    now = datetime.now(timezone.utc)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM offer_tokens WHERE token = $1", body.token
        )

        # Req 19.5: log every validation attempt
        result_code = "unknown"
        if not row:
            result_code = "NOT_FOUND"
        elif row["redeemed_at"]:
            result_code = "ALREADY_REDEEMED"
        elif row["expires_at"] < now:
            result_code = "EXPIRED"
        elif str(row["merchant_id"]) != body.merchant_id:
            result_code = "WRONG_MERCHANT"
        else:
            result_code = "VALID"

        await conn.execute(
            """INSERT INTO validation_log
               (token, merchant_id, result_code, validated_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING""",
            body.token[:32], body.merchant_id, result_code, now,
        )

    logger.info(f"Token validation: {result_code}", extra={
        "token_prefix": body.token[:8],
        "merchant_id": body.merchant_id[:8],
        "result": result_code,
    })

    if result_code == "NOT_FOUND":
        return {"success": False, "data": {"is_valid": False, "error_code": "NOT_FOUND", "error_message": "Token not found"}}
    if result_code == "ALREADY_REDEEMED":
        return {"success": False, "data": {"is_valid": False, "error_code": "ALREADY_REDEEMED", "error_message": "Offer already redeemed"}}
    if result_code == "EXPIRED":
        return {"success": False, "data": {"is_valid": False, "error_code": "EXPIRED", "error_message": "Offer has expired"}}
    if result_code == "WRONG_MERCHANT":
        return {"success": False, "data": {"is_valid": False, "error_code": "INVALID_TOKEN", "error_message": "Token not valid for this merchant"}}

    return {
        "success": True,
        "data": {
            "is_valid": True,
            "offer_id": str(row["offer_id"]),
            "discount_percentage": float(row["discount_percentage"]),
            "expires_at": row["expires_at"].isoformat(),
        },
    }

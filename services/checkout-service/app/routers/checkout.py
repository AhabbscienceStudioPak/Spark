from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from uuid import uuid4
import asyncpg

from gcw_utils import generate_offer_token, encode_qr_payload, get_logger
from ..db import get_pool
from ..config import settings

router = APIRouter(prefix="/api/v1/checkout", tags=["Checkout"])
logger = get_logger("checkout-service:checkout")


class AcceptRequest(BaseModel):
    offer_id: str
    consumer_id: str


class CompleteRequest(BaseModel):
    token: str
    original_price: float


class DismissRequest(BaseModel):
    offer_id: str
    consumer_id: str
    reason: str


@router.post("/accept", status_code=201)
async def accept_offer(body: AcceptRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Consumer accepts an offer — generates a unique token and QR payload."""
    async with pool.acquire() as conn:
        # Prevent duplicate acceptance
        existing = await conn.fetchrow(
            "SELECT token FROM offer_tokens WHERE offer_id = $1", body.offer_id
        )
        if existing:
            raise HTTPException(status_code=409, detail="Offer already accepted")

        offer = await conn.fetchrow(
            "SELECT merchant_id, discount_percentage, expires_at FROM offers WHERE id = $1",
            body.offer_id,
        )
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")

        token = generate_offer_token()
        await conn.execute(
            """INSERT INTO offer_tokens
               (token, offer_id, consumer_id, merchant_id, discount_percentage, expires_at)
               VALUES ($1,$2,$3,$4,$5,$6)""",
            token, body.offer_id, body.consumer_id,
            str(offer["merchant_id"]), offer["discount_percentage"], offer["expires_at"],
        )

    qr_payload = encode_qr_payload({
        "t": token,
        "o": body.offer_id,
        "m": str(offer["merchant_id"]),
        "d": float(offer["discount_percentage"]),
        "exp": offer["expires_at"].isoformat(),
        "ts": int(datetime.now(timezone.utc).timestamp()),
    })

    return {
        "success": True,
        "data": {
            "token": token,
            "offer_id": body.offer_id,
            "merchant_id": str(offer["merchant_id"]),
            "discount_percentage": float(offer["discount_percentage"]),
            "expires_at": offer["expires_at"].isoformat(),
            "qr_payload": qr_payload,
        },
    }


@router.post("/complete")
async def complete_checkout(body: CompleteRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Merchant completes simulated checkout — marks token as redeemed."""
    async with pool.acquire() as conn:
        token_row = await conn.fetchrow(
            "SELECT * FROM offer_tokens WHERE token = $1", body.token
        )
        if not token_row:
            raise HTTPException(status_code=404, detail="Token not found")
        if token_row["redeemed_at"]:
            raise HTTPException(status_code=409, detail="Already redeemed")
        if token_row["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Token expired")

        now = datetime.now(timezone.utc)
        discount_amount = body.original_price * float(token_row["discount_percentage"]) / 100
        final_price = body.original_price - discount_amount

        await conn.execute(
            "UPDATE offer_tokens SET redeemed_at=$1, is_valid=false WHERE token=$2",
            now, body.token,
        )
        record_id = str(uuid4())
        await conn.execute(
            """INSERT INTO redemptions
               (id, offer_id, consumer_id, merchant_id, original_price,
                discount_amount, final_price, redeemed_at, cashback_credited)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)""",
            record_id, str(token_row["offer_id"]), token_row["consumer_id"],
            str(token_row["merchant_id"]), body.original_price,
            discount_amount, final_price, now, settings.cashback_mode,
        )

        # Req 20.5: credit cashback to consumer wallet balance
        if settings.cashback_mode:
            await conn.execute(
                """INSERT INTO consumer_wallets (consumer_id, balance, updated_at)
                   VALUES ($1, $2, NOW())
                   ON CONFLICT (consumer_id) DO UPDATE
                   SET balance = consumer_wallets.balance + $2, updated_at = NOW()""",
                token_row["consumer_id"], discount_amount,
            )

    logger.info(f"Offer redeemed: {token_row['offer_id']}, final price: {final_price}")
    return {
        "success": True,
        "data": {
            "id": record_id,
            "original_price": body.original_price,
            "discount_amount": discount_amount,
            "final_price": final_price,
            "redeemed_at": now.isoformat(),
            "cashback_credited": settings.cashback_mode,
        },
    }


@router.post("/dismiss")
async def dismiss_offer(body: DismissRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Consumer dismisses an offer. Reason stored for preference learning."""
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO dismissals (offer_id, consumer_id, reason)
               VALUES ($1,$2,$3) ON CONFLICT DO NOTHING""",
            body.offer_id, body.consumer_id, body.reason,
        )
    return {"success": True}


@router.get("/wallet/{consumer_id}")
async def get_wallet_balance(consumer_id: str, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Returns the consumer's cashback wallet balance."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT balance FROM consumer_wallets WHERE consumer_id = $1",
            consumer_id,
        )
    balance = float(row["balance"]) if row else 0.0
    return {"success": True, "data": {"consumer_id": consumer_id, "balance": balance}}

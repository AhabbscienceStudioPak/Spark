from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class RedemptionRecord(BaseModel):
    id: UUID
    offer_id: UUID
    consumer_id: str
    merchant_id: UUID
    original_price: float = Field(..., gt=0)
    discount_amount: float = Field(..., ge=0)
    final_price: float = Field(..., ge=0)
    redeemed_at: datetime
    cashback_credited: bool = False


class ValidationResult(BaseModel):
    is_valid: bool
    offer_id: Optional[UUID] = None
    discount_percentage: Optional[float] = None
    expires_at: Optional[datetime] = None
    error_code: Optional[Literal["INVALID_TOKEN", "EXPIRED", "ALREADY_REDEEMED", "NOT_FOUND"]] = None
    error_message: Optional[str] = None


class OfferHistoryEntry(BaseModel):
    offer_id: UUID
    merchant_name: str
    discount_percentage: float
    accepted_at: datetime
    redeemed_at: Optional[datetime] = None
    status: Literal["accepted", "redeemed", "expired"]
    savings_amount: Optional[float] = None

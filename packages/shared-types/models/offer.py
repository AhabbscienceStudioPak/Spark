from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID

OfferStatus = Literal[
    "pending_approval", "active", "accepted", "redeemed",
    "expired", "rejected", "dismissed"
]

BackgroundStyle = Literal["warm", "cool", "energetic", "calm", "festive"]
LayoutStyle = Literal["compact", "expanded", "banner"]


class OfferContent(BaseModel):
    headline: str = Field(..., min_length=10, max_length=150)
    description: str = Field(..., min_length=20, max_length=300)
    call_to_action: str
    language: str = "de"


class OfferVisualDesign(BaseModel):
    primary_color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    background_style: BackgroundStyle
    imagery_keywords: list[str] = []
    layout_style: LayoutStyle = "compact"


class GeneratedOffer(BaseModel):
    id: UUID
    merchant_id: UUID
    consumer_id: Optional[str] = None
    context_state_id: UUID
    content: OfferContent
    visual_design: OfferVisualDesign
    discount_percentage: float = Field(..., ge=0, le=100, description="Invariant: 0-100")
    expires_at: datetime
    status: OfferStatus = "active"
    relevance_score: int = Field(..., ge=0, le=100)
    walking_distance_meters: float = 0
    walking_time_minutes: int = 0
    generated_at: datetime
    generation_model: str


class OfferToken(BaseModel):
    token: str
    offer_id: UUID
    consumer_id: str
    merchant_id: UUID
    discount_percentage: float = Field(..., ge=0, le=100)
    expires_at: datetime
    redeemed_at: Optional[datetime] = None
    is_valid: bool = True


class DismissalReason(BaseModel):
    offer_id: UUID
    reason: Literal["not_interested_merchant", "not_interested_product", "bad_timing", "other"]
    dismissed_at: datetime

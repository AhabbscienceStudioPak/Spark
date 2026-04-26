from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

NotificationChannel = Literal["push", "in_app", "lock_screen", "home_banner"]


class ConsumerPreferences(BaseModel):
    preferred_channels: list[NotificationChannel] = ["in_app"]
    max_offers_per_day: int = Field(default=5, ge=1, le=10)
    language: str = "de"
    do_not_disturb: bool = False


class Consumer(BaseModel):
    id: UUID
    anonymized_id: str  # used in QR codes — no PII
    preferences: ConsumerPreferences
    wallet_balance: float = 0.0  # simulated cashback
    consent_given: bool = False
    consent_given_at: Optional[datetime] = None
    created_at: datetime


class IntentSignal(BaseModel):
    """Abstract preference signal sent upstream — no raw behavioral data (GDPR)."""
    consumer_id: UUID
    intent_category: str  # e.g. "warm_beverages", "quick_lunch"
    strength: float = Field(..., ge=0, le=1)
    generated_at: datetime

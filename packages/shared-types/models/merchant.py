from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID
from .common import Coordinates

MerchantCategory = Literal["cafe", "restaurant", "retail", "bakery", "bar", "gym", "pharmacy", "other"]
DayOfWeek = Literal[0, 1, 2, 3, 4, 5, 6]  # 0 = Sunday


class OperatingHours(BaseModel):
    day_of_week: DayOfWeek
    open_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    close_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")


class TimeWindow(BaseModel):
    start: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end: str = Field(..., pattern=r"^\d{2}:\d{2}$")


class CampaignRule(BaseModel):
    id: UUID
    merchant_id: UUID
    name: str
    max_discount_percentage: float = Field(..., ge=0, le=100, description="Invariant: 0-100")
    target_time_windows: list[TimeWindow] = []
    target_days_of_week: list[DayOfWeek] = []
    eligible_categories: list[str] = []
    goal: Literal["increase_foot_traffic", "clear_inventory", "boost_category"]
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class Merchant(BaseModel):
    id: UUID
    name: str
    category: MerchantCategory
    location: Coordinates
    address: str
    city: str
    geo_fence_radius_meters: int = Field(default=500, gt=0)
    operating_hours: list[OperatingHours] = []
    campaign_rules: list[CampaignRule] = []
    offer_preview_mode: bool = False
    is_active: bool = True
    onboarded_at: datetime


class MerchantPerformanceMetrics(BaseModel):
    merchant_id: UUID
    total_offers_generated: int
    acceptance_rate: float = Field(..., ge=0, le=1)
    redemption_rate: float = Field(..., ge=0, le=1)
    average_discount_given: float
    total_discount_amount: float
    estimated_incremental_revenue: float
    period_start: datetime
    period_end: datetime

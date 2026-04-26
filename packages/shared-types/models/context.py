from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID
from .common import Coordinates

WeatherCondition = Literal["clear", "rain", "snow", "clouds", "fog", "storm"]
TimeOfDay = Literal["morning", "lunch", "afternoon", "evening", "night"]
DayType = Literal["weekday", "weekend", "holiday"]


class WeatherSignal(BaseModel):
    temperature: float = Field(..., ge=-50, le=60, description="Celsius, invariant: -50 to 60")
    condition: WeatherCondition
    precipitation: bool
    humidity: float = Field(..., ge=0, le=100)
    fetched_at: datetime


class LocationSignal(BaseModel):
    coordinates: Coordinates
    accuracy: float = Field(..., gt=0, description="Accuracy in meters")
    city: str
    neighborhood: Optional[str] = None
    fetched_at: datetime


class TimeSignal(BaseModel):
    local_time: datetime
    time_of_day: TimeOfDay
    day_type: DayType
    day_of_week: int = Field(..., ge=0, le=6, description="0=Sunday")
    is_holiday: bool


class EventSignal(BaseModel):
    id: str
    name: str
    type: Literal["concert", "sports", "festival", "conference", "other"]
    start_time: datetime
    estimated_attendance: int = Field(..., ge=0)
    distance_meters: float = Field(..., ge=0)
    is_active: bool  # starts within 2 hours


class TransactionDensitySignal(BaseModel):
    merchant_id: str
    current_density: float = Field(..., ge=0)
    typical_density: float = Field(..., ge=0)
    density_ratio: float = Field(..., ge=0)
    is_low_demand: bool  # ratio < 0.6
    updated_at: datetime


class CompositeContextState(BaseModel):
    id: UUID
    weather: WeatherSignal
    location: LocationSignal
    time: TimeSignal
    events: list[EventSignal] = []
    transaction_density: list[TransactionDensitySignal] = []
    relevance_score: int = Field(..., ge=0, le=100)
    triggered_at: datetime

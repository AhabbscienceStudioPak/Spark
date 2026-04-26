"""
Demo mode — forces the "Mia scenario" for hackathon presentations.
POST /api/v1/context/demo  →  returns a pre-built context state:
  cold (11°C) + overcast + Tuesday lunch + Café Müller at 30% typical traffic
"""
from fastapi import APIRouter
from datetime import datetime, timezone
from uuid import uuid4

router = APIRouter(prefix="/api/v1/context", tags=["Demo"])

DEMO_CONTEXT = {
    "weather": {
        "temperature": 11.0,
        "condition": "clouds",
        "precipitation": False,
        "humidity": 72,
        "fetched_at": None,  # filled at request time
    },
    "location": {
        "coordinates": {"lat": 48.7758, "lng": 9.1829},
        "accuracy": 50,
        "city": "stuttgart",
        "fetched_at": None,
    },
    "time": {
        "time_of_day": "lunch",
        "day_type": "weekday",
        "day_of_week": 1,  # Tuesday
        "is_holiday": False,
    },
    "events": [],
    "transaction_density": [
        {
            "merchant_id": "d4f7505e-a533-4a3f-85e6-3ae8090e62b1",
            "merchant_name": "Café Müller",
            "current_density": 3,
            "typical_density": 12,
            "density_ratio": 0.25,
            "is_low_demand": True,
            "walking_distance_meters": 80,
            "walking_time_minutes": 1,
            "source": "demo",
        }
    ],
    "relevance_score": 90,
}


@router.post("/demo")
async def demo_context() -> dict:
    """
    Returns the canonical demo context state (Mia scenario):
    11°C + overcast + Tuesday lunch + Café Müller at 25% typical traffic.
    Use this for live demos to guarantee offer generation regardless of real conditions.
    """
    now = datetime.now(timezone.utc).isoformat()
    state = {
        **DEMO_CONTEXT,
        "id": str(uuid4()),
        "triggered_at": now,
        "weather": {**DEMO_CONTEXT["weather"], "fetched_at": now},
        "location": {**DEMO_CONTEXT["location"], "fetched_at": now},
        "time": {**DEMO_CONTEXT["time"], "local_time": now},
    }
    return {"success": True, "data": state, "demo_mode": True}

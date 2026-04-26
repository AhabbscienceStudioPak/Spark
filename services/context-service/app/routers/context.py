from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..aggregator import aggregate_context
from ..providers import payone

router = APIRouter(prefix="/api/v1/context", tags=["Context"])


class AggregateRequest(BaseModel):
    lat: float
    lng: float
    city_code: str


@router.post("/aggregate")
async def aggregate(body: AggregateRequest) -> dict:
    """Builds a CompositeContextState for the given location and city."""
    try:
        state = await aggregate_context(body.lat, body.lng, body.city_code)
        return {"success": True, "data": state}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {exc}")


@router.get("/transaction-density/{merchant_id}")
async def transaction_density(merchant_id: str) -> dict:
    """Returns the current transaction density signal for a merchant."""
    density = await payone.get_transaction_density(merchant_id)
    return {"success": True, "data": density}


@router.get("/cities")
async def list_cities() -> dict:
    """Lists all configured cities (Req 25.2)."""
    import os
    from ..config import settings
    from ..city_config import load_city_config
    config_dir = settings.city_config_dir
    cities = []
    if os.path.isdir(config_dir):
        for fname in os.listdir(config_dir):
            if fname.endswith(".yaml"):
                city_code = fname.replace(".yaml", "")
                try:
                    cfg = load_city_config(city_code)
                    cities.append({
                        "code": city_code,
                        "name": cfg.get("displayName", city_code),
                        "geo_fence_radius_meters": cfg.get("defaultGeoFenceRadiusMeters", 500),
                    })
                except Exception:
                    pass
    return {"success": True, "data": cities}

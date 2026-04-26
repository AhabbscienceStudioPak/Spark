"""
Notification Service — Expo push notifications.
Endpoints:
  POST /api/v1/notifications/push          — send a push notification
  POST /api/v1/notifications/register      — register a consumer's push token
  DELETE /api/v1/notifications/register/{consumer_id} — unregister token
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .push import send_offer_notification
from gcw_utils import get_logger

logger = get_logger("notification-service")

# In-memory token store for MVP (production: use Redis or DB)
_push_tokens: dict[str, str] = {}  # consumer_id → expo_push_token

app = FastAPI(
    title="Generative City Wallet — Notification Service",
    version="1.0.0",
)


class PushRequest(BaseModel):
    expo_push_token: str
    offer_id: str
    headline: str
    discount_percentage: float


class RegisterRequest(BaseModel):
    consumer_id: str
    expo_push_token: str


class NotifyConsumerRequest(BaseModel):
    consumer_id: str
    offer_id: str
    headline: str
    discount_percentage: float


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "notification-service",
        "registered_tokens": len(_push_tokens),
    }


@app.post("/api/v1/notifications/register", status_code=201)
async def register_token(body: RegisterRequest) -> dict:
    """Registers a consumer's Expo push token for offer notifications."""
    _push_tokens[body.consumer_id] = body.expo_push_token
    logger.info(f"Push token registered for consumer {body.consumer_id[:8]}…")
    return {"success": True, "message": "Push token registered"}


@app.delete("/api/v1/notifications/register/{consumer_id}")
async def unregister_token(consumer_id: str) -> dict:
    """Removes a consumer's push token (e.g. on logout)."""
    _push_tokens.pop(consumer_id, None)
    return {"success": True}


@app.post("/api/v1/notifications/push")
async def push_notification(body: PushRequest) -> dict:
    """Sends a push notification to a specific Expo push token."""
    try:
        await send_offer_notification(
            body.expo_push_token, body.offer_id,
            body.headline, body.discount_percentage,
        )
        return {"success": True}
    except Exception as exc:
        logger.error(f"Push notification failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Push failed: {exc}")


@app.post("/api/v1/notifications/notify")
async def notify_consumer(body: NotifyConsumerRequest) -> dict:
    """
    Sends a push notification to a consumer by their ID.
    Looks up their registered Expo push token automatically.
    """
    token = _push_tokens.get(body.consumer_id)
    if not token:
        # Consumer hasn't registered a push token — silently skip
        logger.info(f"No push token for consumer {body.consumer_id[:8]}…, skipping")
        return {"success": True, "sent": False, "reason": "no_token"}

    try:
        await send_offer_notification(token, body.offer_id, body.headline, body.discount_percentage)
        return {"success": True, "sent": True}
    except Exception as exc:
        logger.error(f"Push notification failed for consumer {body.consumer_id[:8]}…: {exc}")
        return {"success": False, "sent": False, "reason": str(exc)}

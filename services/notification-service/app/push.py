"""Expo push notification sender via HTTP API."""
import httpx
from gcw_utils import get_logger

logger = get_logger("notification-service:push")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_offer_notification(
    expo_push_token: str,
    offer_id: str,
    headline: str,
    discount_percentage: float,
) -> None:
    """Sends an offer push notification via the Expo push API."""
    if not expo_push_token.startswith("ExponentPushToken["):
        logger.warning(f"Invalid Expo push token format: {expo_push_token[:20]}...")
        return

    payload = {
        "to": expo_push_token,
        "sound": "default",
        "title": f"{int(discount_percentage)}% off — right now",
        "body": headline,
        "data": {"offerId": offer_id},
        "ttl": 3600,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(EXPO_PUSH_URL, json=payload)
        response.raise_for_status()

    logger.info(f"Push notification sent for offer {offer_id}")

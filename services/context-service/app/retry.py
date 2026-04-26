"""Exponential backoff retry utility (Req 27.3)."""
import asyncio
from typing import TypeVar, Callable, Awaitable
from gcw_utils import get_logger
from .config import settings

logger = get_logger("context-service:retry")
T = TypeVar("T")


async def with_retry(
    fn: Callable[[], Awaitable[T]],
    label: str,
    max_attempts: int | None = None,
    base_delay: float | None = None,
    max_delay: float | None = None,
) -> T:
    """
    Retries an async function with exponential backoff: 1s, 2s, 4s, 8s … max 60s.
    Raises the last exception if all attempts fail.
    """
    attempts = max_attempts or settings.retry_max_attempts
    delay = base_delay or settings.retry_base_delay
    ceiling = max_delay or settings.retry_max_delay

    last_exc: Exception = RuntimeError("No attempts made")
    for attempt in range(1, attempts + 1):
        try:
            return await fn()
        except Exception as exc:
            last_exc = exc
            if attempt == attempts:
                logger.error(f"{label} failed after {attempts} attempts: {exc}")
                raise
            wait = min(delay * (2 ** (attempt - 1)), ceiling)
            logger.warning(f"{label} attempt {attempt} failed ({exc}), retrying in {wait:.1f}s")
            await asyncio.sleep(wait)

    raise last_exc

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .db import get_pool, close_pool
from .routers import offers, merchants, onboarding, analytics


async def _expire_offers_loop(pool):
    """Background task: expire stale offers every 10 seconds (Req 26.1)."""
    import asyncpg
    while True:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE offers SET status='expired', updated_at=NOW()
                       WHERE status IN ('active','pending_approval') AND expires_at < NOW()"""
                )
        except Exception:
            pass
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await get_pool()
    task = asyncio.create_task(_expire_offers_loop(pool))
    yield
    task.cancel()
    await close_pool()


app = FastAPI(
    title="Generative City Wallet — Offer Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.get("/health")(lambda: {"status": "ok", "service": "offer-service"})
app.include_router(offers.router)
app.include_router(merchants.router)
app.include_router(onboarding.router)
app.include_router(analytics.router)

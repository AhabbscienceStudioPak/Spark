from contextlib import asynccontextmanager
from fastapi import FastAPI
from .db import get_pool, close_pool
from .routers import checkout, validation, gdpr


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(
    title="Generative City Wallet — Checkout Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.get("/health")(lambda: {"status": "ok", "service": "checkout-service"})
app.include_router(checkout.router)
app.include_router(validation.router)
app.include_router(gdpr.router)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime

from .config import settings
from .auth import verify_token
from .proxy import proxy_request
from .db import get_pool, close_pool
from .routers.auth import router as auth_router

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(
    title="Generative City Wallet — API Gateway",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow all localhost origins (dev) + configured origins
_origins = settings.allowed_origins.split(",")
_dev_origins = [
    "http://localhost:3010",   # merchant-web
    "http://localhost:3000",
    "http://localhost:8081",   # Expo web
    "http://192.168.10.5:8081",
    "http://192.168.10.5:3000",
]
_all_origins = list(set(_origins + _dev_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Public routes ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "service": "api-gateway", "timestamp": datetime.utcnow().isoformat()}


app.include_router(auth_router)


# ── Protected proxy routes ────────────────────────────────────────────────────

# Context
@app.api_route("/api/v1/context", methods=["GET", "POST"], tags=["Context"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_context_root(request: Request) -> object:
    return await proxy_request(request, f"{settings.context_service_url}/api/v1/context")

@app.api_route("/api/v1/context/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["Context"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_context(request: Request, path: str) -> object:
    return await proxy_request(request, f"{settings.context_service_url}/api/v1/context/{path}")


# Offers — root (list) + path
@app.api_route("/api/v1/offers", methods=["GET", "POST"], tags=["Offers"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_offers_root(request: Request) -> object:
    return await proxy_request(request, f"{settings.offer_service_url}/api/v1/offers")

@app.api_route("/api/v1/offers/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["Offers"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_offers(request: Request, path: str) -> object:
    return await proxy_request(request, f"{settings.offer_service_url}/api/v1/offers/{path}")


# Merchants
@app.api_route("/api/v1/merchants", methods=["GET", "POST"], tags=["Merchants"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_merchants_root(request: Request) -> object:
    return await proxy_request(request, f"{settings.offer_service_url}/api/v1/merchants")

@app.api_route("/api/v1/merchants/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["Merchants"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_merchants(request: Request, path: str) -> object:
    return await proxy_request(request, f"{settings.offer_service_url}/api/v1/merchants/{path}")


# Checkout
@app.api_route("/api/v1/checkout/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], tags=["Checkout"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_checkout(request: Request, path: str) -> object:
    return await proxy_request(request, f"{settings.checkout_service_url}/api/v1/checkout/{path}")


# Validation
@app.api_route("/api/v1/validate/{path:path}", methods=["GET", "POST"], tags=["Validation"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_validate(request: Request, path: str) -> object:
    return await proxy_request(request, f"{settings.checkout_service_url}/api/v1/validate/{path}")


# GDPR
@app.api_route("/api/v1/gdpr/{path:path}", methods=["GET", "DELETE"], tags=["GDPR"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_gdpr(request: Request, path: str) -> object:
    return await proxy_request(request, f"{settings.checkout_service_url}/api/v1/gdpr/{path}")


# Analytics
@app.api_route("/api/v1/analytics", methods=["GET", "POST"], tags=["Analytics"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_analytics_root(request: Request) -> object:
    return await proxy_request(request, f"{settings.offer_service_url}/api/v1/analytics")

@app.api_route("/api/v1/analytics/{path:path}", methods=["GET", "POST"], tags=["Analytics"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_analytics(request: Request, path: str) -> object:
    return await proxy_request(request, f"{settings.offer_service_url}/api/v1/analytics/{path}")


# Notifications
@app.api_route("/api/v1/notifications/{path:path}", methods=["GET", "POST", "DELETE"], tags=["Notifications"], dependencies=[Depends(verify_token)])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def proxy_notifications(request: Request, path: str) -> object:
    return await proxy_request(request, f"{settings.notification_service_url}/api/v1/notifications/{path}")

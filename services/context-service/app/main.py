from fastapi import FastAPI
from contextlib import asynccontextmanager
from .config import settings, validate_settings
from .city_config import validate_all_city_configs
from .routers import context, health, demo


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Req 7.5, 25.4: fail startup with descriptive errors on bad config
    validate_settings(settings)
    validate_all_city_configs(settings.city_config_dir)
    yield


app = FastAPI(
    title="Generative City Wallet — Context Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(context.router)
app.include_router(demo.router)

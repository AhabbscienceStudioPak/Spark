from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jwt_secret: str
    jwt_access_expire_minutes: int = 60        # 1 hour access token
    jwt_refresh_expire_days: int = 30          # 30 day refresh token
    allowed_origins: str = "*"
    database_url: str = "postgresql://gcw_user:password@postgres:5432/gcw"
    context_service_url: str = "http://context-service:3001"
    offer_service_url: str = "http://offer-service:3002"
    checkout_service_url: str = "http://checkout-service:3003"
    notification_service_url: str = "http://notification-service:3004"
    rate_limit_per_minute: int = 60

    class Config:
        env_file = ".env"


settings = Settings()

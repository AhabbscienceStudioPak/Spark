from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://gcw_user:password@localhost:5432/gcw"
    redis_url: str = "redis://localhost:6379"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:1.7b"
    notification_service_url: str = "http://notification-service:3004"
    max_offers_per_consumer_per_day: int = 10
    min_offer_interval_hours: int = 1

    class Config:
        env_file = ".env"


settings = Settings()

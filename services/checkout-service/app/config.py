from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://gcw_user:password@localhost:5432/gcw"
    redis_url: str = "redis://localhost:6379"
    cashback_mode: bool = False

    class Config:
        env_file = ".env"


settings = Settings()

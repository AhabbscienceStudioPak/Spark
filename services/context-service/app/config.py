from pydantic_settings import BaseSettings
import sys
import os


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379"
    # "open-meteo" (free, no key) | "openweathermap" | "dwd"
    weather_source: str = "open-meteo"
    weather_api_key: str = ""
    open_meteo_url: str = "https://api.open-meteo.com/v1"
    owm_api_url: str = "https://api.openweathermap.org/data/2.5"
    dwd_api_url: str = "https://api.brightsky.dev"
    # Events: "overpass" (free OSM) | "eventbrite"
    events_source: str = "overpass"
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    eventbrite_api_key: str = ""
    eventbrite_private_token: str = ""  # use this for Bearer auth (preferred)
    eventbrite_api_url: str = "https://www.eventbriteapi.com/v3"
    # Holidays: Nager.Date (free, no key)
    holidays_url: str = "https://date.nager.at/api/v3"
    holiday_country_code: str = "DE"
    # Payone simulator
    payone_api_url: str = "http://payone-simulator:4000"
    payone_api_key: str = ""
    city_config_dir: str = "/app/config/cities"
    # Weather cache TTL in seconds (30 minutes)
    weather_cache_ttl: int = 1800
    # Retry settings
    retry_max_attempts: int = 4
    retry_base_delay: float = 1.0
    retry_max_delay: float = 60.0

    class Config:
        env_file = ".env"


def validate_settings(s: Settings) -> None:
    """Fail startup with a descriptive error if config is invalid (Req 7.5)."""
    if s.weather_source == "openweathermap" and not s.weather_api_key:
        print("FATAL: WEATHER_SOURCE=openweathermap requires WEATHER_API_KEY to be set.", file=sys.stderr)
        sys.exit(1)
    if s.events_source == "eventbrite" and not s.eventbrite_api_key:
        print("FATAL: EVENTS_SOURCE=eventbrite requires EVENTBRITE_API_KEY to be set.", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(s.city_config_dir):
        print(f"FATAL: CITY_CONFIG_DIR '{s.city_config_dir}' does not exist.", file=sys.stderr)
        sys.exit(1)


settings = Settings()

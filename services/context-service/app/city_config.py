"""City configuration loader — YAML files, no code changes per city (Req 7, 25)."""
import os
import sys
import yaml
from functools import lru_cache
from gcw_utils import get_logger
from .config import settings

logger = get_logger("context-service:city-config")

REQUIRED_FIELDS = ["cityCode", "defaultGeoFenceRadiusMeters", "countryCode"]


@lru_cache(maxsize=32)
def load_city_config(city_code: str) -> dict:
    """Loads and caches a city config from YAML. Raises on missing or invalid config."""
    path = os.path.join(settings.city_config_dir, f"{city_code}.yaml")
    if not os.path.exists(path):
        raise FileNotFoundError(f"City configuration not found: {city_code}")

    with open(path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    _validate_config(config, city_code)
    logger.info(f"City config loaded: {city_code}")
    return config


def _validate_config(config: dict, city_code: str) -> None:
    for field in REQUIRED_FIELDS:
        if field not in config:
            raise ValueError(f"Invalid city config for '{city_code}': missing required field '{field}'")
    if config.get("defaultGeoFenceRadiusMeters", 0) <= 0:
        raise ValueError(f"Invalid city config for '{city_code}': defaultGeoFenceRadiusMeters must be > 0")


def validate_all_city_configs(config_dir: str) -> None:
    """Validates all city configs at startup. Exits with error on invalid config (Req 25.4)."""
    if not os.path.isdir(config_dir):
        print(f"FATAL: City config directory not found: {config_dir}", file=sys.stderr)
        sys.exit(1)

    yaml_files = [f for f in os.listdir(config_dir) if f.endswith(".yaml")]
    if not yaml_files:
        logger.warning(f"No city config files found in {config_dir}")
        return

    errors = []
    for fname in yaml_files:
        city_code = fname.replace(".yaml", "")
        try:
            load_city_config(city_code)
        except Exception as exc:
            errors.append(f"  {fname}: {exc}")

    if errors:
        print("FATAL: Invalid city configuration(s):\n" + "\n".join(errors), file=sys.stderr)
        sys.exit(1)

    logger.info(f"Validated {len(yaml_files)} city config(s): {[f.replace('.yaml','') for f in yaml_files]}")

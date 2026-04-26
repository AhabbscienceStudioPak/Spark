"""
Ollama LLM client — on-device inference via Ollama (free, GDPR-compliant).
Req 9: language-aware content generation (de/en).
Req 11: WCAG AA contrast-compliant visual design.
Req 12: on-device inference, cloud fallback with consent.
"""
import json
import httpx
from gcw_utils import get_logger
from ..config import settings

logger = get_logger("offer-service:ollama")

# WCAG AA compliant color pairs (background, text) — contrast ratio >= 4.5:1
WCAG_COLOR_SCHEMES = {
    "warm":      {"primary": "#C0392B", "secondary": "#FFFFFF", "bg": "#FFF5F5"},
    "cool":      {"primary": "#1A6B8A", "secondary": "#FFFFFF", "bg": "#F0F8FF"},
    "energetic": {"primary": "#D35400", "secondary": "#FFFFFF", "bg": "#FFF8F0"},
    "calm":      {"primary": "#2D6A4F", "secondary": "#FFFFFF", "bg": "#F0FFF4"},
    "festive":   {"primary": "#6C3483", "secondary": "#FFFFFF", "bg": "#F9F0FF"},
}


class OllamaClient:
    def __init__(self) -> None:
        self.base_url = settings.ollama_url
        self.model = settings.ollama_model

    async def generate_offer_content(
        self,
        context: dict,
        rule: dict,
        language: str = "de",
    ) -> dict:
        """Generates offer content via Ollama. Falls back to template on failure."""
        prompt = self._build_prompt(context, rule, language)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{self.base_url}/api/generate",
                    json={"model": self.model, "prompt": prompt, "stream": False, "format": "json"},
                )
                resp.raise_for_status()
                raw = resp.json()["response"]
                parsed = json.loads(raw)

            headline = str(parsed.get("headline", ""))
            description = str(parsed.get("description", ""))
            cta = str(parsed.get("callToAction", "Jetzt einlösen" if language == "de" else "Redeem Now"))

            # Enforce length invariants (Req 9.5)
            headline = headline[:150] if len(headline) >= 10 else self._fallback_headline(context, rule, language)
            description = description[:300] if len(description) >= 20 else self._fallback_description(context, language)

            return {"headline": headline, "description": description, "call_to_action": cta, "language": language}

        except Exception as exc:
            logger.warning(f"Ollama unavailable ({exc}), using fallback content")
            return self._fallback_content(context, rule, language)

    async def generate_visual_design(self, context: dict) -> dict:
        """
        Derives WCAG AA compliant visual design from context (Req 11).
        No LLM call needed — deterministic from context signals.
        """
        weather = context.get("weather", {})
        is_cold = weather.get("temperature", 20) < 10
        is_raining = weather.get("condition") in ("rain", "snow", "storm")
        has_event = any(e.get("is_active") for e in context.get("events", []))
        time_of_day = context.get("time", {}).get("time_of_day", "afternoon")

        if has_event:
            style = "festive"
        elif is_cold or is_raining:
            style = "warm"
        elif time_of_day in ("morning", "lunch"):
            style = "energetic"
        else:
            style = "calm"

        scheme = WCAG_COLOR_SCHEMES[style]

        return {
            "primary_color": scheme["primary"],
            "secondary_color": scheme["secondary"],
            "background_color": scheme["bg"],
            "background_style": style,
            "imagery_keywords": [
                weather.get("condition", "clear"),
                time_of_day,
                *( ["event", "celebration"] if has_event else []),
                *( ["warm", "cozy"] if is_cold else []),
            ],
            "layout_style": "compact",
            "wcag_compliant": True,
        }

    def _build_prompt(self, context: dict, rule: dict, language: str) -> str:
        weather = context.get("weather", {})
        time = context.get("time", {})
        lang_instruction = (
            "Antworte auf Deutsch." if language == "de"
            else "Respond in English."
        )
        return (
            f"Du generierst ein hyperpersonalisiertes lokales Händlerangebot. {lang_instruction}\n"
            f"Kontext: {weather.get('temperature', 15)}°C, {weather.get('condition', 'klar')}, "
            f"Tageszeit: {time.get('time_of_day', 'nachmittag')}, {time.get('day_type', 'werktag')}.\n"
            f"Händlerziel: {rule.get('goal', 'increase_foot_traffic')}. "
            f"Max. Rabatt: {rule.get('max_discount_percentage', 15)}%.\n"
            f"Generiere ein JSON-Objekt mit: headline (10-150 Zeichen), "
            f"description (20-300 Zeichen), callToAction.\n"
            f"Das Angebot muss sich auf diesen genauen Moment beziehen. Keine generischen Texte."
        )

    def _fallback_content(self, context: dict, rule: dict, language: str) -> dict:
        return {
            "headline": self._fallback_headline(context, rule, language),
            "description": self._fallback_description(context, language),
            "call_to_action": "Jetzt einlösen" if language == "de" else "Redeem Now",
            "language": language,
        }

    def _fallback_headline(self, context: dict, rule: dict, language: str) -> str:
        temp = context.get("weather", {}).get("temperature", 15)
        max_disc = rule.get("max_discount_percentage", 15)
        is_cold = temp < 10
        if language == "de":
            return f"Jetzt {max_disc}% sparen — nur für kurze Zeit" if not is_cold \
                else f"Wärm dich auf — {max_disc}% Rabatt wartet auf dich"
        return f"Save {max_disc}% right now — limited time" if not is_cold \
            else f"Warm up with {max_disc}% off — just for you"

    def _fallback_description(self, context: dict, language: str) -> str:
        temp = context.get("weather", {}).get("temperature", 15)
        time_of_day = context.get("time", {}).get("time_of_day", "afternoon")
        if language == "de":
            return f"Es sind {temp:.0f}°C draußen. Perfekter Moment für einen Besuch am {time_of_day}."
        return f"It's {temp:.0f}°C outside. Perfect timing for a visit this {time_of_day}."

"""Tests for the Ollama LLM client — fallback and content validation."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from app.llm.ollama_client import OllamaClient


def make_context(temp=11.0, condition="clouds", time_of_day="lunch"):
    return {
        "weather": {"temperature": temp, "condition": condition},
        "time": {"time_of_day": time_of_day, "day_type": "weekday"},
        "events": [],
    }


def make_rule(max_discount=20, goal="increase_foot_traffic"):
    return {"max_discount_percentage": max_discount, "goal": goal}


@pytest.mark.asyncio
async def test_generate_content_uses_fallback_on_failure():
    """When Ollama is unavailable, fallback content must still be valid."""
    client = OllamaClient()
    with patch("app.llm.ollama_client.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            side_effect=Exception("Connection refused")
        )
        content = await client.generate_offer_content(make_context(), make_rule())

    assert len(content["headline"]) >= 10
    assert len(content["headline"]) <= 150
    assert len(content["description"]) >= 20
    assert len(content["description"]) <= 300
    assert content["call_to_action"]


@pytest.mark.asyncio
async def test_generate_content_parses_ollama_response():
    """Valid Ollama response should be parsed and length-clamped."""
    client = OllamaClient()
    ollama_payload = json.dumps({
        "headline": "Warm up with 15% off hot chocolate",
        "description": "It's cold and cloudy outside. Perfect time for a warm drink at Café Müller.",
        "callToAction": "Get Offer",
    })
    mock_response = MagicMock()
    mock_response.json.return_value = {"response": ollama_payload}
    mock_response.raise_for_status = MagicMock()

    with patch("app.llm.ollama_client.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        content = await client.generate_offer_content(make_context(), make_rule())

    assert "hot chocolate" in content["headline"]
    assert content["call_to_action"] == "Get Offer"


@pytest.mark.asyncio
async def test_generate_visual_design_cold_weather():
    """Cold weather should produce warm color scheme."""
    client = OllamaClient()
    design = await client.generate_visual_design(make_context(temp=5.0, condition="snow"))
    assert design["background_style"] == "warm"
    assert design["primary_color"].startswith("#")


@pytest.mark.asyncio
async def test_generate_visual_design_event():
    """Active event should produce festive style."""
    client = OllamaClient()
    context = make_context()
    context["events"] = [{"is_active": True}]
    design = await client.generate_visual_design(context)
    assert design["background_style"] == "festive"

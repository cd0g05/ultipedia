"""LLM interface for the interview engine.

The engine's *decisions* (which aspect to probe, entity-confirm, deflection) are
deterministic Python — only the natural-language phrasing of a question comes
from the model. That keeps the engine fully testable with a `FakeLLM` and makes
the real provider a drop-in: set ANTHROPIC_API_KEY and questions get phrased by
Claude, grounded in the seed KB. No key → FakeLLM (deterministic, offline).
"""

from __future__ import annotations

import logging
import os
from typing import Protocol

logger = logging.getLogger("ulti.llm")

DEFAULT_MODEL = os.environ.get("ULTI_INTERVIEW_MODEL", "claude-sonnet-4-6")


class LLM(Protocol):
    def complete(self, system: str, user: str, *, max_tokens: int = 160) -> str: ...


class FakeLLM:
    """Deterministic, offline stand-in. Echoes the aspect/instruction so tests
    and local runs are predictable without an API key."""

    def complete(self, system: str, user: str, *, max_tokens: int = 160) -> str:
        # `user` is the phrasing instruction built by the engine; return a plain,
        # on-topic question so the transcript reads sensibly offline.
        return user.strip()


class AnthropicLLM:
    """Real provider. Lazy-imports the SDK so it's not needed for tests."""

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL) -> None:
        from anthropic import Anthropic  # lazy

        self._client = Anthropic(api_key=api_key)
        self._model = model

    def complete(self, system: str, user: str, *, max_tokens: int = 160) -> str:
        resp = self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
        return "".join(parts).strip()


def build_llm() -> LLM:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        logger.info("Using Anthropic model %s for interview questions", DEFAULT_MODEL)
        return AnthropicLLM(key)
    logger.warning(
        "ANTHROPIC_API_KEY not set — using FakeLLM (deterministic, offline). "
        "Interview questions will be templated, not model-generated."
    )
    return FakeLLM()

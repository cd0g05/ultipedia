"""Environment-based settings for the Ulti-pedia backend.

The Supabase service key lives here and is read from the environment only —
never shipped to the browser (see ADR-1 in tech-design.md).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    """Server configuration. All values come from environment variables."""

    supabase_url: str | None
    supabase_service_key: str | None
    max_field_len: int
    max_payload_bytes: int
    rate_limit_per_minute: int
    honeypot_field: str
    allowed_origins: tuple[str, ...]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)


def _split_origins(raw: str) -> tuple[str, ...]:
    return tuple(o.strip() for o in raw.split(",") if o.strip())


@lru_cache
def get_settings() -> Settings:
    """Build settings from the environment (cached for process lifetime)."""
    return Settings(
        supabase_url=os.environ.get("SUPABASE_URL"),
        supabase_service_key=os.environ.get("SUPABASE_SERVICE_KEY"),
        max_field_len=int(os.environ.get("ULTI_MAX_FIELD_LEN", "8000")),
        max_payload_bytes=int(os.environ.get("ULTI_MAX_PAYLOAD_BYTES", str(128 * 1024))),
        rate_limit_per_minute=int(os.environ.get("ULTI_RATE_LIMIT_PER_MINUTE", "20")),
        honeypot_field=os.environ.get("ULTI_HONEYPOT_FIELD", "website"),
        allowed_origins=_split_origins(
            os.environ.get("ULTI_ALLOWED_ORIGINS", "http://localhost:5173")
        ),
    )

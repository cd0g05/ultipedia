"""Server-side validation and anti-troll (PRD FR-4.2 / FR-4.3).

Everything here runs on the backend because client checks are bypassable. Layers:
payload-size cap, honeypot, per-key rate limit, per-field length caps + reject
whitespace-only content, and a light garbage heuristic that *flags* (never
auto-deletes) suspect rows for later review.
"""

from __future__ import annotations

import time
from collections import deque
from threading import Lock
from typing import Any

from backend.app.config import Settings
from backend.app.schemas import SubmissionCreate


class ValidationError(Exception):
    """Raised for a rejectable submission. `status` maps to an HTTP code."""

    def __init__(self, status: int, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail


def check_payload_size(raw: bytes, settings: Settings) -> None:
    if len(raw) > settings.max_payload_bytes:
        raise ValidationError(413, "payload too large")


def check_honeypot(data: dict[str, Any], settings: Settings) -> None:
    """Reject if the hidden honeypot field was filled (bots fill everything)."""
    value = data.get(settings.honeypot_field)
    if value:
        raise ValidationError(400, "rejected")


class RateLimiter:
    """Simple in-memory sliding-window limiter keyed by IP or contact.

    Adequate for a single-process MVP. For multi-instance deployment, swap the
    backing store for Redis (noted in tech-design Security/Performance).
    """

    def __init__(self, per_minute: int, window_seconds: float = 60.0) -> None:
        self._per_minute = per_minute
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            bucket = self._hits.setdefault(key, deque())
            cutoff = now - self._window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= self._per_minute:
                raise ValidationError(429, "rate limit exceeded")
            bucket.append(now)


def _iter_text_values(value: Any) -> list[str]:
    """Collect all string leaves from fields/raw_freeform for length checks."""
    out: list[str] = []
    if isinstance(value, str):
        out.append(value)
    elif isinstance(value, dict):
        for v in value.values():
            out.extend(_iter_text_values(v))
    elif isinstance(value, list):
        for v in value:
            out.extend(_iter_text_values(v))
    return out


def _has_content(create: SubmissionCreate) -> bool:
    """A submission needs at least one non-whitespace character somewhere."""
    texts = _iter_text_values(create.fields) + _iter_text_values(
        create.raw_freeform or ""
    )
    if create.messages:
        texts.extend(m.content for m in create.messages)
    return any(t.strip() for t in texts)


def is_garbage(create: SubmissionCreate) -> bool:
    """Heuristic flag (not a reject) for likely-troll content.

    Deliberately conservative: flags for human review, the encyclopedia step
    surfaces flagged rows anyway. False negatives are fine here.
    """
    texts = _iter_text_values(create.fields) + _iter_text_values(
        create.raw_freeform or ""
    )
    joined = " ".join(texts).strip()
    if not joined:
        return False
    # Very long run of a single repeated character (keyboard mashing).
    if any(len(run) >= 40 for run in _char_runs(joined)):
        return True
    # No letters at all but plenty of characters.
    if len(joined) >= 20 and not any(c.isalpha() for c in joined):
        return True
    return False


def _char_runs(text: str) -> list[str]:
    runs: list[str] = []
    prev = ""
    count = 0
    for ch in text:
        if ch == prev:
            count += 1
        else:
            if prev:
                runs.append(prev * count)
            prev, count = ch, 1
    if prev:
        runs.append(prev * count)
    return runs


def validate_content(create: SubmissionCreate, settings: Settings) -> None:
    """Field-level checks: length caps and non-empty. Raises ValidationError."""
    if not _has_content(create):
        raise ValidationError(422, "submission is empty")
    for text in _iter_text_values(create.fields) + _iter_text_values(
        create.raw_freeform or ""
    ):
        if len(text) > settings.max_field_len:
            raise ValidationError(
                422, f"a field exceeds the {settings.max_field_len} character limit"
            )

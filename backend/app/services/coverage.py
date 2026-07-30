"""Per-aspect coverage model (ADR-5).

Coverage is tracked per entity, per aspect, as a (fill, confidence) pair — never
a single boolean. `gaps()` orders aspects from least to most covered so the
interview probes the empty spots and pivots away from saturated ones (without
dismissing the coach). Cold start is implicit: a brand-new entity has all aspects
at zero, so `gaps()` returns every aspect and the interview behaves normally.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

# The aspects we model coverage over (mirrors entity_coverage.aspect).
ASPECTS: tuple[str, ...] = (
    "setup",
    "how_to_run",
    "focuses",
    "variations",
    "common_mistakes",
)


@dataclass
class AspectCoverage:
    fill_score: float = 0.0   # 0..1 how much we have
    confidence: float = 0.0   # 0..1 how sure we are

    def strength(self) -> float:
        """Combined coverage strength used for gap ordering."""
        return self.fill_score * self.confidence


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


class CoverageModel:
    def __init__(self, *, saturated_at: float = 0.7) -> None:
        self._saturated_at = saturated_at
        self._cov: dict[UUID, dict[str, AspectCoverage]] = {}

    def _entity(self, entity_id: UUID) -> dict[str, AspectCoverage]:
        return self._cov.setdefault(
            entity_id, {a: AspectCoverage() for a in ASPECTS}
        )

    def coverage_of(self, entity_id: UUID) -> dict[str, AspectCoverage]:
        return dict(self._entity(entity_id))

    def gaps(self, entity_id: UUID) -> list[str]:
        """Aspects ordered least-covered first — where the interview should dig."""
        cov = self._entity(entity_id)
        return sorted(ASPECTS, key=lambda a: cov[a].strength())

    def is_saturated(self, entity_id: UUID, aspect: str) -> bool:
        cov = self._entity(entity_id)
        return cov[aspect].strength() >= self._saturated_at

    def record(self, entity_id: UUID, contribution: dict[str, float]) -> None:
        """Fold an interview's contribution into coverage.

        `contribution` maps aspect -> amount added (0..1). Fill accumulates
        (capped at 1) and confidence rises toward 1 as more independent sources
        corroborate an aspect.
        """
        cov = self._entity(entity_id)
        for aspect, amount in contribution.items():
            if aspect not in cov:
                continue  # ignore unknown aspects rather than error
            ac = cov[aspect]
            ac.fill_score = _clamp(ac.fill_score + amount)
            # Each corroboration closes part of the remaining confidence gap.
            ac.confidence = _clamp(ac.confidence + (1.0 - ac.confidence) * 0.5)

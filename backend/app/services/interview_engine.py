"""The AI interview engine.

Hybrid flow: fixed preset openers first (capture name + gist so we can ground and
resolve), then coverage-routed follow-ups. Decisions are deterministic and
testable; only question *phrasing* is delegated to the LLM, grounded in the seed
KB. Key behaviors (all covered by tests):

- **Confirm-then-resolve** (ADR-7): a matched entity is suggested, never applied;
  "mine's different" spawns a variant.
- **Coverage routing** (ADR-5): probe the least-covered aspect; when an aspect is
  saturated, **compliment + pivot** rather than dismiss (protect goodwill).
- **Guardrails**: obvious prompt-injection / off-topic input is redirected, and
  interview input is only ever treated as data.
- **Length governance**: a soft question budget wraps the interview up.
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel

from backend.app.schemas import Message, Submission
from backend.app.services.coverage import ASPECTS, CoverageModel
from backend.app.services.entities import EntityRegistry
from backend.app.services.kb import KbIndex
from backend.app.services.llm import LLM
from backend.app.services.sessions import Session

PERSONA = (
    "You are a knowledgeable ultimate frisbee peer interviewing an experienced "
    "coach to capture how THEY do things. Ask one concise, specific question at a "
    "time. Never explain the sport back to them, never quiz them on basics, never "
    "be sycophantic. You are here to ask and listen."
)

# Human-readable aspect prompts used to instruct the LLM (and as the FakeLLM text).
ASPECT_PROMPT = {
    "setup": "how they set this up",
    "how_to_run": "how they actually run it",
    "focuses": "what they coach players to focus on",
    "variations": "variations they use",
    "common_mistakes": "the mistakes they see most often",
}

OPENER_NAME = {
    "drill": "What's the drill called?",
    "strategy.formation": "Which formation do you want to talk about?",
    "strategy.play": "What's the play called?",
    "strategy.concept": "Which concept do you want to talk about?",
    "other": "What would you like to share?",
}
OPENER_DESC = "In a sentence or two, what's it for and what does it work on?"

_INJECTION_MARKERS = (
    "ignore previous",
    "ignore the above",
    "disregard the",
    "system prompt",
    "you are now",
    "act as",
)
_AFFIRMATIVE = ("yes", "yeah", "yep", "that's it", "thats it", "correct", "right", "the same")
_NEGATIVE = ("no", "nope", "different", "mine's", "mines", "not the same", "not quite")


class TurnResult(BaseModel):
    session_id: UUID
    assistant: str
    stage: str
    target_aspect: str | None = None
    entity_confirm: str | None = None  # name of the entity being confirmed
    resolved_entity_id: UUID | None = None
    deflected: bool = False  # complimented + pivoted off a saturated aspect
    scope_redirect: bool = False
    done: bool = False
    controls: dict = {}


def _controls(done: bool = False) -> dict:
    return {"can_skip": not done, "can_finish": True, "escape_hatch": True}


class InterviewEngine:
    def __init__(
        self,
        registry: EntityRegistry,
        coverage: CoverageModel,
        kb: KbIndex,
        llm: LLM,
        *,
        question_budget: int = 8,
    ) -> None:
        self._registry = registry
        self._coverage = coverage
        self._kb = kb
        self._llm = llm
        self._budget = question_budget

    # --- public API ---------------------------------------------------------

    def start(self, session: Session) -> TurnResult:
        q = OPENER_NAME.get(session.type, OPENER_NAME["other"])
        session.add("assistant", q)
        return TurnResult(
            session_id=session.id, assistant=q, stage=session.stage, controls=_controls()
        )

    def turn(self, session: Session, user_text: str) -> TurnResult:
        session.add("user", user_text)

        if self._is_injection(user_text):
            msg = "I'm here to talk ultimate — tell me about the drill or strategy."
            session.add("assistant", msg)
            return TurnResult(
                session_id=session.id, assistant=msg, stage=session.stage,
                scope_redirect=True, controls=_controls(),
            )

        if session.stage == "await_name":
            return self._handle_name(session, user_text)
        if session.stage == "await_desc":
            return self._handle_desc(session, user_text)
        if session.stage == "confirm":
            return self._handle_confirm(session, user_text)
        return self._handle_probe(session, user_text)

    def submit(self, session: Session) -> Submission:
        """Persist the interview as one envelope row and fold in coverage."""
        if session.resolved_entity_id is not None:
            self._coverage.record(session.resolved_entity_id, session.coverage_contribution)
        transcript = "\n".join(f"{m['role']}: {m['content']}" for m in session.messages)
        return Submission(
            type="interview",
            contributor=session.contributor,  # type: ignore[arg-type]
            fields={"name": session.name, "topic_type": session.type},
            raw_freeform=transcript,
            messages=[Message(role=m["role"], content=m["content"]) for m in session.messages],
            resolved_entity_id=session.resolved_entity_id,
            coverage_contribution=dict(session.coverage_contribution),
        )

    # --- stage handlers -----------------------------------------------------

    def _handle_name(self, session: Session, text: str) -> TurnResult:
        session.name = text.strip()
        session.stage = "await_desc"
        session.add("assistant", OPENER_DESC)
        return TurnResult(
            session_id=session.id, assistant=OPENER_DESC, stage=session.stage,
            controls=_controls(),
        )

    def _handle_desc(self, session: Session, text: str) -> TurnResult:
        session.description = text.strip()
        query = f"{session.name} {session.description}"
        match = self._registry.resolve(query, session.type)
        if match is not None:
            session.pending_entity_id = match.entity.id
            session.stage = "confirm"
            q = (
                f"Sounds like the \"{match.entity.canonical_name}\" "
                f"{match.entity.kind.split('.')[-1]} — is that the one? "
                "(or say \"mine's different\")"
            )
            session.add("assistant", q)
            return TurnResult(
                session_id=session.id, assistant=q, stage=session.stage,
                entity_confirm=match.entity.canonical_name, controls=_controls(),
            )
        # Novel topic — create an entity so coverage can accumulate, then probe.
        entity = self._registry.add(
            kind=session.type, canonical_name=session.name or "(unnamed)",
            description=session.description,
        )
        session.resolved_entity_id = entity.id
        session.stage = "probe"
        return self._next_probe(session)

    def _handle_confirm(self, session: Session, text: str) -> TurnResult:
        low = text.lower()
        pending = session.pending_entity_id
        assert pending is not None
        if any(m in low for m in _NEGATIVE):
            # "mine's different" — a variant, so its coverage starts fresh.
            variant = self._registry.add_variant(
                pending, canonical_name=session.name or "(variant)",
                description=session.description,
            )
            session.resolved_entity_id = variant.id
        elif any(m in low for m in _AFFIRMATIVE):
            session.resolved_entity_id = pending
        else:
            # Ambiguous — ask once more, stay in confirm.
            q = "Just to be sure — is it that one, or is yours different?"
            session.add("assistant", q)
            return TurnResult(
                session_id=session.id, assistant=q, stage=session.stage,
                entity_confirm=self._entity_name(pending), controls=_controls(),
            )
        session.pending_entity_id = None
        session.stage = "probe"
        return self._next_probe(session)

    def _handle_probe(self, session: Session, text: str) -> TurnResult:
        # Credit the answer to the aspect we just asked about.
        if session.last_aspect:
            session.coverage_contribution[session.last_aspect] = min(
                1.0, session.coverage_contribution.get(session.last_aspect, 0.0) + 0.5
            )
        return self._next_probe(session)

    # --- probe selection ----------------------------------------------------

    def _next_probe(self, session: Session) -> TurnResult:
        session.turns += 1
        eid = session.resolved_entity_id

        remaining = [a for a in self._ordered_aspects(eid) if a not in session.asked_aspects]
        if session.turns > self._budget or not remaining:
            msg = "That's really useful — anything else you'd add, or shall we wrap up?"
            session.add("assistant", msg)
            session.stage = "done"
            return TurnResult(
                session_id=session.id, assistant=msg, stage=session.stage,
                done=True, resolved_entity_id=eid, controls=_controls(done=True),
            )

        aspect = remaining[0]
        deflected = False
        if eid is not None and self._coverage.is_saturated(eid, aspect):
            # Well covered already: compliment + pivot to the next open aspect.
            open_aspects = [a for a in remaining if not self._coverage.is_saturated(eid, a)]
            if open_aspects:
                aspect = open_aspects[0]
                deflected = True

        session.asked_aspects.append(aspect)
        session.last_aspect = aspect
        question = self._phrase_question(session, aspect, deflected)
        session.add("assistant", question)
        return TurnResult(
            session_id=session.id, assistant=question, stage=session.stage,
            target_aspect=aspect, deflected=deflected, resolved_entity_id=eid,
            controls=_controls(),
        )

    def _ordered_aspects(self, eid: UUID | None) -> list[str]:
        if eid is None:
            return list(ASPECTS)
        return self._coverage.gaps(eid)  # least-covered first

    def _phrase_question(self, session: Session, aspect: str, deflected: bool) -> str:
        grounding = self._kb.search(f"{session.name} {ASPECT_PROMPT[aspect]}", k=2)
        ground_text = " ".join(h.chunk.content for h in grounding)
        lead = (
            f'You clearly know "{session.name}" well — '
            if deflected
            else ""
        )
        instruction = (
            f"{lead}Ask the coach about {ASPECT_PROMPT[aspect]} for "
            f"\"{session.name}\"."
        )
        system = f"{PERSONA}\nGrounding (do not quote verbatim): {ground_text}"
        return self._llm.complete(system, instruction)

    # --- helpers ------------------------------------------------------------

    def _entity_name(self, eid: UUID) -> str | None:
        for e in self._registry.all():
            if e.id == eid:
                return e.canonical_name
        return None

    @staticmethod
    def _is_injection(text: str) -> bool:
        low = text.lower()
        return any(m in low for m in _INJECTION_MARKERS)

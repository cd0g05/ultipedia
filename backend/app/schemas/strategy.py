"""Strategy field shapes (advisory) for the formation / play / concept sub-paths.

As with drills, `Submission.fields` is schemaless; these document the expected
shapes and allow optional edge validation. All fields optional, extra allowed.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class FormationFields(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    focus: str | None = None  # what teams should think about / focus on
    common_mistakes: str | None = None  # where teams go wrong
    best_situations: str | None = None
    other: str | None = None


class PlayFields(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    formation: str | None = None
    setup: str | None = None
    run: str | None = None  # how the play is run
    goals: str | None = None
    cautions: str | None = None
    other: str | None = None


class ConceptFields(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    notes: str | None = None  # what people should know about this concept

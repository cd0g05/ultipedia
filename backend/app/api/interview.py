"""/api/interview/* — start, turn, resume, submit.

Sessions autosave in the store on every turn, so a coach can leave and resume.
On submit the transcript is written as one `interview` envelope row via the same
storage path as the v1 form.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/api/interview", tags=["interview"])


class StartIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: str
    contributor: dict | None = None


class TurnIn(BaseModel):
    session_id: UUID
    user_text: str


class SessionIn(BaseModel):
    session_id: UUID


def _get_session(request: Request, session_id: UUID):
    session = request.app.state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="unknown session")
    return session


@router.post("/start")
async def start(payload: StartIn, request: Request):
    session = request.app.state.sessions.create(payload.type, payload.contributor)
    result = request.app.state.interview_engine.start(session)
    request.app.state.sessions.save(session)  # per-turn autosave
    return result


@router.post("/turn")
async def turn(payload: TurnIn, request: Request):
    session = _get_session(request, payload.session_id)
    result = request.app.state.interview_engine.turn(session, payload.user_text)
    request.app.state.sessions.save(session)  # per-turn autosave
    return result


@router.post("/resume")
async def resume(payload: SessionIn, request: Request):
    session = _get_session(request, payload.session_id)
    return {
        "session_id": session.id,
        "type": session.type,
        "stage": session.stage,
        "messages": session.messages,
    }


@router.post("/submit")
async def submit(payload: SessionIn, request: Request):
    session = _get_session(request, payload.session_id)
    submission = request.app.state.interview_engine.submit(session)
    submission_id = request.app.state.store.save_submission(submission)
    return {"submission_id": str(submission_id)}

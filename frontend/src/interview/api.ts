// Interview API client — talks to /api/interview/* on the backend.

import type { SubmissionType, Contributor } from "../types";

export interface TurnResult {
  session_id: string;
  assistant: string;
  stage: string;
  target_aspect?: string | null;
  entity_confirm?: string | null;
  deflected?: boolean;
  scope_redirect?: boolean;
  done?: boolean;
  controls?: { can_skip?: boolean; can_finish?: boolean; escape_hatch?: boolean };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export const startInterview = (type: SubmissionType, contributor?: Contributor) =>
  post<TurnResult>("/api/interview/start", { type, contributor });

export const sendTurn = (sessionId: string, userText: string) =>
  post<TurnResult>("/api/interview/turn", { session_id: sessionId, user_text: userText });

export const submitInterview = (sessionId: string) =>
  post<{ submission_id: string }>("/api/interview/submit", { session_id: sessionId });

// Talks to the Foundation backend ONLY (never Supabase directly — ADR-1).
// Submit is resilient: on network failure the payload is queued in localStorage
// and retried, so a submission is never lost on bad signal (PRD FR-2.4).

import type { FunnelEvent, SubmissionCreate } from "../types";

const QUEUE_KEY = "ulti.retryQueue.v1";

export interface SubmitResult {
  ok: boolean;
  submissionId?: string;
  queued?: boolean; // stored locally for retry rather than delivered
  rejected?: boolean; // server refused (4xx) — do not retry
  detail?: string;
}

type QueuedItem = { id: string; payload: SubmissionCreate };

function readQueue(): QueuedItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedItem[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function queueSize(): number {
  return readQueue().length;
}

function enqueue(payload: SubmissionCreate): void {
  const items = readQueue();
  items.push({ id: crypto.randomUUID(), payload });
  writeQueue(items);
}

async function postSubmission(
  payload: SubmissionCreate
): Promise<SubmitResult> {
  const res = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 201) {
    const body = (await res.json()) as { submission_id: string };
    return { ok: true, submissionId: body.submission_id };
  }
  // 4xx = the server rejected it (validation/honeypot/rate limit). Retrying
  // won't help, so surface it rather than queueing forever.
  let detail: string | undefined;
  try {
    detail = ((await res.json()) as { detail?: string }).detail;
  } catch {
    /* ignore */
  }
  return { ok: false, rejected: res.status >= 400 && res.status < 500, detail };
}

export async function submit(payload: SubmissionCreate): Promise<SubmitResult> {
  try {
    const result = await postSubmission(payload);
    if (!result.ok && !result.rejected) {
      // 5xx / unexpected — treat as transient, queue it.
      enqueue(payload);
      return { ok: false, queued: true };
    }
    return result;
  } catch {
    // Network error (offline / bad signal) — keep the work, retry later.
    enqueue(payload);
    return { ok: false, queued: true };
  }
}

// Attempt to deliver anything queued from earlier failures. Call on app load
// and after a successful submit. Best-effort; leaves items that still fail.
export async function flushQueue(): Promise<number> {
  const items = readQueue();
  if (items.length === 0) return 0;
  const remaining: QueuedItem[] = [];
  let delivered = 0;
  for (const item of items) {
    try {
      const result = await postSubmission(item.payload);
      if (result.ok || result.rejected) {
        delivered += result.ok ? 1 : 0; // drop rejected (won't ever succeed)
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return delivered;
}

export async function trackEvent(
  event: FunnelEvent,
  meta?: Record<string, unknown>
): Promise<void> {
  // Analytics must never block or break UX — swallow all errors.
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, meta }),
    });
  } catch {
    /* ignore */
  }
}

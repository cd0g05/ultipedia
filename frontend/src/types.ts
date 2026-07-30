// Mirrors the backend submission envelope (backend/app/schemas/envelope.py).
// The client sends SubmissionCreate; the server owns id/timestamp/schema_version.

export type SubmissionType =
  | "drill"
  | "strategy.formation"
  | "strategy.play"
  | "strategy.concept"
  | "other";

export interface Contributor {
  name?: string;
  email?: string;
  phone?: string;
  consent_to_credit: boolean;
}

export interface SubmissionCreate {
  type: SubmissionType;
  contributor: Contributor;
  fields: Record<string, string>;
  raw_freeform?: string;
}

export type FunnelEvent = "form_started" | "field_completed" | "submitted";

// The in-progress entry the form edits and autosaves.
export interface Draft {
  type: SubmissionType | null;
  fields: Record<string, string>;
  raw_freeform: string;
}

export const emptyDraft = (): Draft => ({
  type: null,
  fields: {},
  raw_freeform: "",
});

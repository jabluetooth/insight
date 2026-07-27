// Shared types for the Insight paste-and-diagnose flow.
//
// These describe the contract between the browser, the Next.js proxy route,
// and the n8n diagnosis pipeline webhook. Per PRD §6.2a, the frontend never
// computes a diagnosis itself — these types only shape requests/responses
// that pass through it unchanged.

/** The two mutually exclusive ways a visitor can submit a failure (FR-12). */
export type DiagnoseRequestBody =
  | {
      mode: "execution";
      executionId: string;
      baseUrl: string;
      apiKey: string;
    }
  | {
      mode: "upload";
      execution: unknown;
    };

export type DiagnosisStatus = "ok" | "transient" | "error";

/**
 * The shape returned by the n8n diagnosis webhook (FR-6/FR-7/FR-8, §6.6.1
 * steps 9-11). Field names here are this frontend's best-effort contract
 * with the pipeline — the authoritative schema lives in the n8n workflow,
 * not here — so the UI reads every field defensively (optional, with
 * fallbacks) rather than assuming it is always fully populated.
 */
export interface DiagnosisResult {
  status: DiagnosisStatus;
  failingNode?: string | null;
  rootCauseCategory?: string | null;
  explanation?: string | null;
  /** 0-1. Absent/null is treated as "unknown," not zero. */
  confidence?: number | null;
  suggestedFix?: string | null;
  /** Present for "transient" or "error" statuses, e.g. "looks transient, no code-level root cause found." */
  message?: string | null;
}

/** What /api/diagnose returns to the browser on a hard failure (network, timeout, malformed input, rate limit). */
export interface DiagnoseErrorResponse {
  error: true;
  message: string;
  detail?: string;
}

export type ConfidenceTier = "high" | "moderate" | "low" | "unknown";

/**
 * PRD §2.1 calibration requirement: a low-confidence result must visibly
 * read as hedged, not be presented with the same certainty as a
 * high-confidence one. These thresholds drive that visual distinction.
 */
export function getConfidenceTier(
  confidence: number | null | undefined
): ConfidenceTier {
  if (confidence == null || Number.isNaN(confidence)) return "unknown";
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "moderate";
  return "low";
}

// ---------------------------------------------------------------------------
// Connected-instance dashboard types (§6.6 "Connecting or revoking an
// instance", §6.7 Postgres schema sketch).
//
// These mirror the contract this frontend was handed for the n8n
// "Insight - Manage Instance" workflow. Field names on the Postgres-shaped
// types below (ConnectedInstance, DiagnosisLogRow) are inferred from the
// PRD §6.7 sketch, which is explicitly "a sketch, not a migration" — treat
// them as best-effort until the backend tables actually exist (see
// src/lib/dashboard-data.ts for where that assumption is centralized).
// ---------------------------------------------------------------------------

export type InstanceStatus = "active" | "revoked";

/** One row from `connected_instances`, as read by the dashboard (never the API key itself — that's never selected). */
export interface ConnectedInstance {
  id: string;
  label: string;
  baseUrl: string;
  status: InstanceStatus;
  lastPolledAt: string | null;
  createdAt: string;
  /** Count of `diagnoses` rows for this instance — a rough error count, not a precise unresolved-incident count. */
  diagnosisCount: number;
}

/** One row from `diagnoses`, scoped to a single instance (FR-15/FR-16). */
export interface DiagnosisLogRow {
  id: string;
  executionId: string;
  createdAt: string;
  failingNode: string | null;
  rootCauseCategory: string | null;
  confidence: number | null;
  explanation: string | null;
  suggestedFix: string | null;
  source: string | null;
}

/** POST body this frontend sends to /api/instances/connect. `ownerUserId` is NOT part of this — the route sets it server-side from the session. */
export interface ConnectInstanceRequestBody {
  label: string;
  baseUrl: string;
  apiKey: string;
}

/** What the n8n "manage-instance" workflow returns for a connect call. */
export type ManageInstanceConnectResult =
  | { status: "connected"; instanceId: string; ingestToken: string }
  | { status: "error"; message: string; detail?: string };

/** POST body this frontend sends to /api/instances/revoke. */
export interface RevokeInstanceRequestBody {
  instanceId: string;
}

/** What the n8n "manage-instance" workflow returns for a revoke call. */
export type ManageInstanceRevokeResult =
  | { status: "revoked"; instanceId: string }
  | { status: "error"; message: string };

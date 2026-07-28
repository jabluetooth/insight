import "server-only";
import { getDashboardDb } from "./db";
import { getConfidenceTier } from "./types";
import type { ConfidenceTier, ConnectedInstance, DashboardStats, DiagnosisLogRow } from "./types";

/** Trailing window size for the dashboard's daily-count trend (FR-16). */
const TREND_WINDOW_DAYS = 7;

/** Top-N cap for the root-cause category breakdown (FR-16). */
const TOP_CATEGORY_LIMIT = 5;

// Read-only queries backing the /dashboard pages (PRD §6.9 item 2: the
// dashboard reads Postgres directly for display; the one write path,
// registering/revoking an instance, goes through n8n's manage-instance
// workflow instead — see src/app/api/instances/*).
//
// SCHEMA CAVEAT: §6.7 explicitly describes `connected_instances` and
// `diagnoses` as "a sketch, not a migration." Column names below
// (owner_user_id, base_url, last_polled_at, root_cause_category, etc.) are
// this frontend's best-effort guess at what the backend build will name
// them, in snake_case per that sketch. These tables do not exist yet in the
// target database as of this build (blocked on an unrelated Postgres SSL
// config issue on the backend side) — so none of the queries below have
// been run against real data. If the actual migration names columns
// differently, this file is the only place that needs to change; every
// page consumes the ConnectedInstance / DiagnosisLogRow shapes from
// src/lib/types.ts, not raw rows.
//
// Every query here is parameterized and every instance-scoped query filters
// by owner_user_id so one signed-in user can never read another's rows —
// see getInstanceById in particular, which is what backs the ownership
// check on /dashboard/instances/[id].

export async function getInstancesForUser(
  ownerUserId: string
): Promise<ConnectedInstance[]> {
  const db = getDashboardDb();
  const result = await db.query(
    `
    SELECT
      ci.id,
      ci.label,
      ci.base_url,
      ci.status,
      ci.last_polled_at,
      ci.created_at,
      COUNT(d.id)::int AS diagnosis_count
    FROM connected_instances ci
    LEFT JOIN diagnoses d ON d.instance_id = ci.id
    WHERE ci.owner_user_id = $1
    GROUP BY ci.id
    ORDER BY ci.created_at DESC
    `,
    [ownerUserId]
  );

  return result.rows.map(rowToConnectedInstance);
}

/**
 * Fetches one instance, scoped to the given owner. Returns null if the
 * instance doesn't exist OR belongs to someone else — the caller (the
 * /dashboard/instances/[id] page) must treat both cases identically (a 404,
 * never a distinguishing "not yours" message) so the URL can't be used to
 * probe which instance IDs exist.
 */
export async function getInstanceById(
  instanceId: string,
  ownerUserId: string
): Promise<ConnectedInstance | null> {
  const db = getDashboardDb();
  const result = await db.query(
    `
    SELECT
      ci.id,
      ci.label,
      ci.base_url,
      ci.status,
      ci.last_polled_at,
      ci.created_at,
      COUNT(d.id)::int AS diagnosis_count
    FROM connected_instances ci
    LEFT JOIN diagnoses d ON d.instance_id = ci.id
    WHERE ci.id = $1 AND ci.owner_user_id = $2
    GROUP BY ci.id
    `,
    [instanceId, ownerUserId]
  );

  if (result.rowCount === 0) return null;
  return rowToConnectedInstance(result.rows[0]);
}

/**
 * Diagnoses for one instance, most recent first. Callers MUST have already
 * confirmed ownership via getInstanceById before calling this — it does not
 * re-check ownership itself, since instance_id alone doesn't carry owner
 * information without the join.
 */
export async function getDiagnosesForInstance(
  instanceId: string
): Promise<DiagnosisLogRow[]> {
  const db = getDashboardDb();
  const result = await db.query(
    `
    SELECT
      id,
      execution_id,
      created_at,
      failing_node,
      root_cause_category,
      confidence,
      explanation,
      suggested_fix,
      source
    FROM diagnoses
    WHERE instance_id = $1
    ORDER BY created_at DESC
    LIMIT 200
    `,
    [instanceId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    executionId: String(row.execution_id),
    createdAt: new Date(row.created_at).toISOString(),
    failingNode: row.failing_node ?? null,
    rootCauseCategory: row.root_cause_category ?? null,
    confidence: row.confidence == null ? null : Number(row.confidence),
    explanation: row.explanation ?? null,
    suggestedFix: row.suggested_fix ?? null,
    source: row.source ?? null,
  }));
}

/**
 * Aggregate stats across every instance this user owns (FR-16) — total
 * diagnoses, average confidence + tier breakdown, top root-cause
 * categories, and a zero-filled daily count for the trailing window. Scoped
 * by owner_user_id via the same connected_instances join every other query
 * in this file uses, so one user's stats never include another's rows.
 *
 * Confidence-tier bucketing intentionally happens in JS via
 * getConfidenceTier, not as SQL thresholds, so this never drifts from the
 * single definition of "high/moderate/low" used everywhere else.
 */
export async function getDashboardStats(ownerUserId: string): Promise<DashboardStats> {
  const db = getDashboardDb();

  const [confidenceResult, categoryResult, dailyResult] = await Promise.all([
    db.query(
      `
      SELECT d.confidence
      FROM diagnoses d
      JOIN connected_instances ci ON ci.id = d.instance_id
      WHERE ci.owner_user_id = $1
      `,
      [ownerUserId]
    ),
    db.query(
      `
      SELECT
        COALESCE(NULLIF(d.root_cause_category, ''), 'Uncategorized') AS category,
        COUNT(*)::int AS count
      FROM diagnoses d
      JOIN connected_instances ci ON ci.id = d.instance_id
      WHERE ci.owner_user_id = $1
      GROUP BY category
      ORDER BY count DESC, category ASC
      LIMIT $2
      `,
      [ownerUserId, TOP_CATEGORY_LIMIT]
    ),
    db.query(
      `
      SELECT date_trunc('day', d.created_at)::date AS day, COUNT(*)::int AS count
      FROM diagnoses d
      JOIN connected_instances ci ON ci.id = d.instance_id
      WHERE ci.owner_user_id = $1
        AND d.created_at >= NOW() - make_interval(days => $2::int)
      GROUP BY day
      ORDER BY day ASC
      `,
      [ownerUserId, TREND_WINDOW_DAYS]
    ),
  ]);

  const tierCounts: Record<ConfidenceTier, number> = {
    high: 0,
    moderate: 0,
    low: 0,
    unknown: 0,
  };
  let confidenceSum = 0;
  let confidenceCount = 0;
  for (const row of confidenceResult.rows as { confidence: string | number | null }[]) {
    const confidence = row.confidence == null ? null : Number(row.confidence);
    tierCounts[getConfidenceTier(confidence)] += 1;
    if (confidence != null && !Number.isNaN(confidence)) {
      confidenceSum += confidence;
      confidenceCount += 1;
    }
  }
  const totalDiagnoses = confidenceResult.rows.length;
  const averageConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : null;

  const topCategories = (categoryResult.rows as { category: string; count: string | number }[]).map(
    (row) => ({ category: row.category, count: Number(row.count) })
  );

  const countsByDate = new Map<string, number>();
  for (const row of dailyResult.rows as { day: string | Date; count: string | number }[]) {
    countsByDate.set(toDateKey(new Date(row.day)), Number(row.count));
  }

  const today = new Date();
  const dailyCounts: { date: string; count: number }[] = [];
  for (let daysAgo = TREND_WINDOW_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const day = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo)
    );
    const dateKey = toDateKey(day);
    dailyCounts.push({ date: dateKey, count: countsByDate.get(dateKey) ?? 0 });
  }

  return {
    totalDiagnoses,
    averageConfidence,
    confidenceTierCounts: tierCounts,
    topCategories,
    dailyCounts,
  };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface ConnectedInstanceRow {
  id: string | number;
  label: string;
  base_url: string;
  status: string;
  last_polled_at: string | Date | null;
  created_at: string | Date;
  diagnosis_count: string | number | null;
}

function rowToConnectedInstance(row: ConnectedInstanceRow): ConnectedInstance {
  return {
    id: String(row.id),
    label: row.label,
    baseUrl: row.base_url,
    status: row.status === "revoked" ? "revoked" : "active",
    lastPolledAt: row.last_polled_at ? new Date(row.last_polled_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    diagnosisCount: Number(row.diagnosis_count ?? 0),
  };
}

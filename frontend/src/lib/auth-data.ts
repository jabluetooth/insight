import "server-only";
import { getDashboardDb } from "./db";

// Small, read-only helper against Auth.js's own adapter-managed `accounts`
// table (see migrations/001_authjs_tables.sql) — separate from
// dashboard-data.ts, which only ever touches the PRD's connected_instances /
// diagnoses tables. This is the one place that reads Auth.js's own schema
// directly, for the one piece of account info the session/JWT doesn't
// already carry: which OAuth provider a user actually signed in with.

/**
 * Returns the OAuth provider name (e.g. "github", "google") for the account
 * Auth.js's Postgres adapter linked to this user, or null if it can't be
 * determined (no matching row, or the query itself fails — callers should
 * treat both the same way: omit the "signed in with" detail rather than
 * fail the whole page over a nice-to-have).
 *
 * A user could in principle have more than one linked account (one per
 * provider) if they've signed in with both GitHub and Google using the same
 * email; this returns whichever one the adapter created first, which is
 * good enough for a "signed in with" display and not a security-relevant
 * distinction (see src/lib/auth.ts on how `owner_user_id` is actually
 * scoped).
 */
export async function getPrimaryProviderForUser(
  userId: string
): Promise<string | null> {
  const db = getDashboardDb();
  const result = await db.query(
    `
    SELECT provider
    FROM accounts
    WHERE "userId" = $1
    ORDER BY id ASC
    LIMIT 1
    `,
    [userId]
  );

  if (result.rowCount === 0) return null;
  return String(result.rows[0].provider);
}

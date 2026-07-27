import "server-only";
import { Pool } from "pg";

// Shared Postgres pool for the dashboard's own server-side use.
//
// PRD §6.9 item 2: the dashboard is supposed to read Postgres directly using
// a Neon *read-only* role, with the one write path (connected_instances)
// going through n8n's "manage-instance" workflow instead (§6.6) so n8n stays
// the sole writer.
//
// KNOWN SIMPLIFICATION vs. the PRD: this build uses a single connection
// string (DASHBOARD_DATABASE_URL) for both jobs —
//   (a) the Auth.js adapter's own user/account/session tables, which
//       genuinely need write access (creating a user row on first sign-in,
//       linking OAuth accounts, etc.), and
//   (b) reading `connected_instances` and `diagnoses` for display.
// A stricter setup would use two roles/connection strings: a write-capable
// one scoped to the auth.js tables only, and a strictly read-only one for
// (b). That split is not implemented here — this is a single connection
// with write access used for both, which is a real gap against the PRD's
// "dashboard's Neon role stays read-only" intent, not a cosmetic one. It is
// safe *for this build* because the only writes this app ever issues are
// Auth.js's own adapter calls (never anything to connected_instances or
// diagnoses — see src/lib/dashboard-data.ts, which only ever SELECTs), but
// nothing at the database-permission level enforces that boundary here.
// Flagging this explicitly rather than labeling the env var "read-only" and
// having that be untrue.
//
// SSL: Neon (and most managed Postgres) requires TLS. `rejectUnauthorized:
// false` is the common pragmatic setting for serverless PG clients talking
// to a managed provider's certificate chain — this is a client-side
// permissiveness setting, unrelated to the separate backend-side Postgres
// SSL configuration issue this project is currently blocked on for the
// n8n-facing connection.
const globalForDb = globalThis as unknown as { dashboardDbPool?: Pool };

function createRealPool(): Pool {
  const connectionString = process.env.DASHBOARD_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DASHBOARD_DATABASE_URL is not configured — see .env.example. This is required for sign-in (Auth.js adapter tables) and for every /dashboard page."
    );
  }
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

/**
 * Lazily-created, process-wide Postgres pool. Reused across hot reloads in
 * dev (via `globalThis`) so `next dev` doesn't open a new pool on every
 * file-save fast refresh.
 *
 * IMPORTANT: this returns a Proxy, not a real `pg.Pool`, specifically so
 * that missing-env-var validation happens on first *use* (the first
 * `.query(...)` call) rather than at module-import time. src/lib/auth.ts
 * calls `PostgresAdapter(getDashboardDb())` at module scope — if this
 * function constructed (and validated) the real pool eagerly, simply
 * importing "@/lib/auth" without DASHBOARD_DATABASE_URL set would throw
 * during `next build`'s page-data-collection step, before any request was
 * ever served (this was caught by actually running `next build` locally —
 * see the note in the task's final report). Deferring to first real use
 * keeps the build (and any route unrelated to auth/dashboard) working even
 * when this var isn't configured yet, while still failing loudly the
 * moment sign-in or a /dashboard page actually needs the database.
 */
export function getDashboardDb(): Pool {
  if (!globalForDb.dashboardDbPool) {
    let real: Pool | null = null;
    const ensureReal = () => {
      if (!real) real = createRealPool();
      return real;
    };

    globalForDb.dashboardDbPool = new Proxy({} as Pool, {
      get(_target, prop) {
        const pool = ensureReal();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (pool as any)[prop];
        return typeof value === "function" ? value.bind(pool) : value;
      },
    });
  }
  return globalForDb.dashboardDbPool;
}

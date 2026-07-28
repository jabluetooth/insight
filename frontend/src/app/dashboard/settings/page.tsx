import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getPrimaryProviderForUser } from "@/lib/auth-data";
import styles from "./settings.module.css";

export const metadata: Metadata = {
  title: "Settings — Insight",
};

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  google: "Google",
};

export default async function SettingsPage() {
  // Auth gate already happened in dashboard/layout.tsx (this route nests
  // under src/app/dashboard/, so it inherits that check for free) — this
  // call is just to read the signed-in user's own info, same pattern as
  // src/app/dashboard/page.tsx.
  const session = await auth();
  const user = session!.user;

  // The provider isn't on the session/JWT itself (see src/types/next-auth.d.ts
  // — only `id` was added there), so it's a best-effort read straight from
  // Auth.js's own `accounts` table. Non-fatal: if this fails or comes back
  // empty, the page still shows name/email rather than failing outright,
  // since "which provider" is a nice-to-have, not load-bearing.
  let provider: string | null = null;
  try {
    provider = await getPrimaryProviderForUser(user.id);
  } catch {
    provider = null;
  }

  return (
    <div className={styles.page}>
      <header>
        <h1>Settings</h1>
        <p className={styles.intro}>
          Your account details, as provided by whichever service you signed
          in with.
        </p>
      </header>

      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Name</span>
          <span className={styles.rowValue}>{user.name ?? "—"}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Email</span>
          <span className={styles.rowValue}>{user.email ?? "—"}</span>
        </div>
        {provider && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>Signed in with</span>
            <span className={styles.providerBadge}>
              {PROVIDER_LABELS[provider] ?? provider}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

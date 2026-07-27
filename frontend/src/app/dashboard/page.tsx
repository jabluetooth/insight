import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getInstancesForUser } from "@/lib/dashboard-data";
import { RevokeInstanceButton } from "./RevokeInstanceButton";
import styles from "./dashboard.module.css";
import type { ConnectedInstance } from "@/lib/types";

export const metadata: Metadata = {
  title: "My instances — Insight",
};

function formatRelativeOrDate(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DashboardPage() {
  // Authoritative check already happened in the layout; `auth()` here is a
  // second call (JWT strategy makes this cheap, no DB hit) purely to get
  // the user id to scope the query by — not a redundant security check.
  const session = await auth();
  const ownerUserId = session!.user.id;

  let instances: ConnectedInstance[];
  let loadError: string | null = null;
  try {
    instances = await getInstancesForUser(ownerUserId);
  } catch (err) {
    instances = [];
    loadError =
      err instanceof Error
        ? err.message
        : "Could not load your connected instances.";
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageHeading}>My instances</h1>
          <p className={styles.pageSubtitle}>
            n8n instances you&apos;ve connected for ongoing monitoring. Each
            one gets its own running log of diagnosed failures and suggested
            fixes.
          </p>
        </div>
        <Link href="/dashboard/connect" className={styles.primaryLink}>
          + Add instance
        </Link>
      </div>

      {loadError && (
        <div className={styles.loadError} role="alert">
          <div>
            <p className={styles.loadErrorTitle}>Couldn&apos;t load your instances</p>
            <p className={styles.loadErrorBody}>{loadError}</p>
          </div>
        </div>
      )}

      {!loadError && instances.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>Connect your first instance</p>
          <p className={styles.emptyStateBody}>
            Add your n8n instance&apos;s base URL and an API key, and Insight
            will start tracking failures and diagnoses for it here — no more
            pasting execution IDs one at a time.
          </p>
          <Link href="/dashboard/connect" className={styles.primaryLink}>
            + Add instance
          </Link>
        </div>
      )}

      {!loadError && instances.length > 0 && (
        <div className={styles.instanceGrid}>
          {instances.map((instance) => (
            <div key={instance.id} className={styles.instanceCard}>
              <div className={styles.instanceMain}>
                <div className={styles.instanceLabelRow}>
                  <Link
                    href={`/dashboard/instances/${instance.id}`}
                    className={styles.instanceLabelLink}
                  >
                    {instance.label}
                  </Link>
                  <span
                    className={`${styles.statusBadge} ${
                      instance.status === "active" ? styles.statusActive : styles.statusRevoked
                    }`}
                  >
                    {instance.status}
                  </span>
                </div>
                <p className={styles.instanceBaseUrl}>{instance.baseUrl}</p>
                <p className={styles.instanceMeta}>
                  Last polled: {formatRelativeOrDate(instance.lastPolledAt)}
                </p>
              </div>
              <div className={styles.instanceActions}>
                <div className={styles.errorCountBadge}>
                  <span className={styles.errorCountNumber}>{instance.diagnosisCount}</span>
                  <span className={styles.errorCountLabel}>diagnoses</span>
                </div>
                {instance.status === "active" && (
                  <RevokeInstanceButton instanceId={instance.id} label={instance.label} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

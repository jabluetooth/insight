import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDashboardStats, getInstancesForUser } from "@/lib/dashboard-data";
import { RevokeInstanceButton } from "./RevokeInstanceButton";
import styles from "./dashboard.module.css";
import type { ConfidenceTier, ConnectedInstance, DashboardStats } from "@/lib/types";

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

const TIER_LABELS: Record<ConfidenceTier, string> = {
  high: "high",
  moderate: "moderate",
  low: "low",
  unknown: "unknown",
};

/** e.g. "3 high, 2 moderate, 1 unknown" — omits tiers with zero diagnoses. */
function formatTierBreakdown(counts: Record<ConfidenceTier, number>): string {
  const parts = (["high", "moderate", "low", "unknown"] as ConfidenceTier[])
    .filter((tier) => counts[tier] > 0)
    .map((tier) => `${counts[tier]} ${TIER_LABELS[tier]}`);
  return parts.length > 0 ? parts.join(", ") : "No confidence data yet";
}

function formatDayLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

function formatShortDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function StatsSection({ stats }: { stats: DashboardStats }) {
  if (stats.totalDiagnoses === 0) {
    return (
      <section className={styles.statsSection} aria-labelledby="stats-heading">
        <h2 id="stats-heading" className={styles.statsHeading}>
          Diagnosis activity
        </h2>
        <p className={styles.statsEmptyText}>
          No diagnoses yet — once your connected instances report failures,
          activity trends and root-cause breakdowns will show up here.
        </p>
      </section>
    );
  }

  const maxDaily = Math.max(...stats.dailyCounts.map((d) => d.count), 0);
  const sparklineSummary = stats.dailyCounts
    .map((d) => `${formatShortDate(d.date)}: ${d.count}`)
    .join(", ");

  return (
    <section className={styles.statsSection} aria-labelledby="stats-heading">
      <h2 id="stats-heading" className={styles.statsHeading}>
        Diagnosis activity
      </h2>

      <div className={styles.statsGrid}>
        <div className={styles.statTile}>
          <span className={styles.statTileValue}>{stats.totalDiagnoses}</span>
          <span className={styles.statTileLabel}>Total diagnoses</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileValue}>
            {stats.averageConfidence != null
              ? `${Math.round(stats.averageConfidence * 100)}%`
              : "—"}
          </span>
          <span className={styles.statTileLabel}>Average confidence</span>
          <span className={styles.statTileSubtext}>
            {formatTierBreakdown(stats.confidenceTierCounts)}
          </span>
        </div>
      </div>

      <div className={styles.statsColumns}>
        <div className={styles.statsBlock}>
          <h3 className={styles.statsBlockHeading}>Top root-cause categories</h3>
          {stats.topCategories.length === 0 ? (
            <p className={styles.statsEmptyText}>No categorized diagnoses yet.</p>
          ) : (
            <ul className={styles.categoryList}>
              {stats.topCategories.map((c) => (
                <li key={c.category} className={styles.categoryListItem}>
                  <span className={styles.categoryListName}>{c.category}</span>
                  <span className={styles.categoryListCount}>{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.statsBlock}>
          <h3 className={styles.statsBlockHeading}>Last 7 days</h3>
          <div
            className={styles.sparklineBars}
            role="img"
            aria-label={`Diagnoses per day, last 7 days: ${sparklineSummary}`}
          >
            {stats.dailyCounts.map((d) => (
              <div key={d.date} className={styles.sparklineBarWrap} title={`${formatShortDate(d.date)}: ${d.count}`}>
                <div
                  className={styles.sparklineBar}
                  style={{ height: maxDaily > 0 ? `${Math.round((d.count / maxDaily) * 100)}%` : "0%" }}
                />
              </div>
            ))}
          </div>
          <div className={styles.sparklineLabels} aria-hidden="true">
            {stats.dailyCounts.map((d) => (
              <span key={d.date}>{formatDayLabel(d.date)}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
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

  // Stats failures are non-fatal — the instance list above is the more
  // load-bearing part of this page, so a broken stats query shouldn't take
  // the whole dashboard down with it.
  let stats: DashboardStats | null = null;
  let statsError: string | null = null;
  try {
    stats = await getDashboardStats(ownerUserId);
  } catch (err) {
    statsError =
      err instanceof Error ? err.message : "Could not load your diagnosis stats.";
  }

  return (
    <div>
      {statsError ? (
        <div className={`${styles.loadError} ${styles.statsSectionMargin}`} role="alert">
          <div>
            <p className={styles.loadErrorTitle}>Couldn&apos;t load diagnosis activity</p>
            <p className={styles.loadErrorBody}>{statsError}</p>
          </div>
        </div>
      ) : (
        stats && <StatsSection stats={stats} />
      )}

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

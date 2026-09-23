import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboardStats, getInstancesForUser } from "@/lib/dashboard-data";
import { RevokeInstanceButton } from "./RevokeInstanceButton";
import Tag from "@/components/marketing/Tag";
import { Notice, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { TIER_META } from "@/components/confidence";
import type { ConfidenceTier, ConnectedInstance, DashboardStats } from "@/lib/types";

export const metadata: Metadata = {
  title: "My instances",
};

const TIERS: ConfidenceTier[] = ["high", "moderate", "low", "unknown"];

function formatDayLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
}

function formatShortDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function StatsSection({ stats }: { stats: DashboardStats }) {
  if (stats.totalDiagnoses === 0) {
    return (
      <section aria-labelledby="stats-heading" className="border-y border-border py-8">
        <h2 id="stats-heading" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Diagnosis activity
        </h2>
        <p className="mt-3 max-w-[60ch] text-muted">
          No diagnoses yet. Once your connected instances report failures, trends and root-cause breakdowns show up here.
        </p>
      </section>
    );
  }

  const maxDaily = Math.max(...stats.dailyCounts.map((d) => d.count), 0);
  const maxCategory = Math.max(...stats.topCategories.map((c) => c.count), 1);
  const sparklineSummary = stats.dailyCounts.map((d) => `${formatShortDate(d.date)}: ${d.count}`).join(", ");

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Diagnosis activity
      </h2>
      <div className="grid border-y border-border lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)]">
        {/* totals */}
        <div className="space-y-6 border-border py-7 lg:border-r lg:pr-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Total diagnoses</p>
            <p className="mt-2 font-mono text-5xl font-medium tabular-nums tracking-tight">{stats.totalDiagnoses}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Average confidence</p>
            <p className="mt-2 font-mono text-3xl font-medium tabular-nums tracking-tight">
              {stats.averageConfidence != null ? `${Math.round(stats.averageConfidence * 100)}%` : "—"}
            </p>
          </div>
          <div>
            <div className="flex h-1.5 overflow-hidden rounded-sm bg-border" aria-hidden="true">
              {TIERS.map((t) =>
                stats.confidenceTierCounts[t] > 0 ? (
                  <span
                    key={t}
                    className={TIER_META[t].bar}
                    style={{ width: `${(stats.confidenceTierCounts[t] / stats.totalDiagnoses) * 100}%` }}
                  />
                ) : null
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
              {TIERS.filter((t) => stats.confidenceTierCounts[t] > 0).map((t) => (
                <li key={t} className={TIER_META[t].text}>
                  {stats.confidenceTierCounts[t]} {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* categories */}
        <div className="border-t border-border py-7 lg:border-r lg:border-t-0 lg:px-8">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Top root causes</h3>
          {stats.topCategories.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No categorized diagnoses yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.topCategories.map((c) => (
                <li key={c.category}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="truncate font-mono text-xs">{c.category}</span>
                    <span className="font-mono text-xs tabular-nums text-muted">{c.count}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-sm bg-border">
                    <div className="h-full rounded-sm bg-accent/70" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* last 7 days */}
        <div className="border-t border-border py-7 lg:border-t-0 lg:pl-8">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Last 7 days</h3>
          <div className="mt-4 flex h-32 items-end gap-2" role="img" aria-label={`Diagnoses per day, last 7 days: ${sparklineSummary}`}>
            {stats.dailyCounts.map((d) => (
              <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${formatShortDate(d.date)}: ${d.count}`}>
                <span className="mb-1 text-center font-mono text-[10px] tabular-nums text-muted">{d.count > 0 ? d.count : ""}</span>
                <div
                  className={"w-full rounded-t-sm " + (d.count > 0 ? "bg-foreground/70" : "bg-border")}
                  style={{ height: maxDaily > 0 && d.count > 0 ? `${Math.max(4, Math.round((d.count / maxDaily) * 100))}%` : "2px" }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 font-mono text-[10px] text-muted" aria-hidden="true">
            {stats.dailyCounts.map((d) => (
              <span key={d.date} className="flex-1 text-center">
                {formatDayLabel(d.date)}
              </span>
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
    loadError = err instanceof Error ? err.message : "Could not load your connected instances.";
  }

  // Stats failures are non-fatal — the instance list is the more
  // load-bearing part of this page, so a broken stats query shouldn't take
  // the whole dashboard down with it.
  let stats: DashboardStats | null = null;
  let statsError: string | null = null;
  try {
    stats = await getDashboardStats(ownerUserId);
  } catch (err) {
    statsError = err instanceof Error ? err.message : "Could not load your diagnosis stats.";
  }

  return (
    <div className="space-y-[clamp(3rem,6vw,5rem)]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Tag>overview</Tag>
          <h1 className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">Your instances</h1>
          <p className="mt-4 max-w-[56ch] leading-relaxed text-muted">
            n8n instances you&apos;ve connected for ongoing monitoring. Each keeps its own log of diagnosed failures and
            suggested fixes.
          </p>
        </div>
        <Link href="/dashboard/connect" className={primaryButtonClass}>
          <Plus className="size-4" aria-hidden="true" /> Connect instance
        </Link>
      </div>

      {statsError ? (
        // Non-fatal by design: a warning notice (triangle icon, polite), so it
        // doesn't read as the same failure as the instance-list error below.
        <Notice tone="warning" title="Diagnosis activity is temporarily unavailable" role="status">
          {statsError}
        </Notice>
      ) : (
        stats && <StatsSection stats={stats} />
      )}

      <section aria-labelledby="instances-heading">
        <h2 id="instances-heading" className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Connected
        </h2>

        {loadError && (
          <Notice tone="error" title="Couldn't load your instances" role="alert">
            {loadError}
          </Notice>
        )}

        {!loadError && instances.length === 0 && (
          <div className="border-y border-border py-[clamp(2.5rem,5vw,4rem)]">
            <p className="text-[clamp(1.75rem,3.5vw,3rem)] font-semibold leading-none tracking-[-0.03em]">Add your first workflow.</p>
            <p className="mt-4 max-w-[58ch] leading-relaxed text-muted">
              Connect your n8n instance&apos;s base URL and an API key, then pick which workflow to protect. Insight
              installs failure flagging on it for you, no manual n8n editing.
            </p>
            <Link href="/dashboard/connect" className={primaryButtonClass + " mt-8"}>
              <Plus className="size-4" aria-hidden="true" /> Connect an instance
            </Link>
          </div>
        )}

        {!loadError && instances.length > 0 && (
          <ul className="border-t border-border">
            {instances.map((instance, i) => (
              <li key={instance.id} className="border-b border-border">
                <div className="grid items-center gap-x-6 gap-y-3 py-6 md:grid-cols-[3rem_minmax(0,1fr)_7rem_auto]">
                  <span className="hidden font-mono text-xs text-muted md:block">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/instances/${instance.id}`}
                      className="group inline-flex items-baseline gap-2 text-[clamp(1.4rem,2.6vw,2.25rem)] font-semibold leading-tight tracking-[-0.03em]"
                    >
                      <span className="truncate transition-transform duration-300 group-hover:translate-x-1">{instance.label}</span>
                      <ArrowUpRight className="size-5 shrink-0 text-muted transition-colors group-hover:text-accent" aria-hidden="true" />
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
                      <span className="truncate">{instance.baseUrl}</span>
                      <span className={instance.status === "active" ? "text-success" : "text-muted"}>
                        {instance.status === "active" ? "● active" : "○ revoked"}
                      </span>
                    </p>
                  </div>
                  <div className="font-mono">
                    <span className="text-2xl font-medium tabular-nums">{instance.diagnosisCount}</span>
                    <span className="ml-2 text-xs text-muted">diagnoses</span>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {instance.status === "active" && (
                      <Link href={`/dashboard/instances/${instance.id}`} className={secondaryButtonClass}>
                        <Plus className="size-3.5" aria-hidden="true" /> Add workflow
                      </Link>
                    )}
                    {instance.status === "active" && <RevokeInstanceButton instanceId={instance.id} label={instance.label} />}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

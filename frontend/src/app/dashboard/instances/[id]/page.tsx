import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDiagnosesForInstance, getInstanceById } from "@/lib/dashboard-data";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { WorkflowList } from "@/components/WorkflowList";
import styles from "../../dashboard.module.css";

export const metadata: Metadata = {
  title: "Diagnosis log — Insight",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function InstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const ownerUserId = session!.user.id;

  let instance;
  let diagnoses;
  let loadError: string | null = null;

  try {
    // Ownership check: getInstanceById filters by owner_user_id itself, so
    // an instance that exists but belongs to another user comes back as
    // null here — identical to "doesn't exist." That's deliberate: the
    // response must not let a signed-in user distinguish "not yours" from
    // "no such instance" by guessing IDs in the URL.
    instance = await getInstanceById(id, ownerUserId);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load this instance.";
    instance = null;
  }

  if (loadError) {
    return (
      <div>
        <Link href="/dashboard" className={styles.backLink}>
          ← My instances
        </Link>
        <div className={styles.loadError} role="alert">
          <div>
            <p className={styles.loadErrorTitle}>Couldn&apos;t load this instance</p>
            <p className={styles.loadErrorBody}>{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!instance) {
    notFound();
  }

  try {
    diagnoses = await getDiagnosesForInstance(instance.id);
  } catch (err) {
    return (
      <div>
        <Link href="/dashboard" className={styles.backLink}>
          ← My instances
        </Link>
        <div className={styles.loadError} role="alert">
          <div>
            <p className={styles.loadErrorTitle}>Couldn&apos;t load the diagnosis log</p>
            <p className={styles.loadErrorBody}>
              {err instanceof Error ? err.message : "Something went wrong reading diagnoses."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/dashboard" className={styles.backLink}>
        ← My instances
      </Link>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageHeading}>{instance.label}</h1>
          <p className={styles.pageSubtitle}>{instance.baseUrl}</p>
        </div>
      </div>

      <WorkflowList instanceId={instance.id} />

      {diagnoses.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>No diagnoses yet</p>
          <p className={styles.emptyStateBody}>
            Once this instance reports a failed execution via its Error
            Trigger webhook, the diagnosis will show up here.
          </p>
        </div>
      ) : (
        <div className={styles.diagnosisList}>
          {diagnoses.map((d) => (
            <div key={d.id} className={styles.diagnosisCard}>
              <div className={styles.diagnosisHeader}>
                <span className={styles.diagnosisTimestamp}>{formatDate(d.createdAt)}</span>
                {d.rootCauseCategory && (
                  <span className={styles.categoryBadgeMuted}>{d.rootCauseCategory}</span>
                )}
              </div>

              {d.failingNode && (
                <div className={styles.diagnosisRow}>
                  <p className={styles.diagnosisRowLabel}>Failing node</p>
                  <p className={styles.nodeValueMono}>{d.failingNode}</p>
                </div>
              )}

              <div className={styles.diagnosisRow}>
                <p className={styles.diagnosisRowLabel}>Confidence</p>
                <ConfidenceMeter confidence={d.confidence} />
              </div>

              {d.explanation && (
                <div className={styles.diagnosisRow}>
                  <p className={styles.diagnosisRowLabel}>What likely happened</p>
                  <p className={styles.plainText}>{d.explanation}</p>
                </div>
              )}

              {d.suggestedFix && (
                <div className={styles.diagnosisRow}>
                  <p className={styles.diagnosisRowLabel}>Suggested fix</p>
                  <pre className={styles.suggestedFixBlock}>{d.suggestedFix}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

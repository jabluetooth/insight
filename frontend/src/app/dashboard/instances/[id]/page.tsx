import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDiagnosesForInstance, getInstanceById } from "@/lib/dashboard-data";
import { WorkflowList } from "@/components/WorkflowList";
import { DiagnosisView } from "@/components/DiagnosisView";
import { Notice } from "@/components/ui";
import Tag from "@/components/marketing/Tag";

export const metadata: Metadata = {
  title: "Diagnosis log",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="font-mono text-xs uppercase tracking-[0.08em] text-muted underline decoration-border underline-offset-4 hover:text-foreground"
    >
      ← My instances
    </Link>
  );
}

export default async function InstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      <div className="space-y-6">
        <BackLink />
        <Notice tone="error" title="Couldn't load this instance" role="alert">
          {loadError}
        </Notice>
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
      <div className="space-y-6">
        <BackLink />
        <Notice tone="error" title="Couldn't load the diagnosis log" role="alert">
          {err instanceof Error ? err.message : "Something went wrong reading diagnoses."}
        </Notice>
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <div className="mt-8">
        <Tag>instance</Tag>
        <h1 className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">{instance.label}</h1>
        <p className="mt-3 flex flex-wrap gap-x-4 font-mono text-xs text-muted">
          <span>{instance.baseUrl}</span>
          <span className={instance.status === "active" ? "text-success" : ""}>
            {instance.status === "active" ? "● active" : "○ revoked"}
          </span>
        </p>
      </div>

      <WorkflowList instanceId={instance.id} />

      <section className="mt-[clamp(3rem,6vw,5rem)]" aria-labelledby="log-heading">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="log-heading" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            Diagnosis log
          </h2>
          <span className="font-mono text-xs text-muted">{diagnoses.length} total</span>
        </div>

        {diagnoses.length === 0 ? (
          <div className="border-y border-border py-8">
            <p className="text-xl font-semibold tracking-[-0.02em]">No diagnoses yet.</p>
            <p className="mt-2 max-w-[58ch] leading-relaxed text-muted">
              Once this instance reports a failed execution through its Error Trigger, the diagnosis shows up here.
            </p>
          </div>
        ) : (
          <ol className="border-t border-border">
            {diagnoses.map((d) => (
              <li key={d.id} className="grid gap-x-10 gap-y-4 border-b border-border py-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="space-y-1 font-mono text-xs text-muted">
                  <p className="text-foreground">{formatDate(d.createdAt)}</p>
                  <p>execution {d.executionId}</p>
                  {d.source && <p>via {d.source}</p>}
                </div>
                <DiagnosisView d={d} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

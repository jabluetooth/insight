import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { tierOf } from "@/components/confidence";

interface Diagnosis {
  failingNode?: string | null;
  rootCauseCategory?: string | null;
  explanation?: string | null;
  confidence?: number | null;
  suggestedFix?: string | null;
}

/**
 * The body of one diagnosis, shared by the public result and each row of the
 * dashboard log. A low-confidence result is visibly hedged: a note above the
 * explanation, and the fix relabelled and drawn dashed as something to
 * verify (PRD FR-7).
 */
export function DiagnosisView({ d }: { d: Diagnosis }) {
  const low = tierOf(d.confidence) === "low";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <dl className="space-y-3">
          {d.failingNode && (
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Failing node</dt>
              <dd className="mt-1 font-mono text-lg">{d.failingNode}</dd>
            </div>
          )}
          {d.rootCauseCategory && (
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Root cause</dt>
              <dd className="mt-1 font-mono text-sm text-accent">{d.rootCauseCategory}</dd>
            </div>
          )}
        </dl>
        <ConfidenceMeter confidence={d.confidence} />
      </div>

      {d.explanation && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">What likely happened</p>
          {low && (
            <p className="rounded-sm border-l-2 border-danger bg-danger/[0.06] px-3 py-2 text-sm">
              Confidence is low. Treat this as a lead to investigate, not a confirmed root cause.
            </p>
          )}
          <p className="max-w-[68ch] leading-relaxed">{d.explanation}</p>
        </div>
      )}

      {d.suggestedFix && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            {low ? "Possible fix · verify before applying" : "Suggested fix"}
          </p>
          <pre
            className={
              "overflow-x-auto whitespace-pre-wrap break-words rounded-sm border bg-background px-4 py-3 font-mono text-[13px] leading-relaxed " +
              (low ? "border-dashed border-border text-muted" : "border-border")
            }
          >
            {d.suggestedFix}
          </pre>
        </div>
      )}
    </div>
  );
}

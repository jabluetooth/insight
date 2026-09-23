import { tierOf, TIER_META } from "@/components/confidence";

// Shared presentational component, so the confidence-tier visual is defined
// once and used identically on the public /diagnose result and the
// dashboard's diagnosis log (PRD §2.1: a low-confidence result must visibly
// read as hedged everywhere it's shown). Icon, word and colour together.
export function ConfidenceMeter({ confidence }: { confidence: number | null | undefined }) {
  const tier = tierOf(confidence);
  const meta = TIER_META[tier];
  const percent = confidence != null && !Number.isNaN(confidence) ? Math.round(confidence * 100) : null;
  const Icon = meta.Icon;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className={"inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.08em] " + meta.text}>
          <Icon className="size-3.5 translate-y-[2px]" aria-hidden="true" />
          {meta.label}
        </span>
        {percent != null && <span className="font-mono text-2xl font-medium tabular-nums tracking-tight">{percent}%</span>}
      </div>
      {percent != null && (
        <div
          className="relative h-1.5 overflow-hidden rounded-sm bg-border"
          role="meter"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Diagnosis confidence: ${percent}%, ${meta.label.toLowerCase()}`}
        >
          <div className={"absolute inset-y-0 left-0 " + meta.bar} style={{ width: `${percent}%` }} />
          {[40, 70].map((t) => (
            <span key={t} aria-hidden="true" className="absolute inset-y-0 w-px bg-background" style={{ left: `${t}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

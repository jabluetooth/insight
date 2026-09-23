import { CircleAlert, CircleCheck, TriangleAlert, Info } from "lucide-react";

// Small shared pieces for the product pages (forms, notices, headings), so
// the diagnose page and the dashboard share one set of controls with the
// public site instead of each carrying its own CSS module.

export const inputClass =
  "w-full rounded border border-border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted/60 transition-colors hover:border-foreground/25 focus:border-accent focus:outline-none aria-[invalid=true]:border-danger";

export const primaryButtonClass =
  "group inline-flex items-center justify-center gap-2 rounded bg-accent px-5 py-3 font-mono text-sm font-medium uppercase tracking-[0.06em] text-accent-foreground transition-transform hover:-translate-y-0.5 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded border border-border px-3.5 py-2 font-mono text-xs uppercase tracking-[0.08em] text-muted transition-colors hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-50";

export const monoLabelClass = "font-mono text-[11px] uppercase tracking-[0.12em] text-muted";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={"block " + monoLabelClass}>
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="max-w-[60ch] text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const TONES = {
  error: { Icon: CircleAlert, className: "border-danger/50 border-l-danger bg-danger/[0.06]", title: "text-danger" },
  warning: { Icon: TriangleAlert, className: "border-warning/50 border-l-warning bg-warning/[0.06]", title: "text-warning" },
  success: { Icon: CircleCheck, className: "border-success/50 border-l-success bg-success/[0.06]", title: "text-success" },
  info: { Icon: Info, className: "border-border border-l-accent bg-surface", title: "text-accent" },
} as const;

/** A notice with a left rule, an icon and a mono title: state is never colour alone. */
export function Notice({
  tone,
  title,
  children,
  role,
  className = "",
}: {
  tone: keyof typeof TONES;
  title: string;
  children?: React.ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div role={role} className={"flex gap-3 rounded border border-l-4 p-4 sm:p-5 " + t.className + " " + className}>
      <t.Icon className={"mt-0.5 size-4 shrink-0 " + t.title} aria-hidden="true" />
      <div className="min-w-0 space-y-1.5">
        <p className={"font-mono text-xs uppercase tracking-[0.1em] " + t.title}>{title}</p>
        {children && <div className="text-sm leading-relaxed text-foreground/90">{children}</div>}
      </div>
    </div>
  );
}

export function Spinner() {
  return <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

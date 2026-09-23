import type { Metadata } from "next";
import Link from "next/link";
import Tag from "@/components/marketing/Tag";
import { ConnectInstanceForm } from "./ConnectInstanceForm";

export const metadata: Metadata = {
  title: "Connect an instance",
};

const ALLOWLIST = [
  ["read", "executions and workflows"],
  ["write", "create + activate Insight's template"],
  ["write", "one workflow's errorWorkflow setting"],
  ["never", "your workflows' nodes or connections"],
] as const;

export default function ConnectInstancePage() {
  return (
    <div className="grid gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Tag>connect</Tag>
        <h1 className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
          Connect an
          <br />
          n8n instance.
        </h1>
        <p className="mt-6 max-w-[46ch] leading-relaxed text-muted">
          Insight uses this key to read execution data, and only when you click <strong className="text-foreground">Add workflow</strong>{" "}
          on a specific workflow, to install its error-workflow template. The key is encrypted at rest and never shown
          back to you after this step.
        </p>
        <dl className="mt-8 max-w-sm border-t border-border font-mono text-xs">
          {ALLOWLIST.map(([k, v], i) => (
            <div key={i} className="flex gap-6 border-b border-border py-3">
              <dt className={"w-12 shrink-0 " + (k === "write" ? "text-warning" : k === "never" ? "text-success" : "text-muted")}>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <Link
          href="/security#calls"
          className="mt-4 inline-block font-mono text-xs text-muted underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-accent"
        >
          The full endpoint allowlist
        </Link>
      </div>
      <ConnectInstanceForm />
    </div>
  );
}

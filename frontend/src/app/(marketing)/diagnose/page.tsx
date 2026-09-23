import type { Metadata } from "next";
import Link from "next/link";
import Tag from "@/components/marketing/Tag";
import { LineReveal, Rise } from "@/components/marketing/Reveal";
import CodeBlock from "@/components/marketing/CodeBlock";
import { NPM_PACKAGE } from "@/lib/site";
import { DiagnoseForm } from "./DiagnoseForm";

export const metadata: Metadata = {
  title: "Diagnose a failure",
  description:
    "Upload a failed n8n execution, or give an execution id with your instance details, and get the failing node, the root cause, a confidence score and a fix. No account needed.",
};

const NOTES = [
  ["account", "none needed"],
  ["your key", "one request, then cleared"],
  ["stored", "nothing from this page"],
  ["limit", "5 diagnoses / min"],
] as const;

export default function DiagnosePage() {
  return (
    <section className="px-[5vw] pt-[clamp(2.5rem,6vw,6rem)]">
      <div className="grid gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Rise inView={false}>
            <Tag>diagnose</Tag>
          </Rise>
          <LineReveal
            as="h1"
            inView={false}
            delay={0.1}
            className="mt-6 text-[clamp(2.5rem,5.4vw,5.75rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
            lines={["Paste the", "failure. Get", "the cause."]}
          />
          <Rise inView={false} delay={0.4}>
            <p className="mt-8 max-w-[44ch] leading-relaxed text-muted">
              Upload the failed execution, or point Insight at it on your instance. Secrets are redacted before a model
              ever sees it, and nothing you enter here is kept.
            </p>
            <dl className="mt-8 max-w-sm border-t border-border font-mono text-xs">
              {NOTES.map(([k, v]) => (
                <div key={k} className="flex gap-6 border-b border-border py-3">
                  <dt className="w-20 shrink-0 text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-10 max-w-sm">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                localhost instance? use the terminal
              </p>
              <CodeBlock prompt code={`npx ${NPM_PACKAGE} diagnose file.json`} />
              <Link
                href="/get-started#terminal"
                className="mt-3 inline-block font-mono text-xs text-muted underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-accent"
              >
                How the CLI works
              </Link>
            </div>
          </Rise>
        </div>

        <Rise inView={false} delay={0.3} y={20}>
          <DiagnoseForm />
        </Rise>
      </div>
    </section>
  );
}

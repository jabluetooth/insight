import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Tag from "@/components/marketing/Tag";
import { LineReveal, Rise, DrawLine } from "@/components/marketing/Reveal";
import ExecutionDemo from "@/components/marketing/ExecutionDemo";
import FailureList from "@/components/marketing/FailureList";
import ConfidenceDial from "@/components/marketing/ConfidenceDial";
import CodeBlock from "@/components/marketing/CodeBlock";
import { NPM_PACKAGE } from "@/lib/site";

const WAYS_IN = [
  {
    href: "/diagnose",
    name: "Paste",
    meta: "no account",
    text: "Upload an exported execution, or give an execution id with your instance URL and a key used for that one request.",
  },
  {
    href: "/get-started#terminal",
    name: "Terminal",
    meta: `npx ${NPM_PACKAGE}`,
    text: "Same diagnosis from your shell. Secrets are redacted on your machine, and it reaches localhost instances the website can't.",
  },
  {
    href: "/dashboard",
    name: "Monitor",
    meta: "sign in",
    text: "Connect an instance, pick the workflows to protect, and every future failure is diagnosed and sent to Slack on its own.",
  },
] as const;

const TRUST = [
  ["redact", "before any LLM call, and before storage"],
  ["your key", "public page: memory, one request"],
  ["stored key", "AES-256-GCM at rest"],
  ["token", "ingest token SHA-256 hashed"],
  ["writes", "3 allowlisted endpoints, named"],
] as const;

export default function HomePage() {
  return (
    <>
      {/* HERO — asymmetric 7/5 split, the demo offset lower */}
      <section className="px-[5vw] pb-[clamp(4rem,9vw,9rem)] pt-[clamp(2.5rem,6vw,6rem)]">
        <div className="grid items-start gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <Rise inView={false}>
              <Tag>n8n · root cause</Tag>
            </Rise>
            <LineReveal
              as="h1"
              inView={false}
              delay={0.1}
              className="mt-6 text-[clamp(2.5rem,5.6vw,6.5rem)] font-semibold leading-[0.96] tracking-[-0.04em]"
              lines={[
                "Your workflow",
                "failed. Here's",
                "the node, and why.",
                <span key="c" className="text-muted">
                  Or: not sure.
                </span>,
              ]}
            />
            <Rise inView={false} delay={0.55}>
              <p className="mt-8 max-w-[52ch] text-lg leading-relaxed text-muted">
                Insight reads a failed n8n execution so you don&apos;t have to go node by node through raw JSON. It names
                the node that broke, the likely cause and the fix, with a confidence score that hedges when it should.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href="/diagnose"
                  className="group inline-flex items-center gap-2 rounded bg-accent px-5 py-3 font-mono text-sm font-medium uppercase tracking-[0.06em] text-accent-foreground transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  Diagnose a failure
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="font-mono text-sm uppercase tracking-[0.06em] text-muted underline decoration-border decoration-1 underline-offset-8 transition-colors hover:text-foreground hover:decoration-accent"
                >
                  How it works
                </Link>
              </div>
              <div className="mt-10 max-w-md">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">try it without signing up</p>
                <CodeBlock prompt code={`npx ${NPM_PACKAGE} demo`} />
              </div>
            </Rise>
          </div>

          <Rise inView={false} delay={0.4} y={28} className="lg:mt-20">
            <ExecutionDemo />
          </Rise>
        </div>
      </section>

      {/* FAILURE MODES — sticky heading, expanding rows */}
      <section className="px-[5vw] pt-[clamp(4rem,10vw,10rem)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Tag>root causes</Tag>
            <LineReveal
              className="mt-5 text-[clamp(2rem,4.4vw,4.25rem)] font-semibold leading-[1] tracking-[-0.035em]"
              lines={["n8n breaks", "in familiar", "ways."]}
            />
            <Rise delay={0.2}>
              <p className="mt-6 max-w-[36ch] leading-relaxed text-muted">
                Most failures are one of a handful of patterns, several of them specific to how n8n moves data between
                nodes. Insight names which one, and where.
              </p>
            </Rise>
          </div>
          <FailureList />
        </div>
      </section>

      {/* THE HEDGE — the differentiator, given the biggest gap above it */}
      <section className="px-[5vw] pt-[clamp(7rem,16vw,16rem)]">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <div>
            <Tag>calibration</Tag>
            <LineReveal
              className="mt-5 text-[clamp(2.25rem,5.6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.04em]"
              lines={["A confident wrong", "fix costs you", "an afternoon."]}
            />
          </div>
          <Rise delay={0.15}>
            <p className="max-w-[44ch] leading-relaxed text-muted">
              Every diagnosis carries a confidence score. Under 0.40 Insight says it&apos;s a lead, not an answer, and
              offers the fix as something to verify. Above 0.70 it gives the exact field or expression to change.
            </p>
          </Rise>
        </div>
        <div className="mt-[clamp(2.5rem,5vw,5rem)]">
          <ConfidenceDial />
        </div>
      </section>

      {/* WAYS IN — editorial rows, each a real route */}
      <section className="px-[5vw] pt-[clamp(5rem,11vw,11rem)]">
        <div className="mb-8">
          <Tag>three ways in</Tag>
        </div>
        <ul className="border-t border-border">
          {WAYS_IN.map((row, i) => (
            <li key={row.href} className="border-b border-border">
              <Rise delay={i * 0.06}>
                <Link
                  href={row.href}
                  className="group grid items-baseline gap-x-6 gap-y-2 py-7 md:grid-cols-[5rem_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,1.1fr)_2rem]"
                >
                  <span className="font-mono text-xs text-muted">0{i + 1}</span>
                  <span className="text-[clamp(1.75rem,3.6vw,3.25rem)] font-semibold leading-none tracking-[-0.03em] transition-transform duration-300 group-hover:translate-x-2">
                    {row.name}
                  </span>
                  <span className="font-mono text-xs text-accent">{row.meta}</span>
                  <span className="max-w-[52ch] leading-relaxed text-muted">{row.text}</span>
                  <ArrowUpRight
                    className="hidden size-5 place-self-center text-muted transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent md:block"
                    aria-hidden="true"
                  />
                </Link>
              </Rise>
            </li>
          ))}
        </ul>
      </section>

      {/* TRUST — big statement left, mono facts right */}
      <section className="px-[5vw] pt-[clamp(6rem,14vw,14rem)]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <LineReveal
            as="h2"
            className="text-[clamp(2.5rem,7vw,7rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
            lines={["Secrets out", "first. Writes", "by name."]}
          />
          <div className="self-end">
            <dl className="font-mono text-sm">
              {TRUST.map(([k, v], i) => (
                <div key={k}>
                  <DrawLine delay={i * 0.08} />
                  <Rise delay={i * 0.08} y={8}>
                    <div className="flex gap-6 py-4">
                      <dt className="w-24 shrink-0 text-muted">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  </Rise>
                </div>
              ))}
              <DrawLine delay={0.45} />
            </dl>
            <Rise delay={0.2}>
              <p className="mt-6 max-w-[46ch] text-sm leading-relaxed text-muted">
                Execution data can hold real customer data from your own integrations. The redacted execution goes to
                Groq to be diagnosed, and only a metadata row is kept. The security page lists what goes where.
              </p>
              <Link
                href="/security"
                className="group mt-5 inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.06em] underline decoration-border underline-offset-8 transition-colors hover:decoration-accent"
              >
                Read the security model
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Rise>
          </div>
        </div>
      </section>
    </>
  );
}

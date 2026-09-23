import type { Metadata } from "next";
import Tag from "@/components/marketing/Tag";
import { LineReveal, Rise } from "@/components/marketing/Reveal";
import Pipeline from "@/components/marketing/Pipeline";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Seven stages from a failed n8n execution to a calibrated diagnosis: trigger, fetch, redact, short-circuit, retrieve, diagnose, deliver. Including the one that's switched off.",
};

const MONITORING = [
  ["Connect", "Base URL and an n8n API key", "The key is encrypted at rest; you get a per-instance ingest token", "Nothing on your instance changes yet"],
  ["Scan", "Insight lists every workflow on the instance", "Each is flagged monitored or not", "Read-only calls"],
  ["Add workflow", "One click on a workflow", "Insight installs its error-workflow template once, activates it, and points that workflow's Error Workflow setting at it", "Never touches the workflow's own nodes or connections"],
  ["Fail", "The workflow breaks in production", "The template posts the execution id to Insight; the full pipeline runs", "Your instance has to be reachable from the internet"],
] as const;

const STATUS = [
  ["Diagnosis pipeline", "live", "Fetch, redact, short-circuit, diagnose and store, end to end"],
  ["Public diagnose page", "live", "Upload or execution id, no account"],
  ["Monitoring and Slack alerts", "live", "Connect, add workflow, diagnosed on failure"],
  ["npx insight-n8n", "live", "Redaction runs locally; diagnosis runs locally with your Groq key, or on the hosted pipeline"],
  ["Knowledge-base retrieval", "built, off", "Waiting on a seeded Qdrant collection of real failure patterns"],
  ["Accuracy scorecard", "not yet", "The PRD targets 85% on a 25-case eval set; it hasn't been run with retrieval on, so there is no number to show"],
] as const;

export default function HowItWorksPage() {
  return (
    <>
      <section className="px-[5vw] pb-[clamp(2rem,4vw,4rem)] pt-[clamp(2.5rem,6vw,6rem)]">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-16">
          <div>
            <Rise inView={false}>
              <Tag>pipeline</Tag>
            </Rise>
            <LineReveal
              as="h1"
              inView={false}
              delay={0.1}
              className="mt-6 text-[clamp(2.75rem,8vw,8.5rem)] font-semibold leading-[0.93] tracking-[-0.045em]"
              lines={["From a red node", "to a named cause."]}
            />
          </div>
          <Rise inView={false} delay={0.45}>
            <p className="max-w-[40ch] leading-relaxed text-muted">
              The pipeline is itself an n8n workflow, so Insight runs on the platform it diagnoses. Scroll and each stage
              lights up with what it does. The one that&apos;s switched off says so.
            </p>
          </Rise>
        </div>
      </section>

      <section className="px-[5vw] pt-[clamp(1rem,3vw,3rem)]">
        <Pipeline />
      </section>

      <section className="px-[5vw] pt-[clamp(5rem,11vw,11rem)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Tag>monitoring</Tag>
            <LineReveal
              className="mt-5 text-[clamp(2rem,4.4vw,4.25rem)] font-semibold leading-[1] tracking-[-0.035em]"
              lines={["Diagnosed", "before you", "look."]}
            />
            <Rise delay={0.2}>
              <p className="mt-6 max-w-[36ch] text-sm leading-relaxed text-muted">
                The public page answers one failure at a time. Connecting an instance means the next failure is diagnosed
                the moment it happens, and the answer is already in Slack when you open it.
              </p>
            </Rise>
          </div>
          <Rise>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <caption className="sr-only">How monitoring a connected instance works</caption>
                <thead>
                  <tr className="border-b border-border font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    <th scope="col" className="py-3 pr-4 font-normal">Step</th>
                    <th scope="col" className="py-3 pr-4 font-normal">You</th>
                    <th scope="col" className="py-3 pr-4 font-normal">Insight</th>
                    <th scope="col" className="py-3 font-normal">Worth knowing</th>
                  </tr>
                </thead>
                <tbody>
                  {MONITORING.map(([step, you, what, note]) => (
                    <tr key={step} className="border-b border-border align-top">
                      <th scope="row" className="py-4 pr-4 font-medium">{step}</th>
                      <td className="py-4 pr-4 text-muted">{you}</td>
                      <td className="py-4 pr-4 text-muted">{what}</td>
                      <td className="py-4 font-mono text-xs text-accent">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Rise>
        </div>
      </section>

      <section className="px-[5vw] pt-[clamp(6rem,13vw,13rem)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Tag>status</Tag>
            <LineReveal
              className="mt-5 text-[clamp(2rem,4.4vw,4.25rem)] font-semibold leading-[1] tracking-[-0.035em]"
              lines={["What's live,", "and what", "isn't yet."]}
            />
            <Rise delay={0.2}>
              <p className="mt-6 max-w-[36ch] text-sm leading-relaxed text-muted">
                The headline number for a tool like this is accuracy with retrieval switched on. That number doesn&apos;t
                exist yet, so this page doesn&apos;t pretend it does.
              </p>
            </Rise>
          </div>
          <Rise>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Current status of each part of Insight</caption>
              <tbody>
                {STATUS.map(([name, state, note]) => (
                  <tr key={name} className="border-b border-border align-baseline first:border-t">
                    <th scope="row" className="w-[34%] py-4 pr-4 font-medium">{name}</th>
                    <td
                      className={
                        "w-28 py-4 pr-4 font-mono text-xs uppercase tracking-[0.08em] " +
                        (state === "live" ? "text-success" : state === "not yet" ? "text-muted" : "text-warning")
                      }
                    >
                      {state === "live" ? "● " : "○ "}
                      {state}
                    </td>
                    <td className="py-4 text-muted">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rise>
        </div>
      </section>
    </>
  );
}

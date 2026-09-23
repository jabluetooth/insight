"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ShieldCheck, X, Clock } from "lucide-react";
import { EASE } from "@/components/marketing/Reveal";
import { useReducedMotionSafe } from "@/components/marketing/useReducedMotion";
import { tierOf, TIER_META } from "@/components/confidence";

interface Scenario {
  id: string;
  tab: string;
  workflow: string;
  nodes: string[];
  /** index of the node that threw; later nodes never ran */
  failAt: number;
  error: string;
  redacted: string;
  result:
    | { kind: "diagnosis"; node: string; category: string; confidence: number; explanation: string; fix: string }
    | { kind: "transient"; message: string };
}

// Sample data on purpose, the same four failures `npx insight-n8n demo`
// ships with. The behaviour it plays (redact, short-circuit, calibrate) is
// real; the confidence numbers are examples of what a run returns.
const SCENARIOS: Scenario[] = [
  {
    id: "shape",
    tab: "shape changed",
    workflow: "Order confirmations",
    nodes: ["Order Webhook", "Fetch Order", "Build Email", "Send Confirmation"],
    failAt: 2,
    error: "Cannot read properties of undefined (reading 'email')",
    redacted: "2 values · Authorization header, webhook signature",
    result: {
      kind: "diagnosis",
      node: "Build Email",
      category: "upstream data shape changed",
      confidence: 0.86,
      explanation: "Fetch Order now returns the order under data, so $json.customer is undefined. The email is at data.customer.email.",
      fix: "to = {{ $json.data.customer.email }}",
    },
  },
  {
    id: "auth",
    tab: "auth expired",
    workflow: "Morning invoice digest",
    nodes: ["Every Morning", "Get Invoices", "Post to Slack"],
    failAt: 1,
    error: "401 · Authorization failed - please check your credentials",
    redacted: "nothing secret-shaped found",
    result: {
      kind: "diagnosis",
      node: "Get Invoices",
      category: "credential/auth",
      confidence: 0.91,
      explanation: "Xero answered invalid_grant: the refresh token behind “Xero - finance (prod)” expired, so the request is refused before it reaches Invoices.",
      fix: "Reconnect the Xero - finance (prod) credential. The workflow itself is fine.",
    },
  },
  {
    id: "binary",
    tab: "binary dropped",
    workflow: "Client contract intake",
    nodes: ["Contract Upload", "Verify JWT", "Upload Contract"],
    failAt: 2,
    error: "expects a binary file 'data', but none was found [item 0]",
    redacted: "1 value · bearer JWT in the webhook headers",
    result: {
      kind: "diagnosis",
      node: "Verify JWT",
      category: "configuration",
      confidence: 0.64,
      explanation: "The JWT node rebuilds each item from the token payload, so the PDF from Contract Upload never arrives. The cause is one node before the error.",
      fix: "Merge the webhook item back in after Verify JWT, or read the file from $('Contract Upload').",
    },
  },
  {
    id: "transient",
    tab: "transient",
    workflow: "Demo requests to CRM",
    nodes: ["Form Submitted", "Update CRM"],
    failAt: 1,
    error: "timeout of 10000ms exceeded · ETIMEDOUT",
    redacted: "1 value · api_key in the request URL",
    result: {
      kind: "transient",
      message: "The CRM didn't answer in 10s. No code-level cause, so no model call was made. Re-run it; if it keeps failing, it isn't transient.",
    },
  },
];

type Phase = "running" | "failed" | "redacting" | "thinking" | "done";
const ORDER: Phase[] = ["running", "failed", "redacting", "thinking", "done"];

function NodeChip({ name, state }: { name: string; state: "idle" | "ok" | "fail" | "skipped" }) {
  return (
    <div
      className={
        "flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-1 font-mono text-[11px] transition-colors duration-300 " +
        (state === "fail"
          ? "border-danger/60 bg-danger/10 text-danger"
          : state === "ok"
            ? "border-border text-foreground"
            : state === "skipped"
              ? "border-dashed border-border text-muted/50"
              : "border-border text-muted/60")
      }
    >
      {state === "ok" && <Check className="size-3 text-success" aria-hidden="true" />}
      {state === "fail" && <X className="size-3" aria-hidden="true" />}
      {name}
    </div>
  );
}

export default function ExecutionDemo() {
  const reduced = useReducedMotionSafe();
  const [index, setIndex] = useState(0);
  const [lit, setLit] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const s = SCENARIOS[index];

  useEffect(() => {
    if (reduced) return;
    const sc = SCENARIOS[index];
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    (async () => {
      setPhase("running");
      setLit(0);
      for (let i = 1; i <= sc.failAt + 1; i++) {
        await sleep(420);
        if (cancelled) return;
        setLit(i);
      }
      setPhase("failed");
      await sleep(900);
      if (cancelled) return;
      setPhase("redacting");
      await sleep(900);
      if (cancelled) return;
      setPhase("thinking");
      await sleep(sc.result.kind === "transient" ? 350 : 1100);
      if (cancelled) return;
      setPhase("done");
      await sleep(5200);
      // Hovering or focusing the demo holds it on the finished diagnosis.
      while (pausedRef.current && !cancelled) await sleep(250);
      if (!cancelled) setIndex((i) => (i + 1) % SCENARIOS.length);
    })();

    return () => {
      cancelled = true;
    };
  }, [index, reduced]);

  // Reduced motion: no playback, the finished run is simply shown and the
  // tabs are the only thing that changes it.
  const shownPhase: Phase = reduced ? "done" : phase;
  const shownLit = reduced ? s.failAt + 1 : lit;
  const reached = (p: Phase) => ORDER.indexOf(shownPhase) >= ORDER.indexOf(p);

  function hold(value: boolean) {
    pausedRef.current = value;
    setPaused(value);
  }

  function nodeState(i: number): "idle" | "ok" | "fail" | "skipped" {
    if (i < shownLit - 1 || (i === shownLit - 1 && i !== s.failAt)) return "ok";
    if (i === s.failAt && shownLit > s.failAt) return "fail";
    if (i > s.failAt && reached("failed")) return "skipped";
    return "idle";
  }

  const result = s.result;
  const tier = result.kind === "diagnosis" ? tierOf(result.confidence) : null;

  return (
    <div
      onMouseEnter={() => hold(true)}
      onMouseLeave={() => hold(false)}
      onFocus={() => hold(true)}
      onBlur={() => hold(false)}
      className="rounded border border-border bg-surface"
    >
      <p className="sr-only">
        Product demo on sample data. A failed n8n execution is replayed node by node, secrets are redacted, and Insight
        names the failing node, the root cause, a confidence score and a fix, or reports the failure as transient.
      </p>

      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2 rounded-full bg-danger/50" />
            <span className="size-2 rounded-full bg-warning/50" />
            <span className="size-2 rounded-full bg-success/50" />
          </div>
          <span className="truncate font-mono text-xs text-muted">insight — {s.workflow}</span>
        </div>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          {paused && !reduced ? "paused" : "sample data"}
        </span>
      </div>

      <div aria-hidden="true" className="min-h-[25rem] space-y-4 p-5 text-sm">
        {/* the execution, node by node */}
        <div className="flex flex-wrap items-center gap-y-2">
          {s.nodes.map((n, i) => (
            <div key={`${s.id}-${n}`} className="flex items-center">
              <NodeChip name={n} state={nodeState(i)} />
              {i < s.nodes.length - 1 && (
                <span className="relative mx-1.5 block h-px w-4 bg-border">
                  <motion.span
                    className="absolute inset-0 origin-left bg-muted"
                    initial={false}
                    animate={{ scaleX: nodeState(i) === "ok" && nodeState(i + 1) !== "idle" ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                </span>
              )}
            </div>
          ))}
        </div>

        {reached("failed") && (
          <motion.p
            key={`${s.id}-err`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="border-l-2 border-danger pl-3 font-mono text-xs leading-relaxed text-danger"
          >
            {s.error}
          </motion.p>
        )}

        {reached("redacting") && (
          <motion.p
            key={`${s.id}-red`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex items-start gap-2 font-mono text-xs text-muted"
          >
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-accent" aria-hidden="true" />
            <span>redacted {s.redacted}</span>
          </motion.p>
        )}

        {shownPhase === "thinking" && (
          <div className="inline-flex items-center gap-1 rounded border border-border px-4 py-3">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-1.5 bg-muted"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {shownPhase === "done" && result.kind === "transient" && (
            <motion.div
              key={`${s.id}-t`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="space-y-2 rounded border border-border px-4 py-3"
            >
              <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.1em] text-warning">
                <Clock className="size-3.5" aria-hidden="true" /> looks transient
              </p>
              <p className="leading-relaxed text-muted">{result.message}</p>
            </motion.div>
          )}

          {shownPhase === "done" && result.kind === "diagnosis" && tier && (
            <motion.div
              key={`${s.id}-d`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="space-y-3 rounded border border-border px-4 py-3"
            >
              <dl className="space-y-1.5 font-mono text-xs">
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-muted">node</dt>
                  <dd className="text-foreground">{result.node}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 shrink-0 text-muted">cause</dt>
                  <dd className="text-accent">{result.category}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <dt className="w-20 shrink-0 text-muted">confidence</dt>
                  <dd className="flex flex-1 items-center gap-2.5">
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-border">
                      <motion.span
                        className={"absolute inset-y-0 left-0 origin-left " + TIER_META[tier].bar}
                        style={{ width: `${result.confidence * 100}%` }}
                        initial={{ scaleX: reduced ? 1 : 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
                      />
                    </span>
                    <span className="tabular-nums">{Math.round(result.confidence * 100)}%</span>
                    <span className={TIER_META[tier].text}>{tier}</span>
                  </dd>
                </div>
              </dl>
              <p className="leading-relaxed text-muted">{result.explanation}</p>
              <p className="rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed">
                <span className="text-muted">{tier === "low" ? "try  " : "fix  "}</span>
                {result.fix}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div role="group" aria-label="Demo scenario" className="flex items-center gap-1 overflow-x-auto border-t border-border p-2">
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            onClick={() => setIndex(i)}
            aria-pressed={i === index}
            className={
              "relative shrink-0 rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
              (i === index ? "text-foreground" : "text-muted hover:text-foreground")
            }
          >
            {i === index && (
              <motion.span
                layoutId="demo-tab"
                className="absolute inset-x-2 -bottom-px h-0.5 bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {sc.tab}
          </button>
        ))}
      </div>
    </div>
  );
}

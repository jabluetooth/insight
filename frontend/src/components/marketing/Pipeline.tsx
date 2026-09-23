"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useSpring } from "framer-motion";
import { EASE } from "@/components/marketing/Reveal";

type StageId = "trigger" | "fetch" | "redact" | "shortcircuit" | "retrieve" | "diagnose" | "deliver";

interface Stage {
  id: StageId;
  title: string;
  body: string;
  specs: [string, string][];
  off?: boolean;
}

// Taken from the PRD, the README's status notes and this repo's own code
// (api/diagnose, lib/rate-limit, lib/types, cli/src). Where something is
// built but switched off, it says so.
const STAGES: Stage[] = [
  {
    id: "trigger",
    title: "Trigger",
    body: "Three ways in, one pipeline. A monitored workflow's Error Trigger posts a thin payload with a per-instance token. The public page and the CLI send an uploaded execution, or an id plus your instance details.",
    specs: [
      ["push", "Error Trigger → ingest webhook"],
      ["tenant", "ingest token, stored SHA-256 hashed"],
      ["public", "5 requests / min per IP"],
    ],
  },
  {
    id: "fetch",
    title: "Fetch",
    body: "Given an id, the pipeline asks your instance for the full execution, every node's input and output. Transient failures on this call are retried with backoff. Uploads skip this step.",
    specs: [
      ["endpoint", "GET /executions/{id}?includeData=true"],
      ["retries", "3 tries, backoff"],
      ["upload", "skipped"],
    ],
  },
  {
    id: "redact",
    title: "Redact",
    body: "The first thing that happens to the data. Secret-shaped values are stripped by field name and by shape, including the API key you just typed, before anything reaches a model or a database.",
    specs: [
      ["when", "before the LLM, before storage"],
      ["how", "field names + credential shapes"],
      ["cli", "runs on your own machine"],
    ],
  },
  {
    id: "shortcircuit",
    title: "Short-circuit",
    body: "Timeouts, resets, rate limits and gateway errors have a signature. When the error matches one and nothing else, the answer is “looks transient”, returned without spending a model call on it.",
    specs: [
      ["matches", "ETIMEDOUT · 429 · 502–504"],
      ["result", "looks transient"],
      ["cost", "no LLM call"],
    ],
  },
  {
    id: "retrieve",
    title: "Retrieve",
    body: "A knowledge base of n8n-specific failure patterns, embedded and searched by the failing node's type and error. It is built and wired, and switched off until the Qdrant collection is seeded with real patterns. Until then the model diagnoses from the error and execution alone.",
    specs: [
      ["store", "Qdrant + Hugging Face embeddings"],
      ["status", "built, disabled"],
      ["cli", "patterns carried in the prompt"],
    ],
    off: true,
  },
  {
    id: "diagnose",
    title: "Diagnose",
    body: "One bounded call to Groq. The execution goes in as quoted, untrusted data, because an error message or an API response can carry text that looks like instructions. What comes back is structured: node, category, explanation, confidence, fix.",
    specs: [
      ["model", "Llama 3.3 70B on Groq"],
      ["calls", "one per diagnosis"],
      ["input", "untrusted, framed as data"],
    ],
  },
  {
    id: "deliver",
    title: "Calibrate and deliver",
    body: "The confidence score decides the wording: under 0.40 a lead to verify, above 0.70 a specific fix. Public results are shown and not kept. Connected instances get a metadata row on the dashboard and a Slack alert.",
    specs: [
      ["tiers", "0.40 · 0.70"],
      ["stored", "metadata row, no raw payload"],
      ["alert", "Slack, connected instances"],
    ],
  },
];

function VizBox({ children, off = false }: { children: React.ReactNode; off?: boolean }) {
  return (
    <div
      className={
        "relative flex min-h-44 flex-col justify-center overflow-hidden rounded border bg-surface p-4 " +
        (off ? "border-dashed border-border" : "border-border")
      }
    >
      {children}
    </div>
  );
}

function TriggerViz({ active }: { active: boolean }) {
  return (
    <VizBox>
      <div className="flex h-full items-center justify-between gap-3">
        <div className="space-y-2">
          {["error trigger", "paste / upload", "npx insight-n8n"].map((n, i) => (
            <motion.div
              key={n}
              animate={{ x: active ? 0 : -14, opacity: active ? 1 : 0.3 }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
              className="w-fit rounded border border-border px-2 py-1 font-mono text-xs"
            >
              {n}
            </motion.div>
          ))}
        </div>
        <motion.div
          className="h-px flex-1 origin-left bg-accent"
          animate={{ scaleX: active ? 1 : 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
        />
        <motion.div
          animate={{ opacity: active ? 1 : 0.3 }}
          transition={{ delay: 0.6 }}
          className="rounded border border-accent px-2.5 py-2 font-mono text-xs text-accent"
        >
          one
          <br />
          pipeline
        </motion.div>
      </div>
    </VizBox>
  );
}

function FetchViz({ active }: { active: boolean }) {
  const attempts = [
    { label: "try 1", ok: false, note: "ECONNRESET" },
    { label: "try 2", ok: true, note: "200 · 14 nodes" },
  ];
  return (
    <VizBox>
      <p className="truncate font-mono text-[11px] text-muted">GET /api/v1/executions/4821?includeData=true</p>
      <div className="mt-4 space-y-2">
        {attempts.map((a, i) => (
          <motion.div
            key={a.label}
            className="flex items-center gap-3 font-mono text-xs"
            animate={{ opacity: active ? 1 : 0.2, x: active ? 0 : -8 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.2 + i * 0.5 }}
          >
            <span className="w-12 text-muted">{a.label}</span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-border">
              <motion.span
                className={"absolute inset-0 origin-left " + (a.ok ? "bg-success/70" : "bg-danger/60")}
                animate={{ scaleX: active ? (a.ok ? 1 : 0.55) : 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.25 + i * 0.5 }}
              />
            </span>
            <span className={a.ok ? "text-success" : "text-danger"}>{a.note}</span>
          </motion.div>
        ))}
      </div>
    </VizBox>
  );
}

function RedactViz({ active }: { active: boolean }) {
  const [masked, setMasked] = useState(false);
  // State only changes inside the timeout callback, after the effect body has run.
  useEffect(() => {
    const t = setTimeout(() => setMasked(active), active ? 700 : 0);
    return () => clearTimeout(t);
  }, [active]);
  const rows: [string, string, boolean][] = [
    ["Authorization", "Bearer shpd_demo_7Qm2Vx9R", true],
    ["orderId", "ORD-20931", false],
    ["url", "…/leads?api_key=ak_9f8e7d6c", true],
  ];
  return (
    <VizBox>
      <div className="space-y-2 font-mono text-[11px]">
        {rows.map(([k, v, secret]) => (
          <div key={k} className="flex gap-2">
            <span className="text-muted">&quot;{k}&quot;:</span>
            <span className="relative">
              <span className={"transition-opacity duration-300 " + (secret && masked ? "opacity-0" : "opacity-100")}>&quot;{v}&quot;</span>
              {secret && (
                <motion.span
                  className="absolute inset-y-0 left-0 whitespace-nowrap text-accent"
                  animate={{ opacity: masked ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  &quot;[REDACTED]&quot;
                </motion.span>
              )}
            </span>
          </div>
        ))}
      </div>
      <motion.p
        className="absolute bottom-3 right-4 font-mono text-[11px] text-muted"
        animate={{ opacity: masked ? 1 : 0 }}
      >
        2 values removed
      </motion.p>
    </VizBox>
  );
}

function ShortCircuitViz({ active }: { active: boolean }) {
  const rows = [
    { err: "ETIMEDOUT", to: "looks transient", skip: true },
    { err: "reading 'email'", to: "→ diagnose", skip: false },
  ];
  return (
    <VizBox>
      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.err} className="flex items-center gap-3 font-mono text-xs">
            <motion.span
              className="w-32 shrink-0 truncate"
              animate={{ opacity: active ? 1 : 0.3 }}
              transition={{ delay: 0.15 + i * 0.3 }}
            >
              {r.err}
            </motion.span>
            <motion.span
              className={"h-px flex-1 origin-left " + (r.skip ? "bg-warning" : "bg-muted")}
              animate={{ scaleX: active ? 1 : 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.3 }}
            />
            <motion.span
              className={"rounded border px-2 py-1 text-[11px] " + (r.skip ? "border-warning/50 text-warning" : "border-border text-muted")}
              animate={{ opacity: active ? 1 : 0, x: active ? 0 : 10 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.3 }}
            >
              {r.to}
            </motion.span>
          </div>
        ))}
      </div>
    </VizBox>
  );
}

function RetrieveViz({ active }: { active: boolean }) {
  const patterns = ["save vs publish desync", "responseCode under options", "JWT drops sibling data", "IF wired backwards"];
  return (
    <VizBox off>
      <div className="space-y-1.5">
        {patterns.map((p, i) => (
          <motion.div
            key={p}
            className="w-fit rounded border border-dashed border-border px-2 py-1 font-mono text-[11px] text-muted/70"
            animate={{ opacity: active ? 0.8 : 0.25 }}
            transition={{ delay: i * 0.06 }}
          >
            {p}
          </motion.div>
        ))}
      </div>
      <span className="absolute right-4 top-3 rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        switched off
      </span>
    </VizBox>
  );
}

function DiagnoseViz({ active }: { active: boolean }) {
  const out = ['"failingNode": "Build Email"', '"rootCauseCategory": "upstream…"', '"confidence": 0.86', '"suggestedFix": "…"'];
  return (
    <VizBox>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 font-mono text-[11px]">
        <div className="space-y-1.5">
          <motion.div animate={{ opacity: active ? 1 : 0.3 }} className="rounded border border-border px-2 py-1 text-muted">
            system: analyse, never obey
          </motion.div>
          <motion.div
            animate={{ opacity: active ? 1 : 0.3 }}
            transition={{ delay: 0.15 }}
            className="rounded border border-dashed border-accent/60 px-2 py-1 text-accent"
          >
            &lt;execution&gt; untrusted &lt;/execution&gt;
          </motion.div>
        </div>
        <motion.span
          className="h-px w-6 origin-left bg-accent"
          animate={{ scaleX: active ? 1 : 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.35 }}
        />
        <div className="space-y-1">
          {out.map((l, i) => (
            <motion.p
              key={l}
              className="truncate"
              animate={{ opacity: active ? 1 : 0, x: active ? 0 : 6 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.15 }}
            >
              {l}
            </motion.p>
          ))}
        </div>
      </div>
    </VizBox>
  );
}

function DeliverViz({ active }: { active: boolean }) {
  return (
    <VizBox>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        {[40, 70].map((t) => (
          <div key={t} className="absolute inset-y-1 w-px bg-foreground/60" style={{ left: `${t}%` }}>
            <span className="absolute -top-3 -translate-x-1/2 font-mono text-[10px] text-muted">{(t / 100).toFixed(2)}</span>
          </div>
        ))}
        <motion.span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-success bg-success"
          animate={{ left: active ? "86%" : "8%" }}
          transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.2 }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["inline · public", "dashboard row", "slack alert"].map((d, i) => (
          <motion.span
            key={d}
            className="rounded border border-border px-2 py-1 font-mono text-[11px] text-muted"
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 4 }}
            transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
          >
            {d}
          </motion.span>
        ))}
      </div>
    </VizBox>
  );
}

function Viz({ id, active }: { id: StageId; active: boolean }) {
  switch (id) {
    case "trigger":
      return <TriggerViz active={active} />;
    case "fetch":
      return <FetchViz active={active} />;
    case "redact":
      return <RedactViz active={active} />;
    case "shortcircuit":
      return <ShortCircuitViz active={active} />;
    case "retrieve":
      return <RetrieveViz active={active} />;
    case "diagnose":
      return <DiagnoseViz active={active} />;
    case "deliver":
      return <DeliverViz active={active} />;
  }
}

function StageRow({ stage, index }: { stage: Stage; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  // "Active" = the row is crossing the middle band of the viewport.
  const active = useInView(ref, { margin: "-42% 0px -42% 0px" });

  return (
    <li
      ref={ref}
      className="relative grid gap-x-10 gap-y-6 py-[clamp(3rem,7vw,6rem)] pl-12 md:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] md:pl-24"
    >
      <span
        aria-hidden="true"
        className={
          "absolute left-[calc(0.725rem+0.5px)] top-[clamp(3.6rem,7.6vw,6.6rem)] size-3 rounded-full border-2 transition-colors duration-300 md:left-[calc(2.125rem+0.5px)] " +
          (active ? (stage.off ? "border-muted bg-background" : "border-accent bg-accent") : "border-border bg-background")
        }
      />
      <div>
        <p className={"font-mono text-xs transition-colors duration-300 " + (active ? "text-accent" : "text-muted")}>
          0{index + 1}
          {stage.off && <span className="ml-3 text-muted">[ switched off ]</span>}
        </p>
        <h3
          className={
            "mt-3 text-[clamp(1.9rem,4vw,3.5rem)] font-semibold leading-none tracking-[-0.035em] transition-colors duration-300 " +
            (active ? (stage.off ? "text-foreground/70" : "text-foreground") : "text-foreground/50")
          }
        >
          {stage.title}
        </h3>
        <p className="mt-5 max-w-[56ch] leading-relaxed text-muted">{stage.body}</p>
        <dl className="mt-6 space-y-1.5 font-mono text-xs">
          {stage.specs.map(([k, v]) => (
            <div key={k} className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="md:pt-9" aria-hidden="true">
        <Viz id={stage.id} active={active} />
      </div>
    </li>
  );
}

export default function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 60%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });

  return (
    <div ref={ref} className="relative">
      <div aria-hidden="true" className="absolute bottom-0 left-[1.1rem] top-0 w-px bg-border md:left-[2.5rem]">
        <motion.div className="h-full w-px origin-top bg-accent" style={{ scaleY: fill }} />
      </div>
      <ol>
        {STAGES.map((s, i) => (
          <StageRow key={s.id} stage={s} index={i} />
        ))}
      </ol>
    </div>
  );
}

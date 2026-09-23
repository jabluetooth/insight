"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Braces, FileX, GitBranch, Unplug, Timer, Plus } from "lucide-react";
import { EASE } from "@/components/marketing/Reveal";

// The root-cause categories Insight names (PRD FR-6), and the n8n-specific
// patterns from PRD §6.3 behind them. Each row says what the failure looks
// like in an execution and what the fix usually is.
const FAILURES = [
  {
    id: "auth",
    name: "Credential or auth",
    icon: KeyRound,
    signal: "401 · 403 · invalid_grant",
    detail:
      "An OAuth refresh token expired, a key was rotated, or the wrong credential is attached to the node. The workflow is usually fine, and Insight says so instead of inventing a code change.",
    specs: [
      ["looks like", "401 or 403 from a node"],
      ["usual fix", "reconnect the credential"],
    ],
  },
  {
    id: "shape",
    name: "Upstream shape changed",
    icon: Braces,
    signal: "reading 'x' of undefined",
    detail:
      "An API moved a field and an expression that worked yesterday now reads undefined. Insight looks at the items the failing node actually received and points at where the field lives now.",
    specs: [
      ["looks like", "an expression error"],
      ["usual fix", "the new path, spelled out"],
    ],
  },
  {
    id: "dropped",
    name: "Dropped data",
    icon: FileX,
    signal: "not found, one node later",
    detail:
      "Some nodes, like JWT verify, rebuild each item from their own output and silently drop the JSON fields and binary files that came before. The error is thrown downstream, so the cause is a node earlier than the one that failed.",
    specs: [
      ["looks like", "file or field “not found”"],
      ["usual fix", "merge the item back in"],
    ],
  },
  {
    id: "nesting",
    name: "Wrong field nesting",
    icon: Unplug,
    signal: "silent, until it isn't",
    detail:
      "A setting one level off: Respond to Webhook's response code belongs under options, so every response goes out as 200. Silent failures like this only surface when something downstream breaks because of them.",
    specs: [
      ["looks like", "a later node failing"],
      ["usual fix", "move the field under options"],
    ],
  },
  {
    id: "branch",
    name: "Backwards conditional",
    icon: GitBranch,
    signal: "right data, wrong branch",
    detail:
      "An IF node's output 0 is true and output 1 is false. Swap the wires and the workflow does the opposite of what it says while looking correct at a glance.",
    specs: [
      ["looks like", "the other branch's error"],
      ["usual fix", "swap the outputs"],
    ],
  },
  {
    id: "transient",
    name: "Transient",
    icon: Timer,
    signal: "no model call",
    detail:
      "Timeouts, connection resets, 429s and 502 to 504s are recognized by their signature and reported as transient straight away. No LLM call, no invented explanation for a network blip.",
    specs: [
      ["looks like", "ETIMEDOUT, 503, 429"],
      ["usual fix", "re-run it"],
    ],
  },
] as const;

export default function FailureList() {
  const [open, setOpen] = useState<string>("shape");

  return (
    <ul className="border-t border-border">
      {FAILURES.map((f, i) => {
        const isOpen = open === f.id;
        const Icon = f.icon;
        return (
          <motion.li
            key={f.id}
            className="border-b border-border"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8% 0px" }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.06 }}
          >
            <button
              onClick={() => setOpen(isOpen ? "" : f.id)}
              aria-expanded={isOpen}
              aria-controls={`failure-${f.id}`}
              className="group grid w-full grid-cols-[3rem_1fr_2rem] items-baseline gap-x-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:grid-cols-[5rem_minmax(0,1.3fr)_minmax(0,1fr)_2rem] md:py-7"
            >
              <span className="font-mono text-xs text-muted">0{i + 1}</span>
              <span
                className={
                  "text-[clamp(1.6rem,4vw,3.5rem)] font-semibold leading-none tracking-[-0.03em] transition-[transform,color] duration-300 group-hover:translate-x-2 " +
                  (isOpen ? "text-foreground" : "text-foreground/60 group-hover:text-foreground")
                }
              >
                {f.name}
              </span>
              <span className="hidden font-mono text-xs text-muted md:block">{f.signal}</span>
              <Plus
                className={"size-5 place-self-center text-muted transition-transform duration-300 " + (isOpen ? "rotate-45 text-accent" : "")}
                aria-hidden="true"
              />
            </button>

            <div
              id={`failure-${f.id}`}
              role="region"
              aria-label={f.name}
              className={"grid transition-[grid-template-rows] duration-300 ease-out " + (isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
            >
              <div className="overflow-hidden">
                <div className="grid gap-6 pb-8 md:grid-cols-[5rem_minmax(0,1.3fr)_minmax(0,1fr)_2rem] md:gap-x-4">
                  <Icon className="hidden size-5 text-accent md:block" aria-hidden="true" />
                  <p className="max-w-[60ch] leading-relaxed text-muted">{f.detail}</p>
                  <dl className="space-y-1.5 font-mono text-xs">
                    <div className="flex gap-3 md:hidden">
                      <dt className="w-20 shrink-0 text-muted">signal</dt>
                      <dd>{f.signal}</dd>
                    </div>
                    {f.specs.map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <dt className="w-20 shrink-0 text-muted">{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}

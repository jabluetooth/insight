"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { EASE } from "@/components/marketing/Reveal";
import { tierOf, TIER_META } from "@/components/confidence";

const LOW = 40;
const HIGH = 70;

const ZONES = [
  { from: 0, to: LOW, label: "hedged", className: "bg-danger/[0.07]", text: "text-danger" },
  { from: LOW, to: HIGH, label: "moderate", className: "bg-warning/[0.07]", text: "text-warning" },
  { from: HIGH, to: 100, label: "specific fix", className: "bg-success/[0.07]", text: "text-success" },
] as const;

// Drag the score and watch the same diagnosis get worded differently. The
// thresholds and wording are the ones the real result card uses (lib/types.ts
// and the diagnose page), not a mock-up of them.
export default function ConfidenceDial() {
  const id = useId();
  const [value, setValue] = useState(32);
  const tier = tierOf(value / 100);
  const meta = TIER_META[tier];
  const low = tier === "low";
  const Icon = meta.Icon;

  return (
    <figure className="grid gap-[clamp(2rem,4vw,4rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
      <div>
        <div className="relative h-40 select-none sm:h-48">
          {ZONES.map((z) => (
            <div key={z.label} className={"absolute inset-y-0 " + z.className} style={{ left: `${z.from}%`, width: `${z.to - z.from}%` }}>
              <span className={"absolute left-3 top-3 font-mono text-[11px] uppercase tracking-[0.12em] " + z.text}>{z.label}</span>
            </div>
          ))}

          {[LOW, HIGH].map((t, i) => (
            <div key={t}>
              <motion.div
                aria-hidden="true"
                className="absolute inset-y-0 w-px origin-top bg-foreground"
                style={{ left: `${t}%` }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{ duration: 0.8, ease: EASE, delay: i * 0.15 }}
              />
              <span
                className="absolute bottom-3 -translate-x-1/2 whitespace-nowrap bg-background px-1.5 font-mono text-[11px]"
                style={{ left: `${t}%` }}
              >
                {(t / 100).toFixed(2)}
              </span>
            </div>
          ))}

          {/* the marker follows the slider */}
          <motion.div
            aria-hidden="true"
            className="absolute top-[58%] -ml-[9px] -mt-[9px]"
            animate={{ left: `${value}%` }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <span className={"block size-[18px] rounded-full border-2 " + meta.solid + " " + (low ? "bg-background" : meta.bar)} />
            <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded border border-border bg-surface px-2 py-1 font-mono text-[11px] tabular-nums">
              {value}%
            </span>
          </motion.div>
          <div className="absolute inset-x-0 top-[58%] h-px bg-border" />
        </div>

        <label htmlFor={id} className="mt-6 block font-mono text-xs uppercase tracking-[0.1em] text-muted">
          Drag the confidence score
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-valuetext={`${value}%, ${meta.label.toLowerCase()}`}
          className="mt-3 w-full cursor-pointer accent-[var(--accent)]"
        />
        <figcaption className="mt-4 max-w-[62ch] font-mono text-xs leading-relaxed text-muted">
          Thresholds at 0.40 and 0.70, the same ones the result card and the dashboard use. Hollow marker for hedged,
          filled above it. Shape and word, not just colour.
        </figcaption>
      </div>

      {/* the same result, worded for this score */}
      <div className="rounded border border-border bg-surface" aria-live="polite">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          <span>diagnosis · Build Email</span>
          <span className={"flex items-center gap-1.5 " + meta.text}>
            <Icon className="size-3.5" aria-hidden="true" />
            {meta.label}
          </span>
        </div>
        <div className="space-y-4 p-5 text-sm">
          <div
            className={"grid transition-[grid-template-rows] duration-300 ease-out " + (low ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
          >
            <div className="overflow-hidden">
              <p className="rounded-sm border-l-2 border-danger bg-danger/[0.06] px-3 py-2 text-foreground">
                Confidence is low. Treat this as a lead to investigate, not a confirmed root cause.
              </p>
            </div>
          </div>
          <p className="leading-relaxed text-muted">
            Fetch Order now returns the order under <span className="font-mono text-foreground">data</span>, so{" "}
            <span className="font-mono text-foreground">$json.customer</span> is undefined.
          </p>
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {low ? "Possible fix · verify before applying" : "Suggested fix"}
            </p>
            <p className={"rounded-sm border bg-background px-3 py-2 font-mono text-xs " + (low ? "border-dashed border-border text-muted" : "border-border")}>
              to = {"{{ $json.data.customer.email }}"}
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}

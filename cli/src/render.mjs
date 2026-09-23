// Terminal output. Same rules as the web app: data in its own column, one
// accent colour for where to look, and every state carries a word and a
// symbol as well as a colour, so nothing depends on seeing red vs green.

import { shortType } from "./execution.mjs";
import { tier } from "./diagnose.mjs";

const useColor = () => process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";
const paint = (code) => (s) => (useColor() ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const c = {
  accent: paint("38;5;80"),
  dim: paint("2"),
  bold: paint("1"),
  red: paint("38;5;203"),
  green: paint("38;5;114"),
  amber: paint("38;5;221"),
};

const WIDTH = () => Math.min(process.stdout.columns || 80, 88);
const LABEL = 14;

export function wrap(text, indent = 2) {
  const max = Math.max(30, WIDTH() - indent);
  const pad = " ".repeat(indent);
  return String(text)
    .split("\n")
    .map((para) => {
      const words = para.split(/\s+/).filter(Boolean);
      const lines = [];
      let line = "";
      for (const w of words) {
        if (line && line.length + 1 + w.length > max) {
          lines.push(line);
          line = w;
        } else {
          line = line ? `${line} ${w}` : w;
        }
      }
      lines.push(line);
      return lines.map((l) => pad + l).join("\n");
    })
    .join("\n");
}

const row = (label, value) => `  ${c.dim(label.padEnd(LABEL))}${value}`;
// A long plain value wraps under its own column instead of under the label.
const longRow = (label, value) => row(label, wrap(value, LABEL + 2).trimStart());
const rule = () => c.dim("  " + "─".repeat(Math.max(20, WIDTH() - 4)));

export function header(title) {
  return `\n  ${c.bold("insight")} ${c.accent("●")} ${c.dim(title)}\n${rule()}`;
}

const STATUS = {
  success: () => c.green("✓"),
  error: () => c.red("✗"),
  waiting: () => c.amber("…"),
  running: () => c.amber("…"),
};

export function renderTrace(trace) {
  if (!trace.length) return c.dim("no run data");
  return trace.map((t) => `${t.name} ${(STATUS[t.status] ?? (() => c.dim("·")))()}`).join(c.dim(" → "));
}

export function renderSummary(s, redaction) {
  const out = [];
  if (s.workflowName) out.push(row("workflow", s.workflowName));
  if (s.executionId) out.push(row("execution", s.executionId));
  out.push(row("status", s.failed ? c.red(`✗ ${s.status}`) : c.green(`✓ ${s.status}`)));
  out.push(row("trace", renderTrace(s.trace)));
  if (s.failingNode) {
    const type = shortType(s.failingNode.type);
    out.push(row("failed at", `${c.bold(s.failingNode.name)}${type ? c.dim(`  ${type}`) : ""}`));
  }
  if (s.error.message) out.push(longRow("error", s.error.message));
  if (s.error.httpCode) out.push(row("http", s.error.httpCode));
  if (s.error.description) out.push("", c.dim("  description"), wrap(s.error.description, 4));
  if (redaction) out.push("", row("redacted", redactionLine(redaction)));
  return out.join("\n");
}

export function redactionLine(r) {
  if (!r.count) return c.dim("nothing secret-shaped found");
  const kinds = Object.entries(r.kinds)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ");
  return `${r.count} value${r.count === 1 ? "" : "s"} ${c.dim(`(${kinds})`)}`;
}

function meter(confidence) {
  const t = tier(confidence);
  if (t === "unknown") return c.dim("unknown");
  const pct = Math.round(confidence * 100);
  const filled = Math.round(confidence * 20);
  const color = t === "high" ? c.green : t === "moderate" ? c.amber : c.red;
  const bar = color("█".repeat(filled)) + c.dim("░".repeat(20 - filled));
  return `${bar} ${String(pct).padStart(3)}%  ${color(t)}`;
}

export function renderResult(result) {
  const out = [];
  if (result.status === "transient") {
    out.push(row("result", c.amber("~ looks transient")));
    if (result.failingNode) out.push(row("node", result.failingNode));
    out.push("", wrap(result.message ?? "No code-level root cause found.", 2));
    return out.join("\n");
  }
  if (result.status === "error") {
    out.push(row("result", c.red("✗ diagnosis unavailable")), "", wrap(result.message ?? "The pipeline reported an error.", 2));
    return out.join("\n");
  }

  const t = tier(result.confidence);
  const low = t === "low";
  if (result.failingNode) out.push(row("failing node", c.bold(result.failingNode)));
  if (result.rootCauseCategory) out.push(row("category", c.accent(result.rootCauseCategory)));
  out.push(row("confidence", meter(result.confidence)));

  if (result.explanation) {
    out.push("", c.dim("  what likely happened"));
    if (low) out.push(wrap(c.amber("Low confidence: treat this as a lead to check, not a confirmed cause."), 2));
    out.push(wrap(result.explanation, 2));
  }
  if (result.suggestedFix) {
    out.push("", c.dim(low ? "  possible fix · verify before applying" : "  suggested fix"));
    out.push(wrap(result.suggestedFix, 2));
  }
  return out.join("\n");
}

export function footer(parts) {
  return `${rule()}\n  ${c.dim(parts.filter(Boolean).join(" · "))}\n`;
}

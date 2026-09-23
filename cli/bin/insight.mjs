#!/usr/bin/env node
// insight: diagnose a failed n8n execution from your terminal.
// Zero dependencies on purpose, so `npx insight-n8n` starts instantly.

import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";

import { parseExecution, normalizeExecution, summarize, ExecutionError } from "../src/execution.mjs";
import { redact } from "../src/redact.mjs";
import { diagnoseLocal, diagnoseHosted, detectTransient, DEFAULT_MODEL, DEFAULT_API_URL } from "../src/diagnose.mjs";
import { c, header, renderSummary, renderResult, redactionLine, footer, wrap } from "../src/render.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(ROOT, "fixtures");
const { version: VERSION } = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const DEFAULT_SAMPLE = "shape-changed";

const HELP = `
  ${c.bold("insight")} ${c.accent("●")} ${c.dim(`v${VERSION} · why did my n8n execution fail?`)}

  ${c.dim("usage")}
    insight demo [sample]                  diagnose a bundled sample failure
    insight diagnose <file.json | ->       diagnose an exported execution
    insight diagnose --id <id> --url <url> fetch it from your instance first
    insight inspect <file.json | ->        trace, error and redaction, fully offline
    insight redact <file.json | ->         print the redacted JSON that would be sent

  ${c.dim("options")}
    --local            diagnose on this machine with your GROQ_API_KEY
    --hosted           use the hosted Insight service (no key needed)
    --json             machine-readable output
    --model <id>       Groq model for --local (default ${DEFAULT_MODEL})
    --api-url <url>    hosted service base URL (default ${DEFAULT_API_URL})
    -h, --help         this help
    -v, --version      print the version

  ${c.dim("environment")}
    GROQ_API_KEY       if set, diagnose runs locally by default (free key: console.groq.com)
    N8N_API_KEY        n8n API key for --id; asked for if unset. It never leaves this machine.
    INSIGHT_API_URL    same as --api-url
    NO_COLOR           plain output

  Secrets are redacted on this machine before anything is printed or sent.
`;

class UsageError extends Error {}

function fail(message, code = 1) {
  process.stderr.write(`\n  ${c.red("✗")} ${message}\n\n`);
  process.exit(code);
}

async function readInput(target) {
  if (!target) throw new UsageError("Give a file path, or - to read from stdin.");
  if (target === "-") {
    if (process.stdin.isTTY) throw new UsageError("Nothing on stdin. Pipe an execution in: cat execution.json | insight diagnose -");
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
  }
  try {
    return await readFile(target, "utf8");
  } catch (err) {
    throw new UsageError(err.code === "ENOENT" ? `No such file: ${target}` : `Could not read ${target}: ${err.message}`);
  }
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      // Echo the prompt itself, nothing typed after it.
      if (s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

async function fetchExecution(id, baseUrl) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new UsageError("That doesn't look like an n8n execution id.");
  let url;
  try {
    url = new URL(`/api/v1/executions/${id}?includeData=true`, baseUrl);
  } catch {
    throw new UsageError("--url must be a full URL, e.g. https://n8n.example.com or http://localhost:5678");
  }
  let apiKey = process.env.N8N_API_KEY?.trim();
  if (!apiKey) {
    if (!process.stdin.isTTY) throw new UsageError("Set N8N_API_KEY to fetch an execution non-interactively.");
    apiKey = await askHidden(`  n8n API key ${c.dim("(hidden, used once, never stored)")}: `);
  }
  if (!apiKey) throw new UsageError("An n8n API key is needed to fetch the execution.");

  let res;
  try {
    res = await fetch(url, { headers: { "X-N8N-API-KEY": apiKey, Accept: "application/json" } });
  } catch (err) {
    throw new Error(`Could not reach ${url.host}: ${err?.cause?.code ?? err.message}`);
  }
  if (res.status === 401 || res.status === 403) throw new Error(`Your n8n instance rejected the API key (HTTP ${res.status}).`);
  if (res.status === 404) throw new Error(`Execution ${id} wasn't found. n8n may have pruned it; check execution retention.`);
  if (!res.ok) throw new Error(`Your n8n instance returned HTTP ${res.status}.`);
  return { text: await res.text(), apiKey };
}

function listSamples() {
  return readdirSync(FIXTURES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => basename(f, ".json"))
    .sort();
}

async function loadExecution(positionals, values, command) {
  if (command === "demo") {
    const name = positionals[0] ?? DEFAULT_SAMPLE;
    const samples = listSamples();
    if (!samples.includes(name)) throw new UsageError(`No sample called "${name}". Samples: ${samples.join(", ")}`);
    return { exec: parseExecution(await readFile(join(FIXTURES, `${name}.json`), "utf8")), secrets: [], source: `sample: ${name}` };
  }
  if (values.id) {
    if (!values.url) throw new UsageError("--id needs --url, your instance's base URL.");
    const { text, apiKey } = await fetchExecution(values.id, values.url);
    return { exec: parseExecution(text), secrets: [apiKey], source: `${new URL(values.url).host} #${values.id}` };
  }
  const target = positionals[0];
  return { exec: parseExecution(await readInput(target)), secrets: [], source: target === "-" ? "stdin" : basename(target) };
}

async function run() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        local: { type: "boolean" },
        hosted: { type: "boolean" },
        json: { type: "boolean" },
        model: { type: "string" },
        "api-url": { type: "string" },
        id: { type: "string" },
        url: { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (err) {
    throw new UsageError(err.message);
  }
  const { values, positionals } = parsed;
  if (values.version) return void process.stdout.write(`${VERSION}\n`);
  const [command, ...rest] = positionals;
  if (values.help || !command || command === "help") return void process.stdout.write(HELP + "\n");
  if (!["demo", "diagnose", "inspect", "redact"].includes(command)) throw new UsageError(`Unknown command "${command}". Run insight --help.`);
  if (values.local && values.hosted) throw new UsageError("Pick one of --local or --hosted.");

  const { exec, secrets, source } = await loadExecution(rest, values, command);
  const redaction = redact(exec, secrets);
  const clean = normalizeExecution(redaction.value);
  const summary = summarize(clean);
  const redactionInfo = { count: redaction.count, kinds: redaction.kinds };

  if (command === "redact") {
    process.stdout.write(JSON.stringify(clean, null, 2) + "\n");
    process.stderr.write(`  ${c.dim("redacted")} ${redactionLine(redactionInfo)}\n`);
    return;
  }

  if (command === "inspect") {
    if (values.json) return void process.stdout.write(JSON.stringify({ summary, redaction: redactionInfo }, null, 2) + "\n");
    process.stdout.write(`${header(`inspect · ${source}`)}\n${renderSummary(summary, redactionInfo)}\n`);
    if (summary.input) process.stdout.write(`\n${c.dim("  input to the failing node")}\n${summary.input.replace(/^/gm, "    ")}\n`);
    process.stdout.write(footer(["offline, nothing was sent", "run `insight diagnose` for the root cause"]));
    return;
  }

  // demo / diagnose
  if (!summary.failed && !values.json) {
    process.stdout.write(`\n  ${c.green("✓")} This execution didn't fail (${summary.status}), so there's nothing to diagnose.\n\n`);
    return;
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (values.local && !groqKey) throw new UsageError("--local needs GROQ_API_KEY. A free key takes a minute at https://console.groq.com/keys");
  const engine = values.local || (groqKey && !values.hosted) ? "local" : "hosted";
  const apiUrl = values["api-url"] ?? process.env.INSIGHT_API_URL ?? DEFAULT_API_URL;
  const model = values.model ?? process.env.INSIGHT_MODEL ?? DEFAULT_MODEL;

  if (!values.json) {
    process.stdout.write(`${header(`diagnose · ${source}`)}\n${renderSummary(summary, redactionInfo)}\n${c.dim("  " + "·".repeat(3))}\n`);
    if (engine === "hosted") {
      process.stdout.write(
        wrap(c.dim(`Sending the redacted execution to ${new URL(apiUrl).host}. Set GROQ_API_KEY to keep it on this machine instead.`), 2) + "\n"
      );
    }
  }

  const started = Date.now();
  let result;
  const transient = detectTransient(summary);
  try {
    if (engine === "local") {
      result = await diagnoseLocal(summary, { apiKey: groqKey, model });
    } else if (transient) {
      // Same short-circuit the hosted pipeline applies; no need to spend a request on it.
      result = await diagnoseLocal(summary, { apiKey: "" });
    } else {
      result = await diagnoseHosted(clean, { apiUrl });
    }
  } catch (err) {
    const hint =
      engine === "hosted"
        ? " To run without the hosted service, set GROQ_API_KEY (free at console.groq.com/keys) and add --local. `insight inspect` works fully offline."
        : "";
    throw new Error(err.message + hint);
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (values.json) {
    process.stdout.write(JSON.stringify({ engine, model: engine === "local" ? model : null, summary, redaction: redactionInfo, result }, null, 2) + "\n");
    return;
  }
  process.stdout.write(`\n${renderResult(result)}\n\n`);
  process.stdout.write(
    footer([
      transient ? "no model call" : engine === "local" ? `local · ${model}` : `hosted · ${new URL(apiUrl).host}`,
      `${seconds}s`,
      command === "demo" ? `other samples: ${listSamples().filter((s) => s !== (rest[0] ?? DEFAULT_SAMPLE)).join(", ")}` : null,
    ])
  );
}

run().catch((err) => {
  if (err instanceof UsageError) fail(err.message, 2);
  if (err instanceof ExecutionError) fail(err.message, 1);
  fail(err?.message ?? String(err), 1);
});

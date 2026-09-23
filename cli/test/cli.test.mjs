// End to end: runs the real binary against local mock servers, so the
// hosted and Groq paths are exercised without touching the network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../bin/insight.mjs", import.meta.url));
const FIX = (n) => fileURLToPath(new URL(`../fixtures/${n}.json`, import.meta.url));

function cli(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      env: { PATH: process.env.PATH, NO_COLOR: "1", ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function mockServer(handler) {
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { status = 200, json } = handler(req, body);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(json));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

test("help and version", async () => {
  const help = await cli(["--help"]);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /insight diagnose/);
  const v = await cli(["-v"]);
  assert.match(v.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("inspect works offline and reports redaction", async () => {
  const r = await cli(["inspect", FIX("shape-changed")]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /failed at\s+Build Email/);
  assert.match(r.stdout, /redacted\s+2 values/);
  assert.ok(!r.stdout.includes("shpd_demo_7Qm2"));
});

test("redact prints valid, clean JSON", async () => {
  const r = await cli(["redact", FIX("jwt-dropped-binary")]);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.data.resultData.runData["Contract Upload"][0].data.main[0][0].json.headers.authorization, "[REDACTED]");
});

test("bad input fails with a clear message and exit code", async () => {
  const missing = await cli(["diagnose", "nope.json"]);
  assert.equal(missing.code, 2);
  assert.match(missing.stderr, /No such file/);
  const unknown = await cli(["demo", "nope"]);
  assert.match(unknown.stderr, /Samples: auth-expired/);
});

test("demo without a Groq key goes to the hosted service, redacted", async () => {
  let received;
  const server = await mockServer((req, body) => {
    received = { path: req.url, body };
    return { json: { status: "ok", failingNode: "Build Email", rootCauseCategory: "upstream data shape changed", confidence: 0.82, explanation: "The field moved under data.", suggestedFix: "Use {{ $json.data.customer.email }}." } };
  });
  try {
    const r = await cli(["demo", "--api-url", server.url]);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(received.path, "/api/diagnose");
    assert.equal(JSON.parse(received.body).mode, "upload");
    assert.ok(!received.body.includes("shpd_demo_7Qm2"), "secrets are removed before upload");
    assert.match(r.stdout, /confidence\s+█+░*\s+82%\s+high/);
    assert.match(r.stdout, /suggested fix/);
  } finally {
    server.close();
  }
});

test("--local with a key calls Groq directly and hedges low confidence", async () => {
  let auth;
  const server = await mockServer((req) => {
    auth = req.headers.authorization;
    const content = JSON.stringify({ failingNode: "Get Invoices", rootCauseCategory: "credential/auth", confidence: 0.3, explanation: "Token expired.", suggestedFix: "Reconnect the Xero credential." });
    return { json: { choices: [{ message: { content } }] } };
  });
  try {
    const r = await cli(["diagnose", FIX("auth-expired"), "--local"], { GROQ_API_KEY: "gsk_local", INSIGHT_GROQ_URL: `${server.url}/v1/chat` });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(auth, "Bearer gsk_local");
    assert.match(r.stdout, /Low confidence/);
    assert.match(r.stdout, /possible fix · verify before applying/);
  } finally {
    server.close();
  }
});

test("--json output for scripts", async () => {
  const r = await cli(["diagnose", FIX("transient-timeout"), "--json"]);
  const out = JSON.parse(r.stdout);
  assert.equal(out.result.status, "transient");
  assert.equal(out.summary.failingNode.name, "Update CRM");
});

test("--local without a key is a usage error", async () => {
  const r = await cli(["diagnose", FIX("auth-expired"), "--local"]);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /console\.groq\.com/);
});

test("--id fetches from the instance with the key, which never reaches the output", async () => {
  let key;
  const exec = JSON.parse((await import("node:fs")).readFileSync(FIX("auth-expired"), "utf8"));
  exec.data.resultData.error.description += " key=n8n-secret-key-123";
  const server = await mockServer((req) => {
    key = req.headers["x-n8n-api-key"];
    assert.equal(req.url, "/api/v1/executions/5170?includeData=true");
    return { json: exec };
  });
  try {
    const r = await cli(["inspect", "--id", "5170", "--url", server.url], { N8N_API_KEY: "n8n-secret-key-123" });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(key, "n8n-secret-key-123");
    assert.ok(!r.stdout.includes("n8n-secret-key-123"));
    assert.match(r.stdout, /provided secret/);
  } finally {
    server.close();
  }
});

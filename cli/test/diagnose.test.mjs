import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseExecution, summarize } from "../src/execution.mjs";
import { redact } from "../src/redact.mjs";
import { diagnoseLocal, diagnoseHosted, detectTransient, tier, buildUserMessage } from "../src/diagnose.mjs";

const load = (name) => summarize(redact(parseExecution(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"))).value);

function fakeFetch(reply, capture = {}) {
  return async (url, init) => {
    capture.url = url;
    capture.init = init;
    capture.body = JSON.parse(init.body);
    return new Response(typeof reply === "string" ? reply : JSON.stringify(reply.body), { status: reply.status ?? 200 });
  };
}

test("tiers match the web app's thresholds", () => {
  assert.deepEqual([tier(0.9), tier(0.7), tier(0.69), tier(0.4), tier(0.39), tier(null)], ["high", "high", "moderate", "moderate", "low", "unknown"]);
});

test("short-circuits infra failures without a model call", async () => {
  const s = load("transient-timeout");
  assert.ok(detectTransient(s));
  const result = await diagnoseLocal(s, { apiKey: "k", fetchImpl: () => assert.fail("should not call the model") });
  assert.equal(result.status, "transient");
});

test("never treats a 4xx or a number in the text as transient", () => {
  assert.equal(detectTransient(load("auth-expired")), null);
  assert.equal(detectTransient({ error: { message: "Row 503 has no email" } }), null);
  assert.ok(detectTransient({ error: { httpCode: "503", message: "x" } }));
});

test("frames the execution as untrusted data and sends no secrets", async () => {
  const cap = {};
  const reply = { body: { choices: [{ message: { content: JSON.stringify({ failingNode: "Build Email", rootCauseCategory: "Upstream data shape changed", explanation: "e", confidence: 1.4, suggestedFix: "f" }) } }] } };
  const result = await diagnoseLocal(load("shape-changed"), { apiKey: "gsk_test", fetchImpl: fakeFetch(reply, cap) });
  assert.equal(cap.init.headers.Authorization, "Bearer gsk_test");
  assert.equal(cap.body.response_format.type, "json_object");
  assert.match(cap.body.messages[0].content, /untrusted data/);
  assert.match(cap.body.messages[1].content, /^<execution>[\s\S]*<\/execution>$/);
  assert.ok(!cap.init.body.includes("shpd_demo_7Qm2"), "the fixture's API key must be redacted before sending");
  assert.equal(result.rootCauseCategory, "upstream data shape changed");
  assert.equal(result.confidence, 1, "confidence is clamped to 0..1");
});

test("maps unknown categories to other and bad replies to a clear error", async () => {
  const odd = { body: { choices: [{ message: { content: JSON.stringify({ rootCauseCategory: "gremlins", confidence: "0.3" }) } }] } };
  const r = await diagnoseLocal(load("auth-expired"), { apiKey: "k", fetchImpl: fakeFetch(odd) });
  assert.equal(r.rootCauseCategory, "other");
  assert.equal(r.confidence, 0.3);
  assert.equal(r.failingNode, "Get Invoices", "falls back to the node that threw");
  await assert.rejects(diagnoseLocal(load("auth-expired"), { apiKey: "k", fetchImpl: fakeFetch({ status: 401, body: {} }) }), /GROQ_API_KEY/);
  await assert.rejects(diagnoseLocal(load("auth-expired"), { apiKey: "k", fetchImpl: fakeFetch({ body: { choices: [{ message: { content: "nope" } }] } }) }), /JSON/);
});

test("hosted mode posts the upload shape the web app uses", async () => {
  const cap = {};
  const r = await diagnoseHosted({ id: "1" }, { apiUrl: "https://example.test", fetchImpl: fakeFetch({ body: { status: "ok", confidence: 0.8 } }, cap) });
  assert.equal(cap.url, "https://example.test/api/diagnose");
  assert.deepEqual(cap.body, { mode: "upload", execution: { id: "1" } });
  assert.equal(r.status, "ok");
  await assert.rejects(
    diagnoseHosted({}, { apiUrl: "https://example.test", fetchImpl: fakeFetch({ status: 429, body: { error: true, message: "Too many diagnosis requests" } }) }),
    /Too many/
  );
});

test("the prompt carries the node order and the failing node's input", () => {
  const msg = buildUserMessage(load("jwt-dropped-binary"));
  assert.match(msg, /Contract Upload \[success, 1 items\] -> Verify JWT \[success, 1 items\] -> Upload Contract \[error\]/);
  assert.match(msg, /"from": "Verify JWT"/);
});

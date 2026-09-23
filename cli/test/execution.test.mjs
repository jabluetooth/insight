import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseExecution, parseFlatted, normalizeExecution, summarize, ExecutionError } from "../src/execution.mjs";

const fixture = (name) => readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8");

test("summarizes the failing node, error, trace and its input", () => {
  const s = summarize(parseExecution(fixture("shape-changed")));
  assert.equal(s.failed, true);
  assert.equal(s.failingNode.name, "Build Email");
  assert.equal(s.failingNode.type, "n8n-nodes-base.set");
  assert.match(s.error.message, /reading 'email'/);
  assert.deepEqual(s.trace.map((t) => [t.name, t.status]), [
    ["Order Webhook", "success"],
    ["Fetch Order", "success"],
    ["Build Email", "error"],
  ]);
  assert.match(s.input, /"from": "Fetch Order"/);
  assert.match(s.input, /"customer"/);
});

test("reads n8n's flatted serialization", () => {
  // parseFlatted revives in place, so each use gets a fresh copy.
  const flatted = () => [{ resultData: "1" }, { runData: "2", lastNodeExecuted: "3", error: "4" }, {}, "Code", { message: "5" }, "boom"];
  assert.deepEqual(parseFlatted(flatted()), { resultData: { runData: {}, lastNodeExecuted: "Code", error: { message: "boom" } } });
  const exec = normalizeExecution({ id: 7, status: "error", data: JSON.stringify(flatted()) });
  const s = summarize(exec);
  assert.equal(s.failingNode.name, "Code");
  assert.equal(s.error.message, "boom");
});

test("takes the first failure from a list response", () => {
  const ok = { id: 1, status: "success", data: { resultData: { runData: {} } } };
  const bad = { id: 2, status: "error", data: { resultData: { runData: {}, lastNodeExecuted: "X", error: { message: "e" } } } };
  assert.equal(normalizeExecution({ data: [ok, bad] }).id, 2);
});

test("explains what is missing instead of crashing", () => {
  assert.throws(() => parseExecution("not json"), ExecutionError);
  assert.throws(() => parseExecution(JSON.stringify({ id: 1, status: "error" })), /includeData=true/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, REDACTED } from "../src/redact.mjs";

test("redacts secret-named fields whatever their value", () => {
  const { value, count } = redact({ password: "hunter2", apiKey: "abc", nested: { client_secret: "x1", keep: "fine" } });
  assert.equal(value.password, REDACTED);
  assert.equal(value.apiKey, REDACTED);
  assert.equal(value.nested.client_secret, REDACTED);
  assert.equal(value.nested.keep, "fine");
  assert.equal(count, 3);
});

test("redacts n8n { name, value } header pairs", () => {
  const { value } = redact({ parameters: [{ name: "Authorization", value: "abc123" }, { name: "Accept", value: "json" }] });
  assert.equal(value.parameters[0].value, REDACTED);
  assert.equal(value.parameters[1].value, "json");
});

test("redacts credential shapes inside free text", () => {
  // Provider-shaped keys are assembled at runtime so none sits in the repo as a literal.
  const text = [
    "Bearer abcdefghijklmnop.qrs",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJlLXZhbHVl",
    "gsk_abcdefghijklmnopqrstuvwxyz",
    "sk-ant-abcdefghijklmnopqrstu",
    ["sk", "live", "abcdefghijklmnopqrst"].join("_"),
    "xoxb-1234567890-abcdefghij",
    "ghp_abcdefghijklmnopqrstuvwx",
    "AKIAABCDEFGHIJKLMNOP",
    "n8n_api_abcdef123456",
    "https://user:pa55@db.example.com/x",
    "https://api.example.com/v1?api_key=zzz999&page=2",
  ].join(" | ");
  const { value, count } = redact({ message: text });
  for (const secret of ["abcdefghijklmnop.qrs", "eyJzdWIi", "gsk_", "sk-ant-", "sk_live_", "xoxb-", "ghp_", "AKIA", "n8n_api_", "pa55", "zzz999"]) {
    assert.ok(!value.message.includes(secret), `leaked ${secret}: ${value.message}`);
  }
  assert.ok(value.message.includes("Bearer [REDACTED]"), "keeps the scheme readable");
  assert.ok(value.message.includes("&page=2"), "keeps harmless query params");
  assert.equal(count, 11);
});

test("keeps n8n expressions and diagnosis-relevant settings readable", () => {
  const { value } = redact({ token: "={{ $json.headers.authorization }}", authentication: "genericCredentialType", tokenType: "Bearer" });
  assert.equal(value.token, "={{ $json.headers.authorization }}");
  assert.equal(value.authentication, "genericCredentialType");
  assert.equal(value.tokenType, "Bearer");
});

test("removes exact secrets it was given, anywhere", () => {
  const { value } = redact({ note: "key was plain-key-value-1 in a sentence" }, ["plain-key-value-1"]);
  assert.equal(value.note, "key was [REDACTED] in a sentence");
});

test("does not mutate its input and survives cycles", () => {
  const input = { password: "p" };
  input.self = input;
  const { value } = redact(input);
  assert.equal(input.password, "p");
  assert.equal(value.self, "[Circular]");
});

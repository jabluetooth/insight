// Secret redaction (PRD FR-3). Runs on your machine before any execution
// data is printed, sent to Groq, or sent to the hosted pipeline.
//
// Two passes over every value:
//   1. By key: a field whose name says it holds a secret (password, token,
//      apiKey, Authorization, Cookie...) is replaced outright, whatever its
//      value looks like. n8n's HTTP Request node keeps headers as
//      { name, value } pairs, so a `value` whose sibling `name` is
//      sensitive is caught the same way.
//   2. By shape: strings are scanned for well-known credential formats
//      (bearer tokens, JWTs, provider key prefixes, keys in URLs), so a
//      secret pasted into an error message or a request body is caught too.
//
// This is pattern matching, not a guarantee: a secret with no recognisable
// name or shape can still get through. `insight redact` prints exactly what
// would be sent, so it can be checked by eye first.

export const REDACTED = "[REDACTED]";

const SENSITIVE_KEY =
  /(pass(word|wd)?|secret|token|api[-_ ]?key|apikey|access[-_ ]?key|authorization|cookie|private[-_ ]?key|session[-_ ]?(id|key)?|signature|x-api-key|client[-_ ]?secret)$/i;

// Keys that match the pattern above but hold references or settings, not
// secrets, and are worth keeping for a diagnosis ("authentication": "none"
// vs "genericCredentialType" is often the whole answer).
const SAFE_KEYS = new Set(["authentication", "genericAuthType", "nodeCredentialType", "tokenType", "sendHeaders"]);

const PATTERNS = [
  { kind: "private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { kind: "bearer token", re: /\b(Bearer)\s+[A-Za-z0-9\-._~+/]{8,}=*/gi, keep: "$1 " },
  { kind: "basic auth", re: /\b(Basic)\s+[A-Za-z0-9+/]{12,}={0,2}/g, keep: "$1 " },
  { kind: "jwt", re: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g },
  { kind: "api key", re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/g },
  { kind: "api key", re: /\bgsk_[A-Za-z0-9]{20,}/g },
  { kind: "api key", re: /\bhf_[A-Za-z0-9]{20,}/g },
  { kind: "api key", re: /\bn8n_api_[A-Za-z0-9]{8,}/g },
  { kind: "api key", re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { kind: "api key", re: /\bAIza[0-9A-Za-z_-]{35}/g },
  { kind: "api key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { kind: "token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g },
  { kind: "url credentials", re: /(\/\/)[^/\s:@"']+:[^/\s@"']+@/g, keep: "$1" , suffix: "@" },
  {
    kind: "url parameter",
    re: /([?&](?:api[_-]?key|apikey|key|token|access_token|auth|secret|password|sig|signature)=)[^&\s"'#]+/gi,
    keep: "$1",
  },
];

function redactString(str, stats, extra) {
  let out = str;
  for (const secret of extra) {
    if (secret && out.includes(secret)) {
      out = out.split(secret).join(REDACTED);
      bump(stats, "provided secret");
    }
  }
  for (const { kind, re, keep = "", suffix = "" } of PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, (...args) => {
      bump(stats, kind);
      // `keep` may reference capture groups ($1) to leave a prefix readable.
      const groups = args.slice(1, -2);
      return keep.replace(/\$(\d)/g, (_, n) => groups[Number(n) - 1] ?? "") + REDACTED + suffix;
    });
  }
  return out;
}

function bump(stats, kind) {
  stats.count += 1;
  stats.kinds[kind] = (stats.kinds[kind] ?? 0) + 1;
}

function isSensitiveKey(key) {
  return !SAFE_KEYS.has(key) && SENSITIVE_KEY.test(key);
}

function walk(value, stats, extra, seen) {
  if (typeof value === "string") return redactString(value, stats, extra);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    const out = value.map((v) => walk(v, stats, extra, seen));
    seen.delete(value);
    return out;
  }

  const out = {};
  // { name: "Authorization", value: "..." } — n8n's header/query parameter shape.
  const pairIsSensitive = typeof value.name === "string" && isSensitiveKey(value.name.trim()) && "value" in value;
  for (const [key, v] of Object.entries(value)) {
    const sensitive = (key === "value" && pairIsSensitive) || isSensitiveKey(key);
    // An n8n expression ("={{ $json.token }}") is a reference, not the secret
    // itself, and is often exactly what a diagnosis needs to see.
    const expression = typeof v === "string" && /^=?\s*\{\{[\s\S]*\}\}\s*$/.test(v);
    if (sensitive && !expression && v !== null && v !== "" && typeof v !== "object" && typeof v !== "boolean") {
      out[key] = REDACTED;
      bump(stats, "secret field");
    } else {
      out[key] = walk(v, stats, extra, seen);
    }
  }
  seen.delete(value);
  return out;
}

/**
 * Returns a redacted deep copy of `value` plus what was removed.
 * `extraSecrets` are exact strings to remove wherever they appear (e.g. the
 * n8n API key the CLI itself was given).
 */
export function redact(value, extraSecrets = []) {
  const stats = { count: 0, kinds: {} };
  const extra = extraSecrets.filter((s) => typeof s === "string" && s.length >= 6);
  const result = walk(value, stats, extra, new WeakSet());
  return { value: result, count: stats.count, kinds: stats.kinds };
}

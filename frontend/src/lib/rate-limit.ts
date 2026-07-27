// In-memory per-IP rate limiter for the public paste-and-diagnose endpoint.
//
// PRD §5 requires a per-IP cap here because this endpoint fronts a shared,
// org-wide Groq free-tier quota (§6.2) — one caller without a rate limit
// can exhaust or throttle the quota for every other user of the pipeline,
// not just themselves. §6.6.1 step 3 requires this check to run before
// anything is forwarded to n8n.
//
// PRODUCTION NOTE (§6.9 open architecture question #3): this is a simple
// in-memory sliding-window counter kept in a module-level Map. That is fine
// for a single long-lived Node process, but it does NOT survive across
// serverless instances or regions — each concurrent instance/cold start
// gets its own Map, so the effective limit is "N requests per instance,"
// not truly "N requests per IP." Production should move this to
// platform-level edge rate limiting (e.g. Vercel/Cloudflare edge config, or
// a shared store like Upstash Redis) per §6.9 item 3. This version is
// intentionally scoped to "good enough for this project's current stage."

const WINDOW_MS = 60_000; // 1-minute sliding window
const MAX_REQUESTS_PER_WINDOW = 5; // conservative given Groq's shared org-wide cap (§6.2)
const SWEEP_INTERVAL_MS = 5 * 60_000;

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Forget IPs with no recent activity so the Map doesn't grow unbounded for the process's lifetime. */
function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((t) => now - t > WINDOW_MS)) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(identifier);
  const recent = (existing?.timestamps ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    buckets.set(identifier, { timestamps: recent });
    const oldest = recent[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, WINDOW_MS - (now - oldest)),
    };
  }

  recent.push(now);
  buckets.set(identifier, { timestamps: recent });
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - recent.length,
    retryAfterMs: 0,
  };
}

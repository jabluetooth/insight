import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSafeInstanceUrl } from "@/lib/instance-url";
import type { DiagnoseRequestBody, DiagnoseErrorResponse } from "@/lib/types";

// Thin proxy in front of the n8n diagnosis pipeline webhook.
//
// Per PRD §6.2a and §6.6.1 steps 2-4, this route handler contains NO
// diagnosis logic of its own. All it does is:
//   1. Rate-limit per IP (§5, §6.6.1 step 3).
//   2. Validate the request is one of the two shapes FR-12 accepts.
//   3. Forward it to the n8n webhook with the shared-secret header
//      (§6.6.1 step 3-4) — keeping the webhook URL and secret off the client.
//   4. Relay n8n's JSON response straight back, unchanged (§6.6.1 step 11).
// If this file ever grows a retry policy, a diagnosis fallback, or anything
// that duplicates what the n8n workflow already does, that's a sign it has
// stopped being "thin" and violates §6.2a.

const N8N_DIAGNOSE_WEBHOOK_URL =
  process.env.N8N_DIAGNOSE_WEBHOOK_URL ??
  "https://n8n.filheinzrelatorre.com/webhook/insight/diagnose";

const N8N_WEBHOOK_SHARED_SECRET = process.env.N8N_WEBHOOK_SHARED_SECRET;

// PRD §2.1 targets <20s end-to-end for a diagnosis; give the upstream a
// little headroom before we give up and report it unreachable.
const UPSTREAM_TIMEOUT_MS = 25_000;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function errorResponse(status: number, message: string, detail?: string) {
  const body: DiagnoseErrorResponse = { error: true, message, detail };
  return NextResponse.json(body, { status });
}

function isValidRequestBody(body: unknown): body is DiagnoseRequestBody {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;

  if (candidate.mode === "execution") {
    return (
      typeof candidate.executionId === "string" &&
      candidate.executionId.trim().length > 0 &&
      typeof candidate.baseUrl === "string" &&
      candidate.baseUrl.trim().length > 0 &&
      typeof candidate.apiKey === "string" &&
      candidate.apiKey.trim().length > 0
    );
  }

  if (candidate.mode === "upload") {
    return candidate.execution != null && typeof candidate.execution === "object";
  }

  return false;
}

export async function POST(request: NextRequest) {
  // Step 1 (§6.6.1 step 3): apply the per-IP rate limit before forwarding anything.
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return errorResponse(
      429,
      "Too many diagnosis requests from this address. Please wait a minute and try again."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }

  if (!isValidRequestBody(body)) {
    return errorResponse(
      400,
      "Request must include either { mode: 'execution', executionId, baseUrl, apiKey } (all three required together) or { mode: 'upload', execution }."
    );
  }

  if (body.mode === "execution" && !isSafeInstanceUrl(body.baseUrl)) {
    return errorResponse(
      400,
      "Instance base URL must be a public HTTPS URL (no localhost, internal hostnames, or bare IP addresses)."
    );
  }

  if (!N8N_WEBHOOK_SHARED_SECRET) {
    // Fail loudly rather than silently forwarding a request n8n's Header
    // Auth check would reject anyway (§6.6.1 step 4) — a misconfigured
    // deployment should be obvious, not a mysterious blank diagnosis.
    console.error(
      "[diagnose] N8N_WEBHOOK_SHARED_SECRET is not configured — see .env.example."
    );
    return errorResponse(
      500,
      "Diagnosis service is misconfigured. Please contact the site owner."
    );
  }

  // IMPORTANT (PRD §5): never log `body` here or in any catch branch below —
  // in "execution" mode it carries the visitor's own n8n API key in memory
  // for this request only, and it must never reach server logs.

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(N8N_DIAGNOSE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        N8N_BEARER_TOKEN: N8N_WEBHOOK_SHARED_SECRET,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await upstreamResponse.text();
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      // n8n (or something in front of it) returned non-JSON — e.g. an HTML
      // error page. Surface this plainly per §5's Reliability NFR ("clear
      // 'diagnosis unavailable, here's the raw error' fallback") instead of
      // passing broken data through to the page.
      return errorResponse(
        502,
        "Diagnosis unavailable — the diagnosis service returned an unexpected response.",
        rawText.slice(0, 500)
      );
    }

    // Relay n8n's status code and body back to the client as-is (§6.6.1 step 11).
    return NextResponse.json(payload, { status: upstreamResponse.status });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return errorResponse(
      502,
      isAbort
        ? "Diagnosis unavailable — the diagnosis service took too long to respond."
        : "Diagnosis unavailable — could not reach the diagnosis service.",
      // Safe to include: this is the fetch/network error's own message, not
      // anything derived from the request body (never the apiKey).
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    clearTimeout(timeout);
  }
}

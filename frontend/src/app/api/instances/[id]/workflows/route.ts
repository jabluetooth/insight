import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstanceById } from "@/lib/dashboard-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidInstanceId } from "@/lib/validators";
import type { ListWorkflowsResult, RemoteWorkflow } from "@/lib/types";

// Thin proxy in front of the n8n "Insight - Manage Instance" workflow's
// list_workflows action — same pattern as ../../revoke/route.ts: verify
// ownership of instanceId via getInstanceById (owner-scoped, so an instance
// that exists but belongs to someone else comes back as null, same as one
// that doesn't exist at all) before forwarding anything to n8n.
//
// SECURITY: this route deliberately never relays n8n's raw response or a
// raw error/exception message to the browser. It logs full detail
// server-side and returns only a fixed, allowlisted shape. This is the one
// proxy in the app whose upstream call is made with a *decrypted*
// third-party n8n API key (§6.6a) — an unshaped passthrough here would risk
// leaking that key or internal infrastructure detail if the upstream
// workflow's own error branch ever included request context, which this
// repo has no way to guarantee it doesn't.

const N8N_MANAGE_INSTANCE_WEBHOOK_URL =
  process.env.N8N_MANAGE_INSTANCE_WEBHOOK_URL ??
  "https://n8n.filheinzrelatorre.com/webhook/insight/manage-instance";

const N8N_WEBHOOK_SHARED_SECRET = process.env.N8N_WEBHOOK_SHARED_SECRET;

const UPSTREAM_TIMEOUT_MS = 25_000;

// Authenticated route, so rate-limited per user rather than per IP (unlike
// the public /api/diagnose limiter) — generous enough for normal dashboard
// use, tight enough that a compromised session can't hammer a connected
// instance's REST API through this proxy.
const RATE_LIMIT_KEY_PREFIX = "list-workflows:";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: true, message }, { status });
}

function shapeWorkflow(raw: unknown): RemoteWorkflow | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") return null;
  return {
    id: candidate.id,
    name: candidate.name,
    active: Boolean(candidate.active),
    monitored: Boolean(candidate.monitored),
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(401, "You must be signed in to list this instance's workflows.");
  }

  const { id: instanceId } = await context.params;

  // A malformed id can never belong to anyone — treat it identically to
  // "not found" rather than letting it reach Postgres as a raw type error.
  if (!isValidInstanceId(instanceId)) {
    return errorResponse(404, "No such instance.");
  }

  const rateLimit = checkRateLimit(`${RATE_LIMIT_KEY_PREFIX}${session.user.id}`);
  if (!rateLimit.allowed) {
    return errorResponse(429, "Too many requests. Please wait a minute and try again.");
  }

  try {
    const owned = await getInstanceById(instanceId, session.user.id);
    if (!owned) {
      return errorResponse(404, "No such instance.");
    }
  } catch (err) {
    console.error("[instances/[id]/workflows] ownership check failed", err);
    return errorResponse(502, "Couldn't verify ownership of this instance before listing its workflows.");
  }

  if (!N8N_WEBHOOK_SHARED_SECRET) {
    console.error(
      "[instances/[id]/workflows] N8N_WEBHOOK_SHARED_SECRET is not configured — see .env.example."
    );
    return errorResponse(500, "Instance management is misconfigured. Please contact the site owner.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(N8N_MANAGE_INSTANCE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        N8N_BEARER_TOKEN: N8N_WEBHOOK_SHARED_SECRET,
      },
      body: JSON.stringify({ action: "list_workflows", instanceId }),
      signal: controller.signal,
    });

    const rawText = await upstreamResponse.text();
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      console.error(
        "[instances/[id]/workflows] non-JSON upstream response",
        upstreamResponse.status,
        rawText.slice(0, 2000)
      );
      return errorResponse(
        502,
        "Listing this instance's workflows failed — the instance-management service returned an unexpected response."
      );
    }

    const candidate = payload as Partial<ListWorkflowsResult> | null;
    if (candidate && candidate.status === "ok" && Array.isArray(candidate.workflows)) {
      const workflows = candidate.workflows.map(shapeWorkflow).filter((w): w is RemoteWorkflow => w != null);
      const shaped: ListWorkflowsResult = { status: "ok", workflows };
      return NextResponse.json(shaped, { status: 200 });
    }

    // Any non-success shape (including a legitimate upstream { status:
    // "error" } payload) is logged in full server-side and reduced to a
    // generic message client-side — never relay the upstream body itself.
    console.error("[instances/[id]/workflows] upstream error", upstreamResponse.status, payload);
    return errorResponse(502, "Couldn't list workflows on this instance. Please try again.");
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error("[instances/[id]/workflows] request failed", err);
    return errorResponse(
      502,
      isAbort
        ? "Listing this instance's workflows timed out."
        : "Listing this instance's workflows failed — could not reach the instance-management service."
    );
  } finally {
    clearTimeout(timeout);
  }
}

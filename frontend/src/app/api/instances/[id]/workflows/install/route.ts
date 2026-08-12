import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstanceById } from "@/lib/dashboard-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidInstanceId, isValidWorkflowId } from "@/lib/validators";
import type { InstallWorkflowRequestBody, InstallWorkflowResult } from "@/lib/types";

// Thin proxy in front of the n8n "Insight - Manage Instance" workflow's
// install_workflow action — same ownership-gate pattern as ../route.ts and
// ../../revoke/route.ts. This is the one call in this frontend that causes
// Insight to write to a user's own n8n instance: creating/activating its
// error-workflow template there (once per instance, reused after) and
// pointing the given workflowId's Error Workflow setting at it. n8n never
// touches the target workflow's own nodes/connections — see PRD §5.
//
// SECURITY: same unshaped-passthrough concern as ../route.ts applies here,
// more so — this action makes n8n call WRITE endpoints on the target
// instance with a decrypted third-party API key. Never relay n8n's raw
// response or a raw exception message to the browser; log full detail
// server-side and return a fixed, allowlisted shape only.

const N8N_MANAGE_INSTANCE_WEBHOOK_URL =
  process.env.N8N_MANAGE_INSTANCE_WEBHOOK_URL ??
  "https://n8n.filheinzrelatorre.com/webhook/insight/manage-instance";

const N8N_WEBHOOK_SHARED_SECRET = process.env.N8N_WEBHOOK_SHARED_SECRET;

const UPSTREAM_TIMEOUT_MS = 30_000; // slightly higher than the other proxies: a first-time install on an instance also creates + activates a workflow on it, not just a read

const RATE_LIMIT_KEY_PREFIX = "install-workflow:";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: true, message }, { status });
}

function isValidRequestBody(body: unknown): body is InstallWorkflowRequestBody {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.workflowId === "string" && candidate.workflowId.trim().length > 0;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(401, "You must be signed in to add a workflow.");
  }

  const { id: instanceId } = await context.params;

  if (!isValidInstanceId(instanceId)) {
    return errorResponse(404, "No such instance.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }

  if (!isValidRequestBody(body)) {
    return errorResponse(400, "Request must include { workflowId }.");
  }

  const workflowId = body.workflowId.trim();
  if (!isValidWorkflowId(workflowId)) {
    return errorResponse(400, "Invalid workflow id.");
  }

  // Per-user limit: this action makes n8n create/activate a workflow on a
  // third-party instance, so it's rate-limited more tightly than a read,
  // and independently of the client-side "one install in flight" guard
  // (WorkflowList.tsx) — that guard is a UX nicety, not the enforcement.
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
    console.error("[instances/[id]/workflows/install] ownership check failed", err);
    return errorResponse(502, "Couldn't verify ownership of this instance before adding a workflow.");
  }

  if (!N8N_WEBHOOK_SHARED_SECRET) {
    console.error(
      "[instances/[id]/workflows/install] N8N_WEBHOOK_SHARED_SECRET is not configured — see .env.example."
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
      body: JSON.stringify({ action: "install_workflow", instanceId, workflowId }),
      signal: controller.signal,
    });

    const rawText = await upstreamResponse.text();
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      console.error(
        "[instances/[id]/workflows/install] non-JSON upstream response",
        upstreamResponse.status,
        rawText.slice(0, 2000)
      );
      return errorResponse(
        502,
        "Adding this workflow failed — the instance-management service returned an unexpected response."
      );
    }

    const candidate = payload as Partial<InstallWorkflowResult> | null;
    if (
      candidate &&
      candidate.status === "installed" &&
      typeof candidate.workflowId === "string" &&
      typeof candidate.workflowName === "string"
    ) {
      const shaped: InstallWorkflowResult = {
        status: "installed",
        workflowId: candidate.workflowId,
        workflowName: candidate.workflowName,
      };
      return NextResponse.json(shaped, { status: 200 });
    }

    // Any non-success shape (including a legitimate upstream { status:
    // "error" } payload, which on this action could describe an n8n API
    // failure made with the target instance's own decrypted key) is logged
    // in full server-side only — never relayed to the browser.
    console.error("[instances/[id]/workflows/install] upstream error", upstreamResponse.status, payload);
    return errorResponse(502, "Adding this workflow failed. Please try again.");
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error("[instances/[id]/workflows/install] request failed", err);
    return errorResponse(
      502,
      isAbort
        ? "Adding this workflow timed out."
        : "Adding this workflow failed — could not reach the instance-management service."
    );
  } finally {
    clearTimeout(timeout);
  }
}

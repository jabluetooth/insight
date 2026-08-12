import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstanceById } from "@/lib/dashboard-data";
import type { InstallWorkflowRequestBody, InstallWorkflowResult } from "@/lib/types";

// Thin proxy in front of the n8n "Insight - Manage Instance" workflow's
// install_workflow action — same ownership-gate pattern as ../route.ts and
// ../../revoke/route.ts. This is the one call in this frontend that causes
// Insight to write to a user's own n8n instance: creating/activating its
// error-workflow template there (once per instance, reused after) and
// pointing the given workflowId's Error Workflow setting at it. n8n never
// touches the target workflow's own nodes/connections — see PRD §5.

const N8N_MANAGE_INSTANCE_WEBHOOK_URL =
  process.env.N8N_MANAGE_INSTANCE_WEBHOOK_URL ??
  "https://n8n.filheinzrelatorre.com/webhook/insight/manage-instance";

const N8N_WEBHOOK_SHARED_SECRET = process.env.N8N_WEBHOOK_SHARED_SECRET;

const UPSTREAM_TIMEOUT_MS = 30_000; // slightly higher than the other proxies: a first-time install on an instance also creates + activates a workflow on it, not just a read

function errorResponse(status: number, message: string, detail?: string) {
  return NextResponse.json({ error: true, message, detail }, { status });
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

  try {
    const owned = await getInstanceById(instanceId, session.user.id);
    if (!owned) {
      return errorResponse(404, "No such instance.");
    }
  } catch (err) {
    return errorResponse(
      502,
      "Couldn't verify ownership of this instance before adding a workflow.",
      err instanceof Error ? err.message : String(err)
    );
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
      return errorResponse(
        502,
        "Adding this workflow failed — the instance-management service returned an unexpected response.",
        rawText.slice(0, 500)
      );
    }

    return NextResponse.json(payload as InstallWorkflowResult, {
      status: upstreamResponse.status,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return errorResponse(
      502,
      isAbort
        ? "Adding this workflow timed out."
        : "Adding this workflow failed — could not reach the instance-management service.",
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    clearTimeout(timeout);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstanceById } from "@/lib/dashboard-data";
import type { ListWorkflowsResult } from "@/lib/types";

// Thin proxy in front of the n8n "Insight - Manage Instance" workflow's
// list_workflows action — same pattern as ../../revoke/route.ts: verify
// ownership of instanceId via getInstanceById (owner-scoped, so an instance
// that exists but belongs to someone else comes back as null, same as one
// that doesn't exist at all) before forwarding anything to n8n.

const N8N_MANAGE_INSTANCE_WEBHOOK_URL =
  process.env.N8N_MANAGE_INSTANCE_WEBHOOK_URL ??
  "https://n8n.filheinzrelatorre.com/webhook/insight/manage-instance";

const N8N_WEBHOOK_SHARED_SECRET = process.env.N8N_WEBHOOK_SHARED_SECRET;

const UPSTREAM_TIMEOUT_MS = 25_000;

function errorResponse(status: number, message: string, detail?: string) {
  return NextResponse.json({ error: true, message, detail }, { status });
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

  try {
    const owned = await getInstanceById(instanceId, session.user.id);
    if (!owned) {
      return errorResponse(404, "No such instance.");
    }
  } catch (err) {
    return errorResponse(
      502,
      "Couldn't verify ownership of this instance before listing its workflows.",
      err instanceof Error ? err.message : String(err)
    );
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
      return errorResponse(
        502,
        "Listing this instance's workflows failed — the instance-management service returned an unexpected response.",
        rawText.slice(0, 500)
      );
    }

    return NextResponse.json(payload as ListWorkflowsResult, {
      status: upstreamResponse.status,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return errorResponse(
      502,
      isAbort
        ? "Listing this instance's workflows timed out."
        : "Listing this instance's workflows failed — could not reach the instance-management service.",
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    clearTimeout(timeout);
  }
}

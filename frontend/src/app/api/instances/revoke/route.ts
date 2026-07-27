import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstanceById } from "@/lib/dashboard-data";
import type { ManageInstanceRevokeResult, RevokeInstanceRequestBody } from "@/lib/types";

// Thin proxy in front of the n8n "Insight - Manage Instance" workflow's
// revoke action — same pattern as ./connect/route.ts and
// src/app/api/diagnose/route.ts.
//
// The confirmed contract for this action is `{ action: "revoke",
// instanceId }` with no ownerUserId in the body, so nothing at the n8n side
// re-checks ownership for us. Rather than change that contract, this route
// adds its own ownership gate in front of it: it reads the instance via
// getInstanceById(instanceId, session.user.id) BEFORE forwarding anything —
// that query already filters by owner_user_id, so it returns null both for
// an instance that doesn't exist and one that belongs to someone else. If a
// signed-in user submits an instanceId they don't own, this route rejects
// it with a 404 before n8n ever sees the request — the same
// can't-distinguish-"not yours"-from-"doesn't exist" posture as the
// /dashboard/instances/[id] page.

const N8N_MANAGE_INSTANCE_WEBHOOK_URL =
  process.env.N8N_MANAGE_INSTANCE_WEBHOOK_URL ??
  "https://n8n.filheinzrelatorre.com/webhook/insight/manage-instance";

const N8N_WEBHOOK_SHARED_SECRET = process.env.N8N_WEBHOOK_SHARED_SECRET;

const UPSTREAM_TIMEOUT_MS = 25_000;

function errorResponse(status: number, message: string, detail?: string) {
  return NextResponse.json({ error: true, message, detail }, { status });
}

function isValidRequestBody(body: unknown): body is RevokeInstanceRequestBody {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.instanceId === "string" && candidate.instanceId.trim().length > 0;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(401, "You must be signed in to revoke an instance.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }

  if (!isValidRequestBody(body)) {
    return errorResponse(400, "Request must include { instanceId }.");
  }

  const instanceId = body.instanceId.trim();

  try {
    const owned = await getInstanceById(instanceId, session.user.id);
    if (!owned) {
      return errorResponse(404, "No such instance.");
    }
  } catch (err) {
    return errorResponse(
      502,
      "Couldn't verify ownership of this instance before revoking it.",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (!N8N_WEBHOOK_SHARED_SECRET) {
    console.error(
      "[instances/revoke] N8N_WEBHOOK_SHARED_SECRET is not configured — see .env.example."
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
      body: JSON.stringify({ action: "revoke", instanceId }),
      signal: controller.signal,
    });

    const rawText = await upstreamResponse.text();
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      return errorResponse(
        502,
        "Revoking this instance failed — the instance-management service returned an unexpected response.",
        rawText.slice(0, 500)
      );
    }

    return NextResponse.json(payload as ManageInstanceRevokeResult, {
      status: upstreamResponse.status,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return errorResponse(
      502,
      isAbort
        ? "Revoking this instance timed out."
        : "Revoking this instance failed — could not reach the instance-management service.",
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    clearTimeout(timeout);
  }
}

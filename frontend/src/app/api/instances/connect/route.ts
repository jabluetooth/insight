import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { ConnectInstanceRequestBody, ManageInstanceConnectResult } from "@/lib/types";

// Thin proxy in front of the n8n "Insight - Manage Instance" workflow's
// connect action — mirrors src/app/api/diagnose/route.ts's shape exactly
// (auth check, validate, forward with the shared-secret header, relay the
// response unchanged). This route holds no instance-management logic of
// its own: n8n validates the key, generates the ingest token, encrypts the
// API key, and writes the `connected_instances` row (PRD §6.6
// "Connecting or revoking an instance"). This file's only added job vs.
// /api/diagnose is requiring a signed-in session and setting ownerUserId
// server-side.

const N8N_MANAGE_INSTANCE_WEBHOOK_URL =
  process.env.N8N_MANAGE_INSTANCE_WEBHOOK_URL ??
  "https://n8n.filheinzrelatorre.com/webhook/insight/manage-instance";

// Same shared secret already used by /api/diagnose — confirmed from the
// backend side to cover both n8n webhooks.
const N8N_WEBHOOK_SHARED_SECRET = process.env.N8N_WEBHOOK_SHARED_SECRET;

const UPSTREAM_TIMEOUT_MS = 25_000;

function errorResponse(status: number, message: string, detail?: string) {
  return NextResponse.json({ error: true, message, detail }, { status });
}

function isValidRequestBody(body: unknown): body is ConnectInstanceRequestBody {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.label === "string" &&
    candidate.label.trim().length > 0 &&
    typeof candidate.baseUrl === "string" &&
    candidate.baseUrl.trim().length > 0 &&
    typeof candidate.apiKey === "string" &&
    candidate.apiKey.trim().length > 0
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(401, "You must be signed in to connect an instance.");
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
      "Request must include { label, baseUrl, apiKey } (all three required)."
    );
  }

  try {
    void new URL(body.baseUrl);
  } catch {
    return errorResponse(400, "Instance base URL must be a valid URL.");
  }

  if (!N8N_WEBHOOK_SHARED_SECRET) {
    console.error(
      "[instances/connect] N8N_WEBHOOK_SHARED_SECRET is not configured — see .env.example."
    );
    return errorResponse(500, "Instance management is misconfigured. Please contact the site owner.");
  }

  // IMPORTANT: never log `body` — it carries the submitted n8n API key.
  // ownerUserId is set here, server-side, from the verified session — the
  // client never gets a say in whose instance this is registered under.
  const upstreamBody = {
    action: "connect" as const,
    ownerUserId: session.user.id,
    label: body.label.trim(),
    baseUrl: body.baseUrl.trim(),
    apiKey: body.apiKey.trim(),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(N8N_MANAGE_INSTANCE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        N8N_BEARER_TOKEN: N8N_WEBHOOK_SHARED_SECRET,
      },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    });

    const rawText = await upstreamResponse.text();
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      return errorResponse(
        502,
        "Connecting this instance failed — the instance-management service returned an unexpected response.",
        rawText.slice(0, 500)
      );
    }

    // Relayed as-is. NOTE: on success this includes `ingestToken` — a
    // one-time-viewable secret the signed-in user needs to paste into their
    // own n8n error-workflow template. It's fine for this response to carry
    // it back to the browser (that's the whole point), but this route must
    // never log `payload` either, since it may contain that token.
    return NextResponse.json(payload as ManageInstanceConnectResult, {
      status: upstreamResponse.status,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return errorResponse(
      502,
      isAbort
        ? "Connecting this instance timed out."
        : "Connecting this instance failed — could not reach the instance-management service.",
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    clearTimeout(timeout);
  }
}

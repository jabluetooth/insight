"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, PlugZap } from "lucide-react";
import { Field, Notice, Spinner, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { WorkflowList } from "@/components/WorkflowList";
import type { ConnectInstanceRequestBody, ManageInstanceConnectResult } from "@/lib/types";

type Phase = "idle" | "loading" | "success" | "error";

interface FieldErrors {
  label?: string;
  baseUrl?: string;
  apiKey?: string;
}

export function ConnectInstanceForm() {
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ingestToken, setIngestToken] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!label.trim()) errors.label = "Give this instance a label, e.g. \"Client A - prod\".";
    if (!baseUrl.trim()) {
      errors.baseUrl = "Your n8n instance base URL is required.";
    } else {
      try {
        new URL(baseUrl.trim());
      } catch {
        errors.baseUrl = "Enter a full URL, e.g. https://n8n.example.com.";
      }
    }
    if (!apiKey.trim()) errors.apiKey = "Your n8n API key is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIngestToken(null);

    if (!validate()) return;

    setPhase("loading");

    const body: ConnectInstanceRequestBody = {
      label: label.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    };

    try {
      const response = await fetch("/api/instances/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await response.json().catch(() => null)) as
        | ManageInstanceConnectResult
        | { error: true; message: string }
        | null;

      if (!response.ok || !json || "error" in json || json.status === "error") {
        const message =
          json && "message" in json ? json.message : `Connecting failed (HTTP ${response.status}).`;
        setPhase("error");
        setErrorMessage(message);
        setApiKey(""); // preserve label/baseUrl on failure, but never re-show the key
        return;
      }

      setIngestToken(json.ingestToken);
      setInstanceId(json.instanceId);
      setPhase("success");
      setApiKey("");
    } catch (err) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "Could not reach Insight.");
    } finally {
      if (statusRef.current) statusRef.current.focus();
    }
  }

  async function handleCopyToken() {
    if (!ingestToken) return;
    try {
      await navigator.clipboard.writeText(ingestToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context);
      // the token is still visible and selectable in the box either way.
    }
  }

  const isLoading = phase === "loading";

  if (phase === "success" && ingestToken && instanceId) {
    return (
      <div className="space-y-6">
        <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
          <Notice tone="success" title="Instance connected">
            <p>
              Insight scanned this instance for workflows. Click <strong>Add workflow</strong> next to any workflow
              below to install failure flagging on it: Insight creates and activates the error-workflow template on
              your instance and points that workflow&apos;s Error Workflow setting at it. No manual n8n editing.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.08em] text-muted">
                Advanced: raw ingest token
              </summary>
              <p className="mt-3 text-sm text-muted">
                Only needed if you&apos;re wiring a workflow up by hand instead of using Add workflow. It won&apos;t be
                shown again after you leave this page.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-sm border border-border bg-background p-2 pl-3">
                <code className="min-w-0 flex-1 break-all font-mono text-xs">{ingestToken}</code>
                <button type="button" className={secondaryButtonClass} onClick={handleCopyToken}>
                  {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </details>
          </Notice>
        </div>
        <WorkflowList instanceId={instanceId} />
        <p>
          <Link href="/dashboard" className="font-mono text-xs uppercase tracking-[0.08em] text-muted underline decoration-border underline-offset-4 hover:text-foreground">
            ← Back to my instances
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form className="space-y-5 rounded border border-border bg-surface p-5 sm:p-7" onSubmit={handleSubmit} noValidate>
        <Field id="label" label="Label" error={fieldErrors.label}>
          <input
            id="label"
            className={inputClass}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            aria-invalid={Boolean(fieldErrors.label)}
            aria-describedby={fieldErrors.label ? "label-error" : undefined}
            placeholder="Client A - prod"
          />
        </Field>

        <Field id="baseUrl" label="n8n instance base URL" error={fieldErrors.baseUrl}>
          <input
            id="baseUrl"
            className={inputClass}
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            aria-invalid={Boolean(fieldErrors.baseUrl)}
            aria-describedby={fieldErrors.baseUrl ? "baseUrl-error" : undefined}
            placeholder="https://n8n.example.com"
          />
        </Field>

        <Field
          id="apiKey"
          label="API key"
          error={fieldErrors.apiKey}
          hint="Encrypted at rest. Used to read execution data, and only when you add a specific workflow, to install Insight's error-workflow template and point that workflow's Error Workflow setting at it."
        >
          <input
            id="apiKey"
            className={inputClass}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            aria-invalid={Boolean(fieldErrors.apiKey)}
            aria-describedby="apiKey-hint apiKey-error"
            placeholder="n8n_api_…"
          />
        </Field>

        <div className="pt-2">
          <button type="submit" className={primaryButtonClass} disabled={isLoading}>
            {isLoading ? <Spinner /> : <PlugZap className="size-4" aria-hidden="true" />}
            {isLoading ? "Connecting" : "Connect instance"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {phase === "error" && (
          <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
            <Notice tone="error" title="Couldn't connect this instance" role="alert">
              {errorMessage}
            </Notice>
          </div>
        )}
      </div>
    </div>
  );
}

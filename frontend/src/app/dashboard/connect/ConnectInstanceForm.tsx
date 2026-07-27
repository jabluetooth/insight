"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import styles from "./connect.module.css";
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

  if (phase === "success" && ingestToken) {
    return (
      <div className={styles.statusRegion}>
        <div className={styles.bannerSuccess} ref={statusRef} tabIndex={-1}>
          <div className={styles.bannerContent}>
            <p className={styles.bannerTitle}>Instance connected</p>
            <p className={styles.bannerBody}>
              Copy this ingest token into the Error Trigger → HTTP Request
              template workflow on your n8n instance (per the onboarding
              docs) so failures there reach Insight. It won&apos;t be shown
              again after you leave this page.
            </p>
            <div className={styles.tokenBox}>
              <code className={styles.tokenValue}>{ingestToken}</code>
              <button type="button" className={styles.copyButton} onClick={handleCopyToken}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
        <p className={styles.backToDashboard}>
          <Link href="/dashboard">Back to my instances</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="label">
            Label
          </label>
          <input
            id="label"
            className={styles.input}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            aria-invalid={Boolean(fieldErrors.label)}
            aria-describedby={fieldErrors.label ? "label-error" : undefined}
            placeholder="e.g. Client A - prod"
          />
          {fieldErrors.label && (
            <span id="label-error" className={styles.fieldError} role="alert">
              {fieldErrors.label}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="baseUrl">
            n8n instance base URL
          </label>
          <input
            id="baseUrl"
            className={styles.input}
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            aria-invalid={Boolean(fieldErrors.baseUrl)}
            aria-describedby={fieldErrors.baseUrl ? "baseUrl-error" : undefined}
            placeholder="https://n8n.example.com"
          />
          {fieldErrors.baseUrl && (
            <span id="baseUrl-error" className={styles.fieldError} role="alert">
              {fieldErrors.baseUrl}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="apiKey">
            API key
          </label>
          <input
            id="apiKey"
            className={styles.input}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            aria-invalid={Boolean(fieldErrors.apiKey)}
            aria-describedby="apiKey-hint apiKey-error"
            placeholder="n8n_api_..."
          />
          <span id="apiKey-hint" className={styles.hint}>
            Encrypted at rest. Insight only ever calls read-only execution
            endpoints with it, never write or delete endpoints.
          </span>
          {fieldErrors.apiKey && (
            <span id="apiKey-error" className={styles.fieldError} role="alert">
              {fieldErrors.apiKey}
            </span>
          )}
        </div>

        <div className={styles.submitRow}>
          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading && <span className={styles.spinner} aria-hidden="true" />}
            {isLoading ? "Connecting…" : "Connect instance"}
          </button>
        </div>
      </form>

      <div className={styles.statusRegion} aria-live="polite">
        {phase === "error" && (
          <div className={styles.bannerError} ref={statusRef} tabIndex={-1} role="alert">
            <div>
              <p className={styles.bannerTitle}>Couldn&apos;t connect this instance</p>
              <p className={styles.bannerBody}>{errorMessage}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

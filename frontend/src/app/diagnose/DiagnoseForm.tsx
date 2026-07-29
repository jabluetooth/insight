"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./diagnose.module.css";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { getConfidenceTier } from "@/lib/types";
import type {
  DiagnoseErrorResponse,
  DiagnoseRequestBody,
  DiagnosisResult,
} from "@/lib/types";

type Mode = "execution" | "upload";
type Phase = "idle" | "loading" | "success" | "error";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — generous for a single execution export

/** Cycled while phase === "loading" — mirrors the real pipeline order (fetch
 * → redact → retrieve → diagnose) so the wait reads as progress, not a stall.
 * Purely cosmetic: the UI has no actual visibility into which step the
 * backend is on, so this loops on a timer rather than tracking real state. */
const LOADING_STEPS = [
  "Fetching execution details…",
  "Redacting secrets…",
  "Searching for similar failure patterns…",
  "Generating diagnosis…",
];
const LOADING_STEP_INTERVAL_MS = 2200;

interface FieldErrors {
  executionId?: string;
  baseUrl?: string;
  apiKey?: string;
  file?: string;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsText(file);
  });
}

export function DiagnoseForm() {
  const modeGroupName = useId();

  const [mode, setMode] = useState<Mode>("execution");
  const [executionId, setExecutionId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedExecution, setParsedExecution] = useState<unknown>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const resultRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "success" && resultRef.current) {
      resultRef.current.focus();
    } else if (phase === "error" && statusRef.current) {
      statusRef.current.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(() => {
      setLoadingStepIndex((i) => (i + 1) % LOADING_STEPS.length);
    }, LOADING_STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [phase]);

  function resetOutcome() {
    setResult(null);
    setErrorMessage(null);
    setErrorDetail(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFieldErrors((prev) => ({ ...prev, file: undefined }));
    resetOutcome();

    if (!file) {
      setFileName(null);
      setParsedExecution(null);
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        file: "File is too large (max 5MB for a single execution export).",
      }));
      setFileName(null);
      setParsedExecution(null);
      return;
    }

    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      setParsedExecution(parsed);
      setFileName(file.name);
    } catch {
      setFieldErrors((prev) => ({
        ...prev,
        file: "That file isn't valid JSON. Export the execution from n8n and try again.",
      }));
      setFileName(null);
      setParsedExecution(null);
    }
  }

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (mode === "execution") {
      if (!executionId.trim()) errors.executionId = "Execution ID is required.";
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
    } else if (mode === "upload") {
      if (!parsedExecution) {
        errors.file = "Upload a valid exported execution JSON file.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetOutcome();

    if (!validate()) return;

    setPhase("loading");
    setLoadingStepIndex(0);

    const body: DiagnoseRequestBody =
      mode === "execution"
        ? {
            mode: "execution",
            executionId: executionId.trim(),
            baseUrl: baseUrl.trim(),
            apiKey: apiKey.trim(),
          }
        : { mode: "upload", execution: parsedExecution };

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || (json && (json as DiagnoseErrorResponse).error)) {
        const errPayload = json as DiagnoseErrorResponse | null;
        setPhase("error");
        setErrorMessage(
          errPayload?.message ?? `Diagnosis unavailable (HTTP ${response.status}).`
        );
        setErrorDetail(errPayload?.detail ?? null);
        return;
      }

      setResult(json as DiagnosisResult);
      setPhase("success");
    } catch (err) {
      setPhase("error");
      setErrorMessage("Diagnosis unavailable — could not reach Insight.");
      setErrorDetail(err instanceof Error ? err.message : String(err));
    }
  }

  const isLoading = phase === "loading";

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>
            How would you like to submit the failure?
          </legend>
          <div className={styles.modeToggle}>
            <span className={styles.modeOption}>
              <input
                type="radio"
                id={`${modeGroupName}-execution`}
                name={modeGroupName}
                value="execution"
                checked={mode === "execution"}
                onChange={() => {
                  setMode("execution");
                  setFieldErrors({});
                  resetOutcome();
                }}
              />
              <label
                htmlFor={`${modeGroupName}-execution`}
                className={styles.modeOptionLabel}
              >
                Execution ID + my instance
              </label>
            </span>
            <span className={styles.modeOption}>
              <input
                type="radio"
                id={`${modeGroupName}-upload`}
                name={modeGroupName}
                value="upload"
                checked={mode === "upload"}
                onChange={() => {
                  setMode("upload");
                  setFieldErrors({});
                  resetOutcome();
                }}
              />
              <label
                htmlFor={`${modeGroupName}-upload`}
                className={styles.modeOptionLabel}
              >
                Upload exported JSON
              </label>
            </span>
          </div>
        </fieldset>

        {mode === "execution" ? (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="executionId">
                Execution ID
              </label>
              <input
                id="executionId"
                className={styles.input}
                type="text"
                value={executionId}
                onChange={(e) => setExecutionId(e.target.value)}
                aria-invalid={Boolean(fieldErrors.executionId)}
                aria-describedby={
                  fieldErrors.executionId ? "executionId-error" : undefined
                }
                placeholder="e.g. 4821"
              />
              {fieldErrors.executionId && (
                <span id="executionId-error" className={styles.fieldError} role="alert">
                  {fieldErrors.executionId}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="baseUrl">
                Your n8n instance base URL
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
                Your n8n API key
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
                Used only for this one request, over HTTPS. Never logged,
                never stored — Insight only calls read-only execution
                endpoints, never write or delete endpoints.
              </span>
              {fieldErrors.apiKey && (
                <span id="apiKey-error" className={styles.fieldError} role="alert">
                  {fieldErrors.apiKey}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="executionFile">
              Exported execution JSON
            </label>
            <div className={styles.fileInputWrapper}>
              <input
                id="executionFile"
                className={styles.input}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                aria-describedby="executionFile-hint executionFile-error"
                aria-invalid={Boolean(fieldErrors.file)}
              />
              <span id="executionFile-hint" className={styles.hint}>
                From n8n: open the failed execution, then Download/Export as
                JSON. Nothing else is required in this mode.
              </span>
              {fileName && <div className={styles.fileName}>Loaded: {fileName}</div>}
              {fieldErrors.file && (
                <span id="executionFile-error" className={styles.fieldError} role="alert">
                  {fieldErrors.file}
                </span>
              )}
            </div>
          </div>
        )}

        <div className={styles.submitRow}>
          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading && <span className={styles.spinner} aria-hidden="true" />}
            {isLoading ? "Diagnosing…" : "Diagnose this failure"}
          </button>
        </div>
      </form>

      <div className={styles.statusRegion} aria-live="polite">
        {phase === "loading" && (
          <div className={styles.bannerLoading} ref={statusRef} tabIndex={-1}>
            <span className={styles.pulseLoader} aria-hidden="true">
              <span className={styles.pulseRing} />
              <span className={styles.pulseRing} />
              <span className={styles.pulseCore} />
            </span>
            <div>
              <p className={styles.bannerTitle}>Diagnosing…</p>
              <p className={styles.bannerBody} aria-live="off">
                {LOADING_STEPS[loadingStepIndex]}
              </p>
              <p className={styles.bannerSubtext}>Usually well under 20 seconds.</p>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className={styles.bannerError} ref={statusRef} tabIndex={-1} role="alert">
            <div>
              <p className={styles.bannerTitle}>Diagnosis unavailable</p>
              <p className={styles.bannerBody}>{errorMessage}</p>
              {errorDetail && (
                <details className={styles.rawDetails}>
                  <summary>Raw error details</summary>
                  <pre>{errorDetail}</pre>
                </details>
              )}
            </div>
          </div>
        )}

        {phase === "success" && result && (
          <DiagnosisResultCard result={result} resultRef={resultRef} />
        )}
      </div>
    </>
  );
}

function DiagnosisResultCard({
  result,
  resultRef,
}: {
  result: DiagnosisResult;
  resultRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (result.status === "transient") {
    return (
      <div className={styles.bannerTransient} ref={resultRef} tabIndex={-1}>
        <div>
          <p className={styles.bannerTitle}>Looks transient</p>
          <p className={styles.bannerBody}>
            {result.message ??
              "No code-level root cause found — this looks like transient infrastructure flakiness (timeout, rate limit, or similar), not a bug in the workflow."}
          </p>
        </div>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className={styles.bannerError} ref={resultRef} tabIndex={-1} role="alert">
        <div>
          <p className={styles.bannerTitle}>Diagnosis unavailable</p>
          <p className={styles.bannerBody}>
            {result.message ?? "The diagnosis pipeline reported an error."}
          </p>
        </div>
      </div>
    );
  }

  const tier = getConfidenceTier(result.confidence);
  const isLowConfidence = tier === "low";

  return (
    <div className={styles.resultCard} ref={resultRef} tabIndex={-1}>
      <div className={styles.resultHeader}>
        <h2 className={styles.resultHeading}>Diagnosis</h2>
        {result.rootCauseCategory && (
          <span className={styles.categoryBadge}>{result.rootCauseCategory}</span>
        )}
      </div>

      {result.failingNode && (
        <div className={styles.row}>
          <p className={styles.rowLabel}>Failing node</p>
          <p className={styles.nodeValue}>{result.failingNode}</p>
        </div>
      )}

      <div className={styles.row}>
        <p className={styles.rowLabel}>Confidence</p>
        <ConfidenceMeter confidence={result.confidence} />
      </div>

      {result.explanation && (
        <div className={styles.row}>
          <p className={styles.rowLabel}>What likely happened</p>
          <p className={styles.explanation}>
            {isLowConfidence && (
              <span className={styles.hedgeNote}>
                Confidence is low — treat this as a lead to investigate, not
                a confirmed root cause.
              </span>
            )}
            {result.explanation}
          </p>
        </div>
      )}

      {result.suggestedFix &&
        (isLowConfidence ? (
          <div className={styles.row}>
            <p className={styles.rowLabel}>Possible fix</p>
            <div className={styles.lowConfidenceFixWrapper}>
              <p className={styles.lowConfidenceFixNote}>
                Offered tentatively given low confidence — verify before
                applying.
              </p>
              <pre className={styles.suggestedFix}>{result.suggestedFix}</pre>
            </div>
          </div>
        ) : (
          <div className={styles.row}>
            <p className={styles.rowLabel}>Suggested fix</p>
            <pre className={styles.suggestedFix}>{result.suggestedFix}</pre>
          </div>
        ))}
    </div>
  );
}

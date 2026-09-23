"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock, FileJson, Upload, X } from "lucide-react";
import { EASE } from "@/components/marketing/Reveal";
import { DiagnosisView } from "@/components/DiagnosisView";
import { Field, Notice, Spinner, inputClass, primaryButtonClass } from "@/components/ui";
import type { DiagnoseErrorResponse, DiagnoseRequestBody, DiagnosisResult } from "@/lib/types";

type Mode = "upload" | "execution";
type Phase = "idle" | "loading" | "success" | "error";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — generous for a single execution export

const MODES: { id: Mode; label: string }[] = [
  { id: "upload", label: "Upload JSON" },
  { id: "execution", label: "Execution id + instance" },
];

/** Shown while phase === "loading", in the real pipeline order, so the wait
 * reads as progress. Cosmetic: the page can't see which step the backend is
 * on, so it advances on a timer and holds on the last step. Knowledge-base
 * retrieval isn't listed because it is switched off in the pipeline. */
const LOADING_STEPS: Record<Mode, string[]> = {
  execution: ["Fetching the execution", "Redacting secrets", "Diagnosing"],
  upload: ["Redacting secrets", "Diagnosing"],
};
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

function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DiagnoseForm() {
  const [mode, setMode] = useState<Mode>("upload");
  const [executionId, setExecutionId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [parsedExecution, setParsedExecution] = useState<unknown>(null);
  const [dragging, setDragging] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const resultRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "success") resultRef.current?.focus();
    else if (phase === "error") statusRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "loading") return;
    const last = LOADING_STEPS[mode].length - 1;
    const id = setInterval(() => setLoadingStep((i) => Math.min(i + 1, last)), LOADING_STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [phase, mode]);

  function resetOutcome() {
    setResult(null);
    setErrorMessage(null);
    setErrorDetail(null);
    if (phase !== "loading") setPhase("idle");
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setFieldErrors({});
    resetOutcome();
  }

  function clearFile() {
    setFile(null);
    setParsedExecution(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function acceptFile(f: File | undefined) {
    setFieldErrors((prev) => ({ ...prev, file: undefined }));
    resetOutcome();
    if (!f) return clearFile();

    if (f.size > MAX_UPLOAD_BYTES) {
      setFieldErrors((prev) => ({ ...prev, file: "File is too large (max 5MB for a single execution export)." }));
      return clearFile();
    }
    try {
      setParsedExecution(JSON.parse(await readFileAsText(f)));
      setFile({ name: f.name, size: f.size });
    } catch {
      setFieldErrors((prev) => ({ ...prev, file: "That file isn't valid JSON. Export the execution from n8n and try again." }));
      clearFile();
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
    } else if (!parsedExecution) {
      errors.file = "Upload a valid exported execution JSON file.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetOutcome();
    if (!validate()) return;

    setPhase("loading");
    setLoadingStep(0);

    const body: DiagnoseRequestBody =
      mode === "execution"
        ? { mode: "execution", executionId: executionId.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }
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
        setErrorMessage(errPayload?.message ?? `Diagnosis unavailable (HTTP ${response.status}).`);
        setErrorDetail(errPayload?.detail ?? null);
        return;
      }

      setResult(json as DiagnosisResult);
      setPhase("success");
    } catch (err) {
      setPhase("error");
      setErrorMessage("Diagnosis unavailable — could not reach Insight.");
      setErrorDetail(err instanceof Error ? err.message : String(err));
    } finally {
      // Held in memory for this one request only — never left sitting in state after use.
      setApiKey("");
    }
  }

  const isLoading = phase === "loading";
  const steps = LOADING_STEPS[mode];

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} noValidate className="rounded border border-border bg-surface">
        <div role="tablist" aria-label="How to submit the failure" className="flex gap-1 overflow-x-auto border-b border-border p-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              aria-controls={`panel-${m.id}`}
              id={`tab-${m.id}`}
              onClick={() => switchMode(m.id)}
              className={
                "relative shrink-0 rounded px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
                (mode === m.id ? "text-foreground" : "text-muted hover:text-foreground")
              }
            >
              {mode === m.id && (
                <motion.span
                  layoutId="diagnose-mode"
                  className="absolute inset-x-2 -bottom-[9px] h-0.5 bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              {m.label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-7">
          <AnimatePresence mode="wait" initial={false}>
            {mode === "upload" ? (
              <motion.div
                key="upload"
                id="panel-upload"
                role="tabpanel"
                aria-labelledby="tab-upload"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: EASE }}
              >
                <Field
                  id="executionFile"
                  label="Exported execution JSON"
                  error={fieldErrors.file}
                  hint="The execution with its run data, from GET /api/v1/executions/{id}?includeData=true. Nothing else is needed in this mode."
                >
                  <label
                    htmlFor="executionFile"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      acceptFile(e.dataTransfer.files?.[0]);
                    }}
                    className={
                      "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded border border-dashed px-6 py-8 text-center transition-colors focus-within:border-accent " +
                      (dragging
                        ? "border-accent bg-accent/[0.06]"
                        : fieldErrors.file
                          ? "border-danger/60"
                          : "border-border hover:border-foreground/30")
                    }
                  >
                    <input
                      ref={fileInputRef}
                      id="executionFile"
                      type="file"
                      accept="application/json,.json"
                      className="sr-only"
                      onChange={(e) => acceptFile(e.target.files?.[0])}
                      aria-describedby="executionFile-hint executionFile-error"
                      aria-invalid={Boolean(fieldErrors.file)}
                    />
                    {file ? (
                      <>
                        <FileJson className="size-6 text-accent" aria-hidden="true" />
                        <span className="font-mono text-sm">{file.name}</span>
                        <span className="font-mono text-xs text-muted">{formatBytes(file.size)} · parsed · click to replace</span>
                      </>
                    ) : (
                      <>
                        <Upload className="size-6 text-muted" aria-hidden="true" />
                        <span className="text-sm">
                          Drop the file here, or <span className="text-accent underline underline-offset-4">choose one</span>
                        </span>
                        <span className="font-mono text-xs text-muted">.json · up to 5 MB</span>
                      </>
                    )}
                  </label>
                </Field>
                {file && (
                  <button
                    type="button"
                    onClick={clearFile}
                    className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted hover:text-foreground"
                  >
                    <X className="size-3.5" aria-hidden="true" /> Remove file
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="execution"
                id="panel-execution"
                role="tabpanel"
                aria-labelledby="tab-execution"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
              >
                <Field id="executionId" label="Execution ID" error={fieldErrors.executionId}>
                  <input
                    id="executionId"
                    className={inputClass}
                    type="text"
                    value={executionId}
                    onChange={(e) => setExecutionId(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.executionId)}
                    aria-describedby={fieldErrors.executionId ? "executionId-error" : undefined}
                    placeholder="4821"
                  />
                </Field>
                <Field id="baseUrl" label="Instance base URL" error={fieldErrors.baseUrl}>
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
                <div className="sm:col-span-2">
                  <Field
                    id="apiKey"
                    label="n8n API key"
                    error={fieldErrors.apiKey}
                    hint="Used for this one request over HTTPS, then cleared. Never logged, never stored. Only read endpoints are called."
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="submit" className={primaryButtonClass} disabled={isLoading}>
              {isLoading ? <Spinner /> : null}
              {isLoading ? "Diagnosing" : "Diagnose this failure"}
              {!isLoading && <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
            </button>
            <span className="font-mono text-xs text-muted">usually well under 20 seconds</span>
          </div>
        </div>
      </form>

      <div aria-live="polite">
        {phase === "loading" && (
          <div ref={statusRef} tabIndex={-1} className="rounded border border-border bg-surface p-5 focus:outline-none">
            <p className="sr-only">Diagnosing: {steps[loadingStep]}</p>
            <ol aria-hidden="true" className="space-y-2.5 font-mono text-xs">
              {steps.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={
                      "size-2 rounded-full transition-colors duration-300 " +
                      (i < loadingStep ? "bg-success" : i === loadingStep ? "bg-accent" : "bg-border")
                    }
                  />
                  <span className={i <= loadingStep ? "text-foreground" : "text-muted"}>{step}</span>
                  {i === loadingStep && (
                    <span className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="size-1 bg-muted"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                        />
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {phase === "error" && (
          <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
            <Notice tone="error" title="Diagnosis unavailable" role="alert">
              <p>{errorMessage}</p>
              {errorDetail && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-mono text-xs text-muted">Raw error details</summary>
                  <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-sm border border-border bg-background p-3 font-mono text-xs text-muted">
                    {errorDetail}
                  </pre>
                </details>
              )}
            </Notice>
          </div>
        )}

        {phase === "success" && result && <DiagnosisResultCard result={result} resultRef={resultRef} />}
      </div>
    </div>
  );
}

function DiagnosisResultCard({ result, resultRef }: { result: DiagnosisResult; resultRef: React.RefObject<HTMLDivElement | null> }) {
  if (result.status === "transient") {
    return (
      <div ref={resultRef} tabIndex={-1} className="focus:outline-none">
        <Notice tone="warning" title="Looks transient">
          <p className="flex gap-2">
            <Clock className="mt-1 size-3.5 shrink-0 text-warning" aria-hidden="true" />
            {result.message ??
              "No code-level root cause found — this looks like transient infrastructure flakiness (timeout, rate limit, or similar), not a bug in the workflow."}
          </p>
        </Notice>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div ref={resultRef} tabIndex={-1} className="focus:outline-none">
        <Notice tone="error" title="Diagnosis unavailable" role="alert">
          {result.message ?? "The diagnosis pipeline reported an error."}
        </Notice>
      </div>
    );
  }

  return (
    <motion.div
      ref={resultRef}
      tabIndex={-1}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded border border-border bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Diagnosis</h2>
        <span className="font-mono text-[11px] text-muted">not stored</span>
      </div>
      <div className="p-5 sm:p-7">
        <DiagnosisView d={result} />
      </div>
    </motion.div>
  );
}

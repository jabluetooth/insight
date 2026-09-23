"use client";

import { useEffect, useState } from "react";
import { Check, Plus, RotateCw } from "lucide-react";
import { Notice, Spinner, secondaryButtonClass } from "@/components/ui";
import type { InstallWorkflowResult, ListWorkflowsResult, RemoteWorkflow } from "@/lib/types";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; workflows: RemoteWorkflow[] };

/**
 * Auto-populated list of a connected instance's own n8n workflows, each
 * flagged monitored/not, with a one-click "Add workflow" to install Insight's
 * automatic error flagging on the ones that aren't yet (PRD §5, §6.6a). Used
 * both right after a fresh connect (ConnectInstanceForm) and on the instance
 * detail page, so it owns its own data fetching rather than taking a
 * server-fetched list as a prop.
 */
export function WorkflowList({ instanceId }: { instanceId: string }) {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  async function load() {
    setState({ phase: "loading" });
    try {
      const response = await fetch(`/api/instances/${instanceId}/workflows`);
      const json = (await response.json().catch(() => null)) as
        | ListWorkflowsResult
        | { error: true; message: string }
        | null;

      if (!response.ok || !json || "error" in json || json.status === "error") {
        const message =
          json && "message" in json ? json.message : `Could not load workflows (HTTP ${response.status}).`;
        setState({ phase: "error", message });
        return;
      }

      setState({ phase: "loaded", workflows: json.workflows });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Could not reach Insight.",
      });
    }
  }

  async function handleAddWorkflow(workflowId: string) {
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[workflowId];
      return next;
    });
    setInstallingId(workflowId);

    try {
      const response = await fetch(`/api/instances/${instanceId}/workflows/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });
      const json = (await response.json().catch(() => null)) as
        | InstallWorkflowResult
        | { error: true; message: string }
        | null;

      if (!response.ok || !json || "error" in json || json.status === "error") {
        const message =
          json && "message" in json ? json.message : `Adding this workflow failed (HTTP ${response.status}).`;
        setRowErrors((prev) => ({ ...prev, [workflowId]: message }));
        return;
      }

      setState((prev) =>
        prev.phase === "loaded"
          ? {
              phase: "loaded",
              workflows: prev.workflows.map((w) =>
                w.id === workflowId ? { ...w, monitored: true } : w
              ),
            }
          : prev
      );
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [workflowId]: err instanceof Error ? err.message : "Could not reach Insight.",
      }));
    } finally {
      setInstallingId(null);
    }
  }

  const heading = (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Workflows on this instance</h2>
      {state.phase === "loaded" && state.workflows.length > 0 && (
        <span className="font-mono text-xs text-muted">
          {state.workflows.filter((w) => w.monitored).length} / {state.workflows.length} monitored
        </span>
      )}
    </div>
  );

  if (state.phase === "loading") {
    return (
      <section className="mt-10">
        {heading}
        <p className="flex items-center gap-2 border-y border-border py-5 font-mono text-xs text-muted">
          <Spinner /> Scanning your instance for workflows…
        </p>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="mt-10 space-y-3">
        {heading}
        <Notice tone="error" title="Couldn't list workflows" role="alert">
          {state.message}
        </Notice>
        <button type="button" className={secondaryButtonClass} onClick={load}>
          <RotateCw className="size-3.5" aria-hidden="true" /> Try again
        </button>
      </section>
    );
  }

  if (state.workflows.length === 0) {
    return (
      <section className="mt-10">
        {heading}
        <p className="border-y border-border py-5 text-sm text-muted">Insight didn&apos;t find any workflows on this instance yet.</p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      {heading}
      {installingId !== null && (
        <p className="mb-3 font-mono text-xs text-muted" role="status">
          Adding a workflow. Other rows are disabled until this finishes.
        </p>
      )}
      <ul className="border-t border-border">
        {state.workflows.map((workflow) => (
          <li key={workflow.id} className="border-b border-border py-4">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div className="flex min-w-0 items-baseline gap-3">
                <span className="truncate font-medium">{workflow.name}</span>
                {!workflow.active && (
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">○ inactive</span>
                )}
              </div>
              {workflow.monitored ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.08em] text-success">
                  <Check className="size-3.5" aria-hidden="true" /> Monitored
                </span>
              ) : (
                <button
                  type="button"
                  className={secondaryButtonClass + " hover:border-accent hover:text-accent"}
                  disabled={installingId !== null}
                  onClick={() => handleAddWorkflow(workflow.id)}
                >
                  {installingId === workflow.id ? <Spinner /> : <Plus className="size-3.5" aria-hidden="true" />}
                  {installingId === workflow.id ? "Adding" : "Add workflow"}
                </button>
              )}
            </div>
            {rowErrors[workflow.id] && (
              <p className="mt-2 text-sm text-danger" role="alert">
                {rowErrors[workflow.id]}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

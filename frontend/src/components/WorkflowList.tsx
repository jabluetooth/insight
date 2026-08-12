"use client";

import { useEffect, useState } from "react";
import styles from "./WorkflowList.module.css";
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

  if (state.phase === "loading") {
    return (
      <div className={styles.wrap}>
        <p className={styles.heading}>Workflows on this instance</p>
        <p className={styles.loadingText}>Scanning your instance for workflows…</p>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className={styles.wrap}>
        <p className={styles.heading}>Workflows on this instance</p>
        <div className={styles.loadError} role="alert">
          <span>{state.message}</span>
        </div>
        <button type="button" className={styles.retryButton} onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (state.workflows.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.heading}>Workflows on this instance</p>
        <p className={styles.emptyText}>
          Insight didn&apos;t find any workflows on this instance yet.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.heading}>Workflows on this instance</p>
      <div className={styles.list}>
        {state.workflows.map((workflow) => (
          <div key={workflow.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowName}>{workflow.name}</span>
              {!workflow.active && <span className={`${styles.badge} ${styles.badgeInactive}`}>inactive</span>}
            </div>
            {workflow.monitored ? (
              <span className={styles.badgeMonitored}>✓ Monitored</span>
            ) : (
              <button
                type="button"
                className={styles.addButton}
                disabled={installingId !== null}
                onClick={() => handleAddWorkflow(workflow.id)}
              >
                {installingId === workflow.id ? "Adding…" : "+ Add workflow"}
              </button>
            )}
            {rowErrors[workflow.id] && (
              <p className={styles.rowError} role="alert">
                {rowErrors[workflow.id]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

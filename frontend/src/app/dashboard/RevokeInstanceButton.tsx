"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import type { ManageInstanceRevokeResult, RevokeInstanceRequestBody } from "@/lib/types";

export function RevokeInstanceButton({
  instanceId,
  label,
}: {
  instanceId: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setError(null);
    const confirmed = window.confirm(
      `Revoke "${label}"? Insight will stop polling it and its stored API key access is invalidated. This can't be undone from here.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const body: RevokeInstanceRequestBody = { instanceId };
        const response = await fetch("/api/instances/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await response.json().catch(() => null)) as
          | ManageInstanceRevokeResult
          | { error: true; message: string }
          | null;

        if (!response.ok || !json || "error" in json || json.status === "error") {
          const message =
            json && "message" in json ? json.message : `Revoke failed (HTTP ${response.status}).`;
          setError(message);
          return;
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reach Insight.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        className={styles.revokeButton}
        onClick={handleRevoke}
        disabled={isPending}
      >
        {isPending ? "Revoking…" : "Revoke"}
      </button>
      {error && (
        <p role="alert" className={styles.revokeErrorText}>
          {error}
        </p>
      )}
    </div>
  );
}

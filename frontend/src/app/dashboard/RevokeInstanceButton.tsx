"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { secondaryButtonClass } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleRevoke() {
    setError(null);

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
        className={secondaryButtonClass + " hover:border-danger/60 hover:text-danger"}
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
      >
        {isPending ? "Revoking…" : "Revoke"}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-xs text-danger">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={`Revoke "${label}"?`}
        body="Its stored API key access is invalidated immediately. This can't be undone from here."
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          setConfirmOpen(false);
          handleRevoke();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

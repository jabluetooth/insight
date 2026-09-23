"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native <dialog>-backed confirm modal, styled to match the app's design
 * system — replaces window.confirm() so a destructive action doesn't
 * break out into an unstyled browser dialog. <dialog> gives focus trapping,
 * Escape-to-close, and top-layer stacking for free; this component only adds
 * confirm/cancel intent tracking on top (see resultRef below), since the
 * native "close" event alone doesn't say *why* the dialog closed — Escape,
 * a backdrop click, and our own buttons all just fire the same event.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultRef = useRef<"confirm" | "cancel" | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      resultRef.current = null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function handleClose() {
      if (resultRef.current === "confirm") {
        onConfirm();
      } else {
        onCancel();
      }
      resultRef.current = null;
    }
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onConfirm, onCancel]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      resultRef.current = "cancel";
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded border border-border bg-surface p-0 text-foreground backdrop:bg-black/60"
      onClick={handleBackdropClick}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-body"
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-xl font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        <p id="confirm-dialog-body" className="mt-3 text-sm leading-relaxed text-muted">
          {body}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-border px-3.5 py-2 font-mono text-xs uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground"
            onClick={() => {
              resultRef.current = "cancel";
              dialogRef.current?.close();
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={"rounded px-3.5 py-2 font-mono text-xs font-medium uppercase tracking-[0.08em] transition-transform active:scale-95 " + (danger ? "bg-danger text-background" : "bg-accent text-accent-foreground")}
            onClick={() => {
              resultRef.current = "confirm";
              dialogRef.current?.close();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

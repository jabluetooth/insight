"use client";

import { useEffect, useRef } from "react";
import styles from "./ConfirmDialog.module.css";

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
 * Native <dialog>-backed confirm modal, styled to match the app's glass
 * design system — replaces window.confirm() so a destructive action doesn't
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
      className={styles.dialog}
      onClick={handleBackdropClick}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-body"
    >
      <div className={styles.content}>
        <h2 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        <p id="confirm-dialog-body" className={styles.body}>
          {body}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => {
              resultRef.current = "cancel";
              dialogRef.current?.close();
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.confirmButton} ${danger ? styles.confirmDanger : ""}`}
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

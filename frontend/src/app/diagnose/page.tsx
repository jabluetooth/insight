import type { Metadata } from "next";
import { DiagnoseForm } from "./DiagnoseForm";
import styles from "./diagnose.module.css";

export const metadata: Metadata = {
  title: "Diagnose a failure — Insight",
  description:
    "Paste a failed n8n execution or upload exported execution JSON to get an AI root-cause diagnosis.",
};

export default function DiagnosePage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1>Diagnose a failed execution</h1>
        <p>
          Provide an execution ID plus your own n8n instance details, or
          upload an exported execution JSON file — you only need one of the
          two. Nothing you enter here is stored: an API key you provide is
          held in memory for this one request only and is never logged or
          written to disk.
        </p>
      </header>
      <DiagnoseForm />
    </div>
  );
}

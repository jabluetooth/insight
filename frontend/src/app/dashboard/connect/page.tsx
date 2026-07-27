import type { Metadata } from "next";
import { ConnectInstanceForm } from "./ConnectInstanceForm";
import styles from "./connect.module.css";

export const metadata: Metadata = {
  title: "Connect an instance — Insight",
};

export default function ConnectInstancePage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1>Connect an n8n instance</h1>
        <p>
          Insight will use this API key only to call read-only execution
          endpoints on your instance (never write or delete endpoints). The
          key is encrypted at rest and never shown back to you after this
          step.
        </p>
      </header>
      <ConnectInstanceForm />
    </div>
  );
}

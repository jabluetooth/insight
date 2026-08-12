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
          Insight uses this API key to read execution data from your
          instance, and — only when you click <strong>+ Add workflow</strong>{" "}
          on a specific workflow — to create and activate its own
          error-workflow template on your instance and point that
          workflow&apos;s Error Workflow setting at it. Insight never touches
          that workflow&apos;s own nodes or connections, and never calls any
          other write or delete endpoint. The key is encrypted at rest and
          never shown back to you after this step.
        </p>
      </header>
      <ConnectInstanceForm />
    </div>
  );
}

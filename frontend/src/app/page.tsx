import Link from "next/link";
import styles from "./home.module.css";

export default function Home() {
  return (
    <div className={styles.hero}>
      <section className={styles.heroInner}>
        <p className={styles.eyebrow}>AI root-cause copilot for n8n</p>
        <h1>Stop reading raw execution JSON by hand.</h1>
        <p className={styles.lead}>
          Paste a failed n8n execution — your own instance and API key, or
          just an exported JSON file — and Insight tells you which node
          broke, why, and how confident it is, in seconds.
        </p>
        <div className={styles.actions}>
          <Link href="/diagnose" className={styles.primaryCta}>
            Diagnose a failure
          </Link>
        </div>
        <dl className={styles.factList}>
          <div>
            <dt>No account required</dt>
            <dd>
              Paste an execution ID plus your own instance details, or
              upload exported execution JSON — either way works standalone.
            </dd>
          </div>
          <div>
            <dt>A thin, honest frontend</dt>
            <dd>
              All diagnosis logic runs in an n8n workflow. This page only
              forwards your request there and renders whatever comes back.
            </dd>
          </div>
          <div>
            <dt>Calibrated, not overconfident</dt>
            <dd>
              Low-confidence diagnoses are shown visibly hedged, never
              presented with the same certainty as a high-confidence result.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

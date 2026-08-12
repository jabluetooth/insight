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
      <section className={styles.howItWorks} aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading" className={styles.howItWorksHeading}>
          How it works
        </h2>
        <p className={styles.howItWorksLead}>
          Two ways in: paste one failure with no setup, or connect an
          instance so Insight watches it going forward.
        </p>
        <ol className={styles.stepList}>
          <li className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <p className={styles.stepTitle}>Connect your instance</p>
            <p className={styles.stepBody}>
              Sign in, then give Insight your n8n instance&apos;s base URL
              and an API key. Nothing on your instance changes yet.
            </p>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <p className={styles.stepTitle}>See what&apos;s unprotected</p>
            <p className={styles.stepBody}>
              Insight scans the instance and lists every workflow on it,
              flagging which ones already have failure detection wired up
              and which don&apos;t.
            </p>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <p className={styles.stepTitle}>Click Add workflow</p>
            <p className={styles.stepBody}>
              Insight creates and activates its error-workflow template on
              your instance and points that workflow&apos;s Error Workflow
              setting at it — automatically. It never edits that
              workflow&apos;s own nodes or connections.
            </p>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNumber}>4</span>
            <p className={styles.stepTitle}>Get diagnosed, not just alerted</p>
            <p className={styles.stepBody}>
              The next time that workflow fails, Insight fetches the full
              execution, redacts secrets, and produces a plain-English
              root-cause diagnosis — pushed to Slack and logged on your
              dashboard.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}

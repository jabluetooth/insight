import Link from "next/link";
import { ArrowRightIcon, BugIcon } from "@phosphor-icons/react/ssr";
import { HeroReveal } from "./HeroReveal";
import { ScrollReveal } from "./ScrollReveal";
import styles from "./home.module.css";

export default function Home() {
  return (
    <div className={styles.hero}>
      <HeroReveal className={styles.heroContent}>
        <p className={styles.eyebrow} data-hero-in>
          <BugIcon size={14} weight="bold" aria-hidden="true" />
          AI root-cause copilot for n8n
        </p>
        <h1 data-hero-in>Stop reading raw execution JSON by hand.</h1>
        <p className={styles.lead} data-hero-in>
          Paste a failed n8n execution — your own instance and API key, or
          just an exported JSON file — and Insight tells you which node
          broke, why, and how confident it is, in seconds.
        </p>
        <div className={styles.actions} data-hero-in>
          <Link href="/diagnose" className={styles.primaryCta}>
            Diagnose a failure
            <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <dl className={styles.factPanel} data-hero-in>
          <div className={styles.factRow}>
            <dt className={styles.factTag}>No account required</dt>
            <dd className={styles.factBody}>
              Paste an execution ID plus your own instance details, or
              upload exported execution JSON — either way works standalone.
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factTag}>A thin, honest frontend</dt>
            <dd className={styles.factBody}>
              All diagnosis logic runs in an n8n workflow. This page only
              forwards your request there and renders whatever comes back.
            </dd>
          </div>
          <div className={styles.factRow}>
            <dt className={styles.factTag}>Calibrated, not overconfident</dt>
            <dd className={styles.factBody}>
              Low-confidence diagnoses are shown visibly hedged, never
              presented with the same certainty as a high-confidence result.
            </dd>
          </div>
        </dl>
      </HeroReveal>

      <section className={styles.howItWorks} aria-labelledby="how-it-works-heading">
        <ScrollReveal>
          <h2 id="how-it-works-heading" className={styles.howItWorksHeading} data-reveal-in>
            How it works
          </h2>
          <p className={styles.howItWorksLead} data-reveal-in>
            Two ways in: paste one failure with no setup, or connect an
            instance so Insight watches it going forward.
          </p>
          <ol className={styles.stepList}>
            <li className={styles.step} data-reveal-in>
              <span className={styles.stepMark} aria-hidden="true">
                01
              </span>
              <p className={styles.stepTitle}>Connect your instance</p>
              <p className={styles.stepBody}>
                Sign in, then give Insight your n8n instance&apos;s base URL
                and an API key. Nothing on your instance changes yet.
              </p>
            </li>
            <li className={styles.step} data-reveal-in>
              <span className={styles.stepMark} aria-hidden="true">
                02
              </span>
              <p className={styles.stepTitle}>See what&apos;s unprotected</p>
              <p className={styles.stepBody}>
                Insight scans the instance and lists every workflow on it,
                flagging which ones already have failure detection wired up
                and which don&apos;t.
              </p>
            </li>
            <li className={styles.step} data-reveal-in>
              <span className={styles.stepMark} aria-hidden="true">
                03
              </span>
              <p className={styles.stepTitle}>Click Add workflow</p>
              <p className={styles.stepBody}>
                Insight creates and activates its error-workflow template on
                your instance and points that workflow&apos;s Error Workflow
                setting at it — automatically. It never edits that
                workflow&apos;s own nodes or connections.
              </p>
            </li>
            <li className={styles.step} data-reveal-in>
              <span className={styles.stepMark} aria-hidden="true">
                04
              </span>
              <p className={styles.stepTitle}>Get diagnosed, not just alerted</p>
              <p className={styles.stepBody}>
                The next time that workflow fails, Insight fetches the full
                execution, redacts secrets, and produces a plain-English
                root-cause diagnosis — pushed to Slack and logged on your
                dashboard.
              </p>
            </li>
          </ol>
          <div className={styles.howItWorksActions} data-reveal-in>
            <Link href="/dashboard/connect" className={styles.secondaryCta}>
              Start monitoring your instance
              <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}

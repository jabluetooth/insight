import { getConfidenceTier } from "@/lib/types";
import styles from "./ConfidenceMeter.module.css";

// Shared presentational component (props in, JSX out, no fetching) so the
// confidence-tier visual is defined exactly once and used identically on
// the public /diagnose result card and the /dashboard/instances/[id]
// diagnosis log — see PRD §2.1 calibration requirement: a low-confidence
// result must always visibly read as hedged, everywhere it's shown.
export function ConfidenceMeter({
  confidence,
}: {
  confidence: number | null | undefined;
}) {
  const tier = getConfidenceTier(confidence);
  const percent = confidence != null ? Math.round(confidence * 100) : null;

  const tierClass = {
    high: styles.tierHigh,
    moderate: styles.tierModerate,
    low: styles.tierLow,
    unknown: styles.tierUnknown,
  }[tier];

  const fillClass = {
    high: styles.fillHigh,
    moderate: styles.fillModerate,
    low: styles.fillLow,
    unknown: styles.fillUnknown,
  }[tier];

  const tierLabel = {
    high: "High confidence",
    moderate: "Moderate confidence",
    low: "Low confidence",
    unknown: "Confidence unknown",
  }[tier];

  return (
    <div>
      <div className={styles.confidenceHeader}>
        <span className={`${styles.confidenceTierBadge} ${tierClass}`}>{tierLabel}</span>
        {percent != null && <span className={styles.confidencePercent}>{percent}%</span>}
      </div>
      {percent != null && (
        <div
          className={styles.confidenceMeterTrack}
          role="meter"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Diagnosis confidence: ${percent}%, ${tierLabel.toLowerCase()}`}
        >
          <div className={`${styles.confidenceMeterFill} ${fillClass}`} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

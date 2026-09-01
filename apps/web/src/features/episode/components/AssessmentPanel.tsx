import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { ProductionAssessment } from "@studio/shared";
import { formatElapsedSeconds } from "../../../lib/utils";

export function AssessmentPanel({
  assessment,
  buildDurationSeconds,
}: {
  assessment: ProductionAssessment;
  buildDurationSeconds?: number | null;
}) {
  const blockers = assessment.issues.filter((issue) => issue.severity === "blocker");
  const targetWords = assessment.metrics.calibrated_word_target_count || assessment.metrics.target_word_count;
  return (
    <section className={`assessment-panel ${assessment.rating}`}>
      <div className="assessment-score">
        <strong>{assessment.score}</strong>
        <span>Production score</span>
        {buildDurationSeconds && buildDurationSeconds > 0 ? (
          <div className="assessment-build-time-badge" title="Total video build duration">
            <strong>{formatElapsedSeconds(buildDurationSeconds)}</strong>
            <span>Build time</span>
          </div>
        ) : null}
      </div>
      <div className="assessment-summary">
        <div>
          <h2>
            {assessment.rating === "production_ready"
              ? "Production ready"
              : assessment.rating === "needs_work"
                ? "Needs review"
                : "Not ready"}
          </h2>
          <span>
            {assessment.metrics.narration_word_count} / {targetWords} calibrated words · {assessment.metrics.sequence_count} sequences ·{" "}
            {assessment.metrics.scene_count} shots · {Math.round((assessment.metrics.overlay_coverage_ratio ?? 0) * 100)}% overlays
          </span>
        </div>
        {blockers.length ? (
          <details>
            <summary>
              <WarningCircle size={16} />
              {blockers.length} blocker{blockers.length === 1 ? "" : "s"}
            </summary>
            <ul>
              {assessment.issues.map((issue) => (
                <li key={issue.code} className={issue.severity}>
                  <strong>{issue.message}</strong>
                  <span>{issue.next_action}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <span className="assessment-ready">
            <CheckCircle size={16} />
            Quality gates passed
          </span>
        )}
      </div>
    </section>
  );
}

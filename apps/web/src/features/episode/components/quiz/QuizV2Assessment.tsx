import type { QuizAssessment } from "@studio/shared";

export function QuizV2Assessment({ assessment }: { assessment: QuizAssessment }) {
  const blockers = assessment.issues.filter((issue) => issue.severity === "blocker");
  return (
    <div className={"quiz-v2-assessment " + assessment.rating}>
      <div className="quiz-v2-score">
        <strong>{assessment.score}</strong>
        <span>QA score</span>
      </div>
      <div>
        <strong>{assessment.rating.replaceAll("_", " ")}</strong>
        <span>{blockers.length ? blockers.length + " blocker" + (blockers.length === 1 ? "" : "s") : "No blockers"}</span>
      </div>
      {blockers.length ? (
        <ul>
          {blockers.slice(0, 3).map((issue) => (
            <li key={issue.code}>
              <strong>{issue.message}</strong>
              <span>{issue.next_action}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function QuizV2PendingAssessment() {
  return (
    <div className="quiz-v2-assessment pending" aria-label="Quiz QA score not assessed">
      <div className="quiz-v2-score">
        <strong>—</strong>
        <span>Quiz QA score</span>
      </div>
      <div>
        <strong>Not assessed</strong>
        <span>Available after Timeline and QA</span>
      </div>
    </div>
  );
}

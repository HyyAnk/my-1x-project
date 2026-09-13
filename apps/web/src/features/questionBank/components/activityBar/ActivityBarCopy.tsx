import type { QuestionBankJobState } from "../../types/questionBankUi.types";

export interface ActivityBarCopyProps {
  job: QuestionBankJobState;
  completed: number;
  target: number;
}

export function ActivityBarCopy({ job, completed, target }: ActivityBarCopyProps) {
  if (job.status === "running") {
    return (
      <div className="task-activity-copy">
        <strong>
          Question Bank AI Generator ({completed}/{target} questions)
        </strong>
        <span>
          Chunk {job.progress.currentChunk}/{job.progress.totalChunks} • Approved: {job.progress.approvedTotal || 0} • Rejected:{" "}
          {job.progress.rejectedTotal || 0}
        </span>
      </div>
    );
  }

  if (job.status === "completed") {
    const failedChunksCount = job.failedChunksCount ?? job.progress.failedChunksCount ?? 0;
    if (failedChunksCount > 0) {
      return (
        <div className="task-activity-copy">
          <strong style={{ color: "#f59e0b" }}>
            Batch Complete with Warnings: {completed} questions added ({failedChunksCount} chunk{failedChunksCount > 1 ? "s" : ""} failed)
          </strong>
          <span>{job.errorSummary || job.error || "Some chunks encountered errors during batch generation"}</span>
        </div>
      );
    }
    return (
      <div className="task-activity-copy">
        <strong>Batch Complete: {completed} questions added to Question Bank</strong>
        <span>Click to explore newly generated questions</span>
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="task-activity-copy">
        <strong>Question generation failed</strong>
        <span>{job.error || "An unexpected error occurred during generation"}</span>
      </div>
    );
  }

  return (
    <div className="task-activity-copy">
      <strong>Batch generation cancelled</strong>
      <span>Progress stopped at {completed} questions</span>
    </div>
  );
}

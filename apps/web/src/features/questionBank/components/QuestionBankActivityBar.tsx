import type { QuestionBankJobState } from "../types/questionBankUi.types";
import { useQuestionBankActivityBar } from "../hooks/useQuestionBankActivityBar";
import {
  ActivityBarActions,
  ActivityBarCopy,
  ActivityBarSignal,
  getBorderBottomColor,
} from "./activityBar";

export interface QuestionBankActivityBarProps {
  job?: QuestionBankJobState | null;
  onOpenQuestionBank?: () => void;
  onCancelJob?: () => Promise<void>;
  onDismiss?: () => void;
}

export function QuestionBankActivityBar(props: QuestionBankActivityBarProps) {
  const {
    currentJob,
    isVisible,
    isRunning,
    cancelling,
    elapsed,
    completed,
    target,
    progressPercent,
    handleBarClick,
    handleCancel,
    handleDismiss,
  } = useQuestionBankActivityBar(props);

  if (!isVisible || !currentJob) return null;

  return (
    <div
      className="task-activity-bar"
      style={{ borderBottomColor: getBorderBottomColor(currentJob.status) }}
      role="button"
      tabIndex={0}
      onClick={handleBarClick}
      title="Click to view Question Bank"
    >
      <ActivityBarSignal status={currentJob.status} />
      <ActivityBarCopy job={currentJob} completed={completed} target={target} />
      <span className="task-activity-time">{isRunning ? elapsed : ""}</span>

      {isRunning && (
        <div
          className="task-activity-track"
          role="progressbar"
          aria-label="Question generation progress"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%)" }} />
        </div>
      )}

      <ActivityBarActions
        isRunning={isRunning}
        progressPercent={progressPercent}
        cancelling={cancelling}
        onCancel={handleCancel}
        onDismiss={handleDismiss}
      />
    </div>
  );
}

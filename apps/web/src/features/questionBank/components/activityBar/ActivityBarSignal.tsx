import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import type { QuestionBankJobState } from "../../types/questionBankUi.types";

export interface ActivityBarSignalProps {
  status: QuestionBankJobState["status"];
}

export function ActivityBarSignal({ status }: ActivityBarSignalProps) {
  if (status === "running") {
    return (
      <div className="task-activity-signal" style={{ color: "#06b6d4" }}>
        <span className="live-pulse" style={{ background: "#06b6d4" }} />
        <span>AI BATCH</span>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="task-activity-signal" style={{ color: "#06b6d4" }}>
        <CheckCircle size={14} weight="fill" style={{ color: "var(--green, #22c55e)" }} />
        <span style={{ color: "var(--green, #22c55e)" }}>DONE</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="task-activity-signal" style={{ color: "#06b6d4" }}>
        <WarningCircle size={14} weight="fill" style={{ color: "var(--red, #ef4444)" }} />
        <span style={{ color: "var(--red, #ef4444)" }}>ERROR</span>
      </div>
    );
  }

  return (
    <div className="task-activity-signal" style={{ color: "#06b6d4" }}>
      <X size={14} weight="bold" />
      <span>CANCELLED</span>
    </div>
  );
}

import type React from "react";
import { X } from "@phosphor-icons/react";

export interface ActivityBarActionsProps {
  isRunning: boolean;
  progressPercent: number;
  cancelling: boolean;
  onCancel: (e: React.MouseEvent) => void;
  onDismiss: (e: React.MouseEvent) => void;
}

export function ActivityBarActions({
  isRunning,
  progressPercent,
  cancelling,
  onCancel,
  onDismiss,
}: ActivityBarActionsProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {isRunning ? (
        <>
          <span className="task-activity-percent">{progressPercent}%</span>
          <button
            type="button"
            className="qb-btn qb-btn-secondary qb-btn-sm"
            onClick={onCancel}
            disabled={cancelling}
            style={{ padding: "3px 8px", fontSize: "11px", height: "24px" }}
            title="Cancel generation"
          >
            {cancelling ? "..." : <X size={12} weight="bold" />}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="qb-btn qb-btn-secondary qb-btn-sm"
          onClick={onDismiss}
          style={{ padding: "3px 8px", fontSize: "11px", height: "24px" }}
          title="Dismiss notification"
        >
          <X size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}

import { FileText } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { formatDate, formatTaskElapsed } from "../../../lib/utils";
import type { ProductionItemSummary } from "../types";

export interface TaskDrawerExecutionInfoProps {
  task: Task;
  item: ProductionItemSummary | null;
  now: number;
}

export function TaskDrawerExecutionInfo({ task, item, now }: TaskDrawerExecutionInfoProps) {
  return (
    <>
      {/* Key-Value Information Grid */}
      <div className="task-drawer-section">
        <span className="section-label">Execution Info</span>
        <div className="task-info-grid">
          <div className="task-info-item">
            <span className="info-key">Channel</span>
            <strong className="info-val">{item?.channelName || task.channel_id}</strong>
          </div>
          <div className="task-info-item">
            <span className="info-key">Episode / Topic</span>
            <strong className="info-val">{item?.episodeTitle || task.episode_id || "Channel Level"}</strong>
          </div>
          {task.scene_number !== null && task.scene_number !== undefined && (
            <div className="task-info-item">
              <span className="info-key">Scene</span>
              <strong className="info-val">Scene #{task.scene_number}</strong>
            </div>
          )}
          <div className="task-info-item">
            <span className="info-key">Elapsed Duration</span>
            <strong className="info-val">{formatTaskElapsed(task, now)}</strong>
          </div>
          <div className="task-info-item">
            <span className="info-key">Created At</span>
            <span className="info-val">{formatDate(task.created_at)}</span>
          </div>
          {task.started_at && (
            <div className="task-info-item">
              <span className="info-key">Started At</span>
              <span className="info-val">{formatDate(task.started_at)}</span>
            </div>
          )}
          {task.completed_at && (
            <div className="task-info-item">
              <span className="info-key">Completed At</span>
              <span className="info-val">{formatDate(task.completed_at)}</span>
            </div>
          )}
          <div className="task-info-item">
            <span className="info-key">Task ID</span>
            <span className="info-val code-text">{task.task_id}</span>
          </div>
        </div>
      </div>

      {/* Output Files (if any) */}
      {task.output_files && task.output_files.length > 0 && (
        <div className="task-drawer-section">
          <span className="section-label">Generated Output Files ({task.output_files.length})</span>
          <ul className="task-output-list">
            {task.output_files.map((file, idx) => (
              <li key={idx} className="task-output-item">
                <FileText size={14} className="file-icon" />
                <span>{file}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

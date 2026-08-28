import { useState } from "react";
import { CheckCircle, CircleNotch, FloppyDisk, PencilSimple, Play, X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { isTaskActive } from "../../../lib/utils";
import { TaskProgressPanel } from "../../../components/TaskProgressPanel";
import { isReady, taskLabel, type ArtifactName } from "../types";

export function ArtifactPanel({
  title,
  taskType,
  active,
  complete,
  content,
  setContent,
  task,
  now,
  disabled,
  saving,
  defaultOpen,
  onGenerate,
  onSave,
}: {
  filename: ArtifactName;
  title: string;
  taskType: Task["task_type"];
  active: string;
  complete: string;
  content: string;
  setContent: (value: string) => void;
  task: Task | null;
  now: number;
  disabled: boolean;
  saving: boolean;
  defaultOpen: boolean;
  onGenerate: () => void;
  onSave: (content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const ready = isReady(content);
  const activeTask = Boolean(task && isTaskActive(task));

  return (
    <details className={`panel artifact-panel ${ready ? "is-ready" : ""}`} open={defaultOpen}>
      <summary>
        <div>
          <span className="artifact-status">{ready ? <CheckCircle size={16} weight="fill" /> : <span />}</span>
          <h2>{title}</h2>
        </div>
        <span>{ready ? "Ready" : "Pending"}</span>
      </summary>
      <div className="artifact-panel-body">
        <div className="artifact-actions">
          {editing ? (
            <>
              <button className="quiet-button compact" onClick={() => setEditing(false)}>
                <X size={14} />Cancel
              </button>
              <button
                className="primary-button compact"
                disabled={saving}
                onClick={() => {
                  onSave(content);
                  setEditing(false);
                }}
              >
                {saving ? <CircleNotch className="spin" size={14} /> : <FloppyDisk size={14} />}Save
              </button>
            </>
          ) : (
            <>
              <button className="quiet-button compact" disabled={!ready || activeTask} onClick={() => setEditing(true)}>
                <PencilSimple size={14} />Edit
              </button>
              <button className="primary-button compact" disabled={disabled || activeTask} onClick={onGenerate}>
                {activeTask ? <CircleNotch className="spin" size={14} /> : <Play size={14} />}
                {ready ? "Regenerate" : taskLabel(taskType)}
              </button>
            </>
          )}
        </div>
        {task ? <TaskProgressPanel task={task} title={title} activeLabel={active} completionLabel={complete} now={now} compact /> : null}
        {editing ? (
          <textarea
            className="markdown-editor artifact-editor"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            spellCheck={false}
          />
        ) : (
          <pre className="markdown-preview artifact-preview">{ready ? content : `${title} has not started.`}</pre>
        )}
      </div>
    </details>
  );
}

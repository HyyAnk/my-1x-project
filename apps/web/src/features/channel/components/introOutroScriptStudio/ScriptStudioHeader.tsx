import { DotsThree, Sparkle } from "@phosphor-icons/react";
import type { ScriptStudioActions, ScriptStudioState } from "../../hooks/introOutroScriptStudio.types";

export type ScriptStudioStep = "configure" | "matrix" | "review" | "upload";

type HeaderStudio = Pick<ScriptStudioState, "project" | "projects" | "busy"> &
  Pick<ScriptStudioActions, "selectProject" | "createProject" | "duplicateProject" | "renameProject" | "archiveProject">;

type Props = {
  studio: HeaderStudio;
  step: ScriptStudioStep;
  onStepChange: (step: ScriptStudioStep) => void;
  hasContent: boolean;
  activeJob: boolean;
  draftPending: boolean;
  onOpenBatchModal?: () => void;
};

export function ScriptStudioHeader({ studio, step, onStepChange, hasContent, activeJob, draftPending, onOpenBatchModal }: Props) {
  const projectActionDisabled = studio.busy !== null || draftPending;
  const stepLabels: Record<ScriptStudioStep, string> = {
    configure: "Create",
    matrix: "Batch Overview",
    review: "Prompts",
    upload: "Upload",
  };
  return (
    <div className="script-studio-header">
      <div className="script-project-picker">
        <select
          aria-label="Script project"
          value={studio.project?.project_id ?? ""}
          onChange={(event) => studio.selectProject(event.target.value)}
          disabled={!studio.projects.length || draftPending}
        >
          {!studio.projects.length ? <option value="">No projects</option> : null}
          {studio.projects.map((project) => (
            <option value={project.project_id} key={project.project_id}>
              {project.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="quiet-button"
          onClick={() => void studio.createProject().catch(() => undefined)}
          disabled={projectActionDisabled}
        >
          New
        </button>
        {onOpenBatchModal ? (
          <button
            type="button"
            className="quiet-button batch-header-btn"
            onClick={onOpenBatchModal}
            disabled={projectActionDisabled}
            title="Generate multiple script pairs concurrently"
          >
            <Sparkle size={14} weight="fill" />
            <span>Batch</span>
          </button>
        ) : null}
        {studio.project ? (
          <details className="script-project-menu">
            <summary
              className="icon-button"
              aria-label="Project actions"
              aria-disabled={projectActionDisabled}
              onClick={(event) => {
                if (projectActionDisabled) event.preventDefault();
              }}
            >
              <DotsThree size={18} weight="bold" />
            </summary>
            <div>
              <button type="button" onClick={() => void studio.duplicateProject().catch(() => undefined)} disabled={projectActionDisabled}>
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt("Project name", studio.project?.name ?? "");
                  if (name) void studio.renameProject(name).catch(() => undefined);
                }}
                disabled={projectActionDisabled}
              >
                Rename
              </button>
              <button type="button" onClick={() => void studio.archiveProject().catch(() => undefined)} disabled={projectActionDisabled}>
                Archive
              </button>
            </div>
          </details>
        ) : null}
      </div>

      <nav className="script-step-tabs" aria-label="Script workflow">
        {(["configure", "matrix", "review", "upload"] as const).map((item, index) => (
          <button
            type="button"
            className={step === item ? "active" : ""}
            aria-current={step === item ? "step" : undefined}
            onClick={() => onStepChange(item)}
            disabled={
              draftPending ||
              (item === "review" && !hasContent) ||
              (item === "upload" && !studio.project) ||
              (item === "matrix" && !studio.projects.length)
            }
            key={item}
          >
            <span>{index + 1}</span>
            {stepLabels[item]}
          </button>
        ))}
      </nav>
    </div>
  );
}

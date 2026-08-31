import { ArrowsInSimple, ArrowsOutSimple, CircleNotch, Copy, FilmSlate } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { isTaskActive, latestTask } from "../../../../lib/utils";

type ShotPlanHeaderProps = {
  scenesCount: number;
  globalPromptExpanded: boolean | null;
  setGlobalPromptExpanded: React.Dispatch<React.SetStateAction<boolean | null>>;
  onCopyAllVisualPrompts: () => Promise<void>;
  readiness: { visualBible: boolean };
  activeEpisodeTask: Task | null;
  episodeTasks: Task[];
  onCreateTask: (taskType: Task["task_type"], sceneNumber?: number) => Promise<void>;
};

export function ShotPlanHeader({
  scenesCount,
  globalPromptExpanded,
  setGlobalPromptExpanded,
  onCopyAllVisualPrompts,
  readiness,
  activeEpisodeTask,
  episodeTasks,
  onCreateTask,
}: ShotPlanHeaderProps) {
  const generateScenesTask = latestTask(episodeTasks, ["GENERATE_SCENES"]);
  const isGenerating = Boolean(generateScenesTask && isTaskActive(generateScenesTask));

  return (
    <div className="section-heading scene-heading" style={{ marginTop: "12px" }}>
      <div>
        <h2>Timeline & Shots ({scenesCount})</h2>
      </div>
      <div className="scene-heading-actions">
        {scenesCount > 0 ? (
          <>
            <button
              type="button"
              className="quiet-button"
              onClick={() => setGlobalPromptExpanded(globalPromptExpanded ? false : true)}
              title={globalPromptExpanded ? "Collapse all prompt boxes" : "Expand all prompt boxes"}
            >
              {globalPromptExpanded ? <ArrowsInSimple size={16} /> : <ArrowsOutSimple size={16} />}
              <span>{globalPromptExpanded ? "Collapse all prompts" : "Expand all prompts"}</span>
            </button>
            <button
              type="button"
              className="quiet-button"
              onClick={() => void onCopyAllVisualPrompts()}
              title="Copy all prompts in text format"
            >
              <Copy size={16} />
              <span>Copy all prompts</span>
            </button>
          </>
        ) : null}
        <button
          className="primary-button"
          disabled={!readiness.visualBible || Boolean(activeEpisodeTask)}
          onClick={() => void onCreateTask("GENERATE_SCENES")}
        >
          {isGenerating ? <CircleNotch className="spin" size={17} /> : <FilmSlate size={17} />}
          <span>{scenesCount ? "Regenerate shots" : "Generate shots"}</span>
        </button>
      </div>
    </div>
  );
}

import type { Task } from "@studio/shared";
import { isTaskActive, latestTask } from "../../../../lib/utils";
import { TaskProgressPanel } from "../../../../components/TaskProgressPanel";

type ShotPlanBatchProgressProps = {
  currentShotBatch: Task[];
  completedShotSequences: number;
  episodeTasks: Task[];
  episodeClock: number;
};

export function ShotPlanBatchProgress({
  currentShotBatch,
  completedShotSequences,
  episodeTasks,
  episodeClock,
}: ShotPlanBatchProgressProps) {
  if (currentShotBatch.length > 0) {
    return (
      <div
        className="batch-shot-progress"
        role="progressbar"
        aria-label="Shot sequence progress"
        aria-valuemin={0}
        aria-valuemax={currentShotBatch.length}
        aria-valuenow={completedShotSequences}
      >
        <div>
          <strong>
            {completedShotSequences} / {currentShotBatch.length} sequences
          </strong>
          <span>
            {currentShotBatch.some((task) => task.status === "FAILED")
              ? "Retry failed sequences from Tasks"
              : currentShotBatch.some(isTaskActive)
                ? "Generating in parallel"
                : "Sequence batch complete"}
          </span>
        </div>
        <div>
          <span style={{ transform: `scaleX(${completedShotSequences / currentShotBatch.length})` }} />
        </div>
      </div>
    );
  }

  const generateScenesTask = latestTask(episodeTasks, ["GENERATE_SCENES"]);
  if (generateScenesTask) {
    return (
      <TaskProgressPanel
        task={generateScenesTask}
        title="Shot generation"
        activeLabel="Building sequence-aware shots"
        completionLabel="Shot plan ready"
        now={episodeClock}
      />
    );
  }

  return null;
}

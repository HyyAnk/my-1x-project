import type { useStageStudio } from "../hooks/useStageStudio";
import { StagePlacementControls } from "./StagePlacementControls";
import { StageQuestionLayoutSelect } from "./StageQuestionLayoutSelect";
import { StageVisibilityControls } from "./StageVisibilityControls";

type StageTransformTabProps = {
  studio: ReturnType<typeof useStageStudio>;
};

export function StageTransformTab({ studio }: StageTransformTabProps) {
  return (
    <div className="stage-inspector-tab-content">
      <StageQuestionLayoutSelect studio={studio} />
      <StagePlacementControls studio={studio} />
      <StageVisibilityControls studio={studio} />
    </div>
  );
}

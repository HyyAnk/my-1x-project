import { useMemo } from "react";
import { QuizLayoutWireframe } from "../../quizLayouts";
import type { useStageStudio } from "../hooks/useStageStudio";
import { getStageQuestionLayoutDefinition, getStageQuestionLayouts } from "../questionLayouts";
import type { StageQuestionLayout } from "../types";

type StageQuestionLayoutSelectProps = {
  studio: ReturnType<typeof useStageStudio>;
};

export function StageQuestionLayoutSelect({ studio }: StageQuestionLayoutSelectProps) {
  const { t, questionLayoutId, setQuestionLayoutId, aspectRatio } = studio;
  const availableLayouts = useMemo(() => getStageQuestionLayouts(aspectRatio), [aspectRatio]);

  const isCurrentLayoutAvailable = availableLayouts.some((layout) => layout.id === questionLayoutId);
  const activeLayoutId = isCurrentLayoutAvailable ? questionLayoutId : (availableLayouts[0]?.id ?? questionLayoutId);
  const selectedLayout = getStageQuestionLayoutDefinition(activeLayoutId);

  return (
    <section className="inspector-section">
      <div className="inspector-section-header">
        <h3 className="inspector-section-title">{t("stageStudio.questionLayoutCardTitle")}</h3>
        <span className="inspector-compact-badge">{t("stageStudio.mascotLayoutBadge")}</span>
      </div>

      <label className="stage-layout-select-field">
        <span className="sr-only">{t("stageStudio.questionLayoutCardTitle")}</span>
        <select
          value={activeLayoutId}
          onChange={(event) => setQuestionLayoutId(event.target.value as StageQuestionLayout)}
          aria-describedby="stage-layout-description"
        >
          {availableLayouts.map((layout) => (
            <option key={layout.id} value={layout.id}>
              {t(layout.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <div id="stage-layout-description" className="stage-layout-summary" aria-live="polite">
        <QuizLayoutWireframe preview={selectedLayout.preview} layoutId={selectedLayout.id} aspectRatio={aspectRatio} />
        <span>{t(selectedLayout.descriptionKey)}</span>
      </div>
    </section>
  );
}

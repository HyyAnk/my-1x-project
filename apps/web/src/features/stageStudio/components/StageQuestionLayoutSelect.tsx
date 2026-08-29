import type { useStageStudio } from "../hooks/useStageStudio";
import { getStageQuestionLayoutDefinition, STAGE_QUESTION_LAYOUTS } from "../questionLayouts";
import type { StageQuestionLayout } from "../types";

type StageQuestionLayoutSelectProps = {
  studio: ReturnType<typeof useStageStudio>;
};

export function StageQuestionLayoutSelect({ studio }: StageQuestionLayoutSelectProps) {
  const { t, questionLayoutId, setQuestionLayoutId } = studio;
  const selectedLayout = getStageQuestionLayoutDefinition(questionLayoutId);

  return (
    <section className="inspector-section">
      <div className="inspector-section-header">
        <h3 className="inspector-section-title">{t("stageStudio.questionLayoutCardTitle")}</h3>
        <span className="inspector-compact-badge">{t("stageStudio.mascotLayoutBadge")}</span>
      </div>

      <label className="stage-layout-select-field">
        <span className="sr-only">{t("stageStudio.questionLayoutCardTitle")}</span>
        <select
          value={questionLayoutId}
          onChange={(event) => setQuestionLayoutId(event.target.value as StageQuestionLayout)}
          aria-describedby="stage-layout-description"
        >
          {STAGE_QUESTION_LAYOUTS.map((layout) => (
            <option key={layout.id} value={layout.id}>
              {t(layout.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <div id="stage-layout-description" className="stage-layout-summary" aria-live="polite">
        <div className={`stage-layout-miniature is-${selectedLayout.preview}`} aria-hidden="true">
          <i className="layout-mini-media" />
          <i className="layout-mini-choice choice-a" />
          <i className="layout-mini-choice choice-b" />
          <i className="layout-mini-choice choice-c" />
          <i className="layout-mini-mascot" />
        </div>
        <span>{t(selectedLayout.descriptionKey)}</span>
      </div>
    </section>
  );
}

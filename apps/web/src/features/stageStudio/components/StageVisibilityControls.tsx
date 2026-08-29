import type { useStageStudio } from "../hooks/useStageStudio";

type StageVisibilityControlsProps = {
  studio: ReturnType<typeof useStageStudio>;
};

export function StageVisibilityControls({ studio }: StageVisibilityControlsProps) {
  const { t, showInIntro, setShowInIntro, showInQuestion, setShowInQuestion, showInOutro, setShowInOutro } = studio;
  const rules = [
    { label: t("stageStudio.introPhaseRule"), checked: showInIntro, onChange: setShowInIntro },
    { label: t("stageStudio.questionPhaseRule"), checked: showInQuestion, onChange: setShowInQuestion },
    { label: t("stageStudio.outroPhaseRule"), checked: showInOutro, onChange: setShowInOutro },
  ];

  return (
    <section className="inspector-section">
      <div className="inspector-section-header">
        <h3 className="inspector-section-title">{t("stageStudio.phaseVisibilityTitle")}</h3>
      </div>
      <div className="stage-phase-rules compact">
        {rules.map((rule) => (
          <label key={rule.label} className="stage-rule-item">
            <input
              type="checkbox"
              checked={rule.checked}
              onChange={(event) => rule.onChange(event.target.checked)}
              className="stage-checkbox"
            />
            <span className="stage-rule-text">{rule.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

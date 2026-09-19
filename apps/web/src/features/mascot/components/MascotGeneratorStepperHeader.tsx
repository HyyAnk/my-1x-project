import type { MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta } from "../constants";

export interface MascotGeneratorStepperHeaderProps {
  generatorStep: number;
  onSelectStep: (step: 1 | 2 | 3 | 4) => void;
  hasMasterImage?: boolean;
  busyAction: string | null;
  overallProgress: number;
  generationElapsed: number;
  currentStageMessage: string;
  batchTotal?: number;
  batchState?: { total?: number } | null;
  editingMascot?: MascotProfile | null;
}

function getBannerTitle(busyAction: string, t: ReturnType<typeof useTranslation>["t"], batchTotal?: number): string {
  if (busyAction === "concept") return t("mascots.globalGenTitleConcept");
  if (busyAction === "batch-core") return t("mascots.globalGenTitleBatchCore");
  if (busyAction === "batch") return t("mascots.globalGenTitleBatchAll", { total: batchTotal || 2 });
  if (busyAction === "assign") return t("mascots.savingAndApplyingBtn") || "Saving & Applying...";
  if (busyAction === "matting-master" || busyAction.startsWith("matting-")) {
    return busyAction === "matting-all" ? t("mascots.globalGenTitleMattingAll", { total: 2 }) : t("mascots.globalGenTitleMatting");
  }
  return t("mascots.globalGenTitleSingle", {
    action: getLocalizedActionMeta(busyAction, t).label.split(" ")[0],
  });
}

export function MascotGeneratorStepperHeader({
  generatorStep,
  onSelectStep,
  hasMasterImage = false,
  busyAction,
  overallProgress,
  generationElapsed,
  currentStageMessage,
  batchTotal,
  batchState,
  editingMascot,
}: MascotGeneratorStepperHeaderProps) {
  const { t } = useTranslation();

  const isMasterReady =
    Boolean(hasMasterImage) ||
    Boolean(
      editingMascot?.master_image_url ||
      editingMascot?.master_raw_image_url ||
      editingMascot?.styles?.some((s) => (s.id === "core" || s.is_default) && s.anchor_image_url),
    );

  return (
    <>
      {/* Stepper Navigation Header */}
      <div className="wizard-stepper">
        <button
          type="button"
          className={`wizard-step-btn ${generatorStep === 1 ? "is-active" : generatorStep > 1 ? "is-done" : ""}`}
          onClick={() => onSelectStep(1)}
        >
          <span className="step-num">1</span>
          <span className="step-label">{t("mascots.generatorStep1")}</span>
        </button>
        <div className="wizard-step-line" />
        <button
          type="button"
          className={`wizard-step-btn ${generatorStep === 2 ? "is-active" : generatorStep > 2 ? "is-done" : ""}`}
          onClick={() => onSelectStep(2)}
          disabled={!isMasterReady}
        >
          <span className="step-num">2</span>
          <span className="step-label">{t("mascots.generatorStep2")}</span>
        </button>
        <div className="wizard-step-line" />
        <button
          type="button"
          className={`wizard-step-btn ${generatorStep === 3 ? "is-active" : generatorStep > 3 ? "is-done" : ""}`}
          onClick={() => onSelectStep(3)}
          disabled={!isMasterReady}
        >
          <span className="step-num">3</span>
          <span className="step-label">{t("mascots.generatorStep3")}</span>
        </button>
        <div className="wizard-step-line" />
        <button
          type="button"
          className={`wizard-step-btn ${generatorStep === 4 ? "is-active" : ""}`}
          onClick={() => onSelectStep(4)}
          disabled={!isMasterReady}
        >
          <span className="step-num">4</span>
          <span className="step-label">{t("mascots.generatorStep4")}</span>
        </button>
      </div>

      {/* Global Generator Progress & Animation Banner */}
      {busyAction !== null ? (
        <div
          className="mascot-gen-progress-banner"
          role="progressbar"
          aria-valuenow={overallProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="mascot-gen-banner-main">
            <div className="mascot-gen-banner-left">
              <div className="mascot-gen-banner-text">
                <div className="mascot-gen-banner-title-row">
                  <h4 className="mascot-gen-banner-title">{getBannerTitle(busyAction, t, batchTotal ?? batchState?.total)}</h4>
                  <span className="mascot-gen-badge-active">
                    <span className="mascot-gen-pulse-dot" />
                    {t("mascots.globalGenActiveBadge")}
                  </span>
                </div>
                <p className="mascot-gen-banner-sub">{currentStageMessage || t("mascots.globalGenReassurance")}</p>
              </div>
            </div>

            <div className="mascot-gen-banner-right">
              <span className="mascot-gen-timer-pill">{Math.floor(generationElapsed)}s</span>
              <span className="mascot-gen-percent-text">{overallProgress}%</span>
            </div>
          </div>

          <div className="mascot-gen-bar-track">
            <div className="mascot-gen-bar-fill" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      ) : null}
    </>
  );
}

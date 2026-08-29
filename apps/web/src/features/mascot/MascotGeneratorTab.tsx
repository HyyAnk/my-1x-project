import { lazy, Suspense } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { useTranslation } from "../../i18n";
import { getLocalizedActionMeta } from "./constants";
import { MascotConceptStep } from "./components/MascotConceptStep";
import { MascotActionsStep } from "./components/MascotActionsStep";
import { useMascotGenerator } from "./hooks/useMascotGenerator";

const MascotAnimationStep = lazy(() =>
  import("./components/MascotAnimationStep").then((module) => ({ default: module.MascotAnimationStep })),
);

type MascotGeneratorTabProps = {
  generatorState: ReturnType<typeof useMascotGenerator>;
};

export function MascotGeneratorTab({ generatorState }: MascotGeneratorTabProps) {
  const { t } = useTranslation();
  const {
    generatorStep,
    setGeneratorStep,
    editingMascot,
    genName,
    setGenName,
    genDescription,
    setGenDescription,
    genStyle,
    setGenStyle,
    genColor,
    setGenColor,
    genPrompt,
    setGenPrompt,
    actionPrompts,
    setActionPrompts,
    busyAction,
    generationElapsed,
    batchState,
    itemProgress,
    overallProgress,
    currentStageMessage,
    showNotesAccordion,
    setShowNotesAccordion,
    promptCopied,
    lightboxImage,
    setLightboxImage,
    isPromptModalOpen,
    setIsPromptModalOpen,
    dragOverAction,
    setDragOverAction,
    promptEditAction,
    setPromptEditAction,
    activePreviewAction,
    setActivePreviewAction,
    isPlaying,
    setIsPlaying,
    canvasBackground,
    setCanvasBackground,
    canvasZoom,
    setCanvasZoom,
    flipHorizontal,
    setFlipHorizontal,
    actionMotions,
    actionSpeeds,
    actionIntensities,
    calibrating,
    handleInjectTag,
    handleApplyTemplate,
    handleCopyPrompt,
    handleGenerateConcept,
    handleGenerateSprite,
    handleBatchGenerateSprites,
    handleBatchGenerateCoreSprites,
    handleUploadSprite,
    handleDropSprite,
    handleRemoveBackground,
    handleChangeMotionPreset,
    handleChangeMotionSpeed,
    handleChangeMotionIntensity,
    handleResetDefaultMotions,
    handleSaveMotion,
    handleFinishMascot,
  } = generatorState;

  return (
    <div className="mascot-generator-container">
      {/* Stepper Header */}
      <div className="wizard-stepper">
        <button
          type="button"
          className={`wizard-step-btn ${generatorStep === 1 ? "is-active" : generatorStep > 1 ? "is-done" : ""}`}
          onClick={() => setGeneratorStep(1)}
        >
          <span className="step-num">1</span>
          <span className="step-label">{t("mascots.generatorStep1")}</span>
        </button>
        <div className="wizard-step-line" />
        <button
          type="button"
          className={`wizard-step-btn ${generatorStep === 2 ? "is-active" : generatorStep > 2 ? "is-done" : ""}`}
          onClick={() => setGeneratorStep(2)}
          disabled={!editingMascot?.master_image_url}
        >
          <span className="step-num">2</span>
          <span className="step-label">{t("mascots.generatorStep2")}</span>
        </button>
        <div className="wizard-step-line" />
        <button
          type="button"
          className={`wizard-step-btn ${generatorStep === 3 ? "is-active" : ""}`}
          onClick={() => setGeneratorStep(3)}
          disabled={!editingMascot?.master_image_url}
        >
          <span className="step-num">3</span>
          <span className="step-label">{t("mascots.generatorStep3")}</span>
        </button>
      </div>

      {/* GLOBAL GENERATOR PROGRESS & ANIMATION BANNER */}
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
                  <h4 className="mascot-gen-banner-title">
                    {busyAction === "concept"
                      ? t("mascots.globalGenTitleConcept")
                      : busyAction === "batch-core"
                        ? t("mascots.globalGenTitleBatchCore")
                        : busyAction === "batch"
                          ? t("mascots.globalGenTitleBatchAll", { total: batchState?.total || 7 })
                          : busyAction === "assign"
                            ? t("mascots.savingAndApplyingBtn") || "Saving & Applying..."
                            : busyAction === "matting-master" || busyAction?.startsWith("matting-")
                              ? busyAction === "matting-all"
                                ? t("mascots.globalGenTitleMattingAll", { total: 7 })
                                : t("mascots.globalGenTitleMatting")
                              : t("mascots.globalGenTitleSingle", {
                                  action: getLocalizedActionMeta(busyAction, t).label.split(" ")[0],
                                })}
                  </h4>
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

      {/* STEP 1: IDENTITY & MASTER CONCEPT */}
      {generatorStep === 1 ? (
        <MascotConceptStep
          genName={genName}
          setGenName={setGenName}
          genDescription={genDescription}
          setGenDescription={setGenDescription}
          genStyle={genStyle}
          setGenStyle={setGenStyle}
          genColor={genColor}
          setGenColor={setGenColor}
          genPrompt={genPrompt}
          setGenPrompt={setGenPrompt}
          editingMascot={editingMascot}
          busyAction={busyAction}
          generationElapsed={generationElapsed}
          itemProgress={itemProgress}
          currentStageMessage={currentStageMessage}
          showNotesAccordion={showNotesAccordion}
          setShowNotesAccordion={setShowNotesAccordion}
          promptCopied={promptCopied}
          lightboxImage={lightboxImage}
          setLightboxImage={setLightboxImage}
          isPromptModalOpen={isPromptModalOpen}
          setIsPromptModalOpen={setIsPromptModalOpen}
          onInjectTag={handleInjectTag}
          onApplyTemplate={handleApplyTemplate}
          onCopyPrompt={handleCopyPrompt}
          onGenerateConcept={handleGenerateConcept}
          onRemoveBackground={handleRemoveBackground}
          onNextStep={() => setGeneratorStep(2)}
        />
      ) : null}

      {/* STEP 2: EXPRESSIVE STATES STUDIO */}
      {generatorStep === 2 ? (
        <MascotActionsStep
          editingMascot={editingMascot}
          genName={genName}
          genStyle={genStyle}
          genColor={genColor}
          busyAction={busyAction}
          generationElapsed={generationElapsed}
          batchState={batchState}
          itemProgress={itemProgress}
          overallProgress={overallProgress}
          currentStageMessage={currentStageMessage}
          dragOverAction={dragOverAction}
          setDragOverAction={setDragOverAction}
          promptEditAction={promptEditAction}
          setPromptEditAction={setPromptEditAction}
          actionPrompts={actionPrompts}
          setActionPrompts={setActionPrompts}
          onGenerateSprite={handleGenerateSprite}
          onBatchGenerateSprites={handleBatchGenerateSprites}
          onBatchGenerateCoreSprites={handleBatchGenerateCoreSprites}
          onUploadSprite={handleUploadSprite}
          onDropSprite={handleDropSprite}
          onRemoveBackground={handleRemoveBackground}
          onSelectPreviewAction={setActivePreviewAction}
          onBackStep={() => setGeneratorStep(1)}
          onNextStep={() => setGeneratorStep(3)}
          onOpenLightbox={setLightboxImage}
        />
      ) : null}

      {/* STEP 3: MOTION & ANIMATION STUDIO */}
      {generatorStep === 3 ? (
        <Suspense
          fallback={
            <div role="status" aria-live="polite" style={{ display: "grid", placeItems: "center", padding: "60px 0" }}>
              <CircleNotch size={32} className="spin" style={{ color: "var(--accent)" }} />
              <p style={{ marginTop: "12px", color: "var(--muted)" }}>{t("common.loading")}</p>
            </div>
          }
        >
          <MascotAnimationStep
            editingMascot={editingMascot}
            genColor={genColor}
            busyAction={busyAction}
            activePreviewAction={activePreviewAction}
            setActivePreviewAction={setActivePreviewAction}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            canvasBackground={canvasBackground}
            setCanvasBackground={setCanvasBackground}
            canvasZoom={canvasZoom}
            setCanvasZoom={setCanvasZoom}
            flipHorizontal={flipHorizontal}
            setFlipHorizontal={setFlipHorizontal}
            actionMotions={actionMotions}
            actionSpeeds={actionSpeeds}
            actionIntensities={actionIntensities}
            calibrating={calibrating}
            onChangeMotionPreset={handleChangeMotionPreset}
            onChangeMotionSpeed={handleChangeMotionSpeed}
            onChangeMotionIntensity={handleChangeMotionIntensity}
            onResetDefaultMotions={handleResetDefaultMotions}
            onSaveMotion={handleSaveMotion}
            onFinishMascot={handleFinishMascot}
            onBackStep={() => setGeneratorStep(2)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

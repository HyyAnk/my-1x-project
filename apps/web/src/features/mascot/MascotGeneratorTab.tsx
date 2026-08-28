import { Sparkle } from "@phosphor-icons/react";
import type { Channel, MascotActionType, MascotProfile } from "@studio/shared";
import { useTranslation } from "../../i18n";
import { getLocalizedActionMeta } from "./constants";
import { MascotConceptStep } from "./components/MascotConceptStep";
import { MascotActionsStep } from "./components/MascotActionsStep";
import { MascotCalibrationStep } from "./components/MascotCalibrationStep";
import { useMascotGenerator } from "./hooks/useMascotGenerator";

type MascotGeneratorTabProps = {
  channels: Channel[];
  mascots: MascotProfile[];
  generatorState: ReturnType<typeof useMascotGenerator>;
};

export function MascotGeneratorTab({
  channels,
  mascots,
  generatorState,
}: MascotGeneratorTabProps) {
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
    previewFps,
    setPreviewFps,
    isPlaying,
    setIsPlaying,
    currentFrameIndex,
    setCurrentFrameIndex,
    stagePreviewMode,
    setStagePreviewMode,
    targetPosition,
    setTargetPosition,
    targetScale,
    setTargetScale,
    assignedChannels,
    setAssignedChannels,
    isScenarioMode,
    setIsScenarioMode,
    scenarioPhase,
    scenarioCountdown,
    theaterMode,
    setTheaterMode,
    scrubberTime,
    reactionStyle,
    setReactionStyle,
    onionSkinEnabled,
    setOnionSkinEnabled,
    onionSkinOpacity,
    setOnionSkinOpacity,
    showGuides,
    setShowGuides,
    nudgeX,
    setNudgeX,
    nudgeY,
    setNudgeY,
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
    applyTimelineTime,
    handleSaveCalibration,
    handleApplyToChannels,
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
        <div className="mascot-gen-progress-banner" role="progressbar" aria-valuenow={overallProgress} aria-valuemin={0} aria-valuemax={100}>
          <div className="mascot-gen-banner-main">
            <div className="mascot-gen-banner-left">
              <div className="mascot-gen-icon-glow">
                <Sparkle size={18} weight="fill" />
              </div>
              <div className="mascot-gen-banner-text">
                <div className="mascot-gen-banner-title-row">
                  <h4 className="mascot-gen-banner-title">
                    {busyAction === "concept"
                      ? t("mascots.globalGenTitleConcept")
                      : busyAction === "batch-core"
                      ? t("mascots.globalGenTitleBatchCore")
                      : busyAction === "batch"
                      ? t("mascots.globalGenTitleBatchAll", { total: batchState?.total || 7 })
                      : busyAction === "matting-master" || busyAction.startsWith("matting-")
                      ? busyAction === "matting-all"
                        ? t("mascots.globalGenTitleMattingAll", { total: 7 })
                        : t("mascots.globalGenTitleMatting")
                      : t("mascots.globalGenTitleSingle", {
                          action: getLocalizedActionMeta(busyAction as MascotActionType, t).label.split(" ")[0],
                        })}
                  </h4>
                  <span className="mascot-gen-badge-active">
                    <span className="mascot-gen-pulse-dot" />
                    {t("mascots.globalGenActiveBadge")}
                  </span>
                </div>
                <p className="mascot-gen-banner-sub">
                  {currentStageMessage || t("mascots.globalGenReassurance")}
                </p>
              </div>
            </div>

            <div className="mascot-gen-banner-right">
              <span className="mascot-gen-timer-pill">
                ⏱ {Math.floor(generationElapsed)}s
              </span>
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

      {/* STEP 3: STAGE THEATER & CHANNEL DEPLOY */}
      {generatorStep === 3 ? (
        <MascotCalibrationStep
          editingMascot={editingMascot}
          mascots={mascots}
          channels={channels}
          genColor={genColor}
          busyAction={busyAction}
          batchState={batchState}
          itemProgress={itemProgress}
          activePreviewAction={activePreviewAction}
          setActivePreviewAction={setActivePreviewAction}
          previewFps={previewFps}
          setPreviewFps={setPreviewFps}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentFrameIndex={currentFrameIndex}
          setCurrentFrameIndex={setCurrentFrameIndex}
          stagePreviewMode={stagePreviewMode}
          setStagePreviewMode={setStagePreviewMode}
          targetPosition={targetPosition}
          setTargetPosition={setTargetPosition}
          targetScale={targetScale}
          setTargetScale={setTargetScale}
          assignedChannels={assignedChannels}
          setAssignedChannels={setAssignedChannels}
          isScenarioMode={isScenarioMode}
          setIsScenarioMode={setIsScenarioMode}
          scenarioPhase={scenarioPhase}
          scenarioCountdown={scenarioCountdown}
          theaterMode={theaterMode}
          setTheaterMode={setTheaterMode}
          scrubberTime={scrubberTime}
          reactionStyle={reactionStyle}
          setReactionStyle={setReactionStyle}
          onionSkinEnabled={onionSkinEnabled}
          setOnionSkinEnabled={setOnionSkinEnabled}
          onionSkinOpacity={onionSkinOpacity}
          setOnionSkinOpacity={setOnionSkinOpacity}
          showGuides={showGuides}
          setShowGuides={setShowGuides}
          nudgeX={nudgeX}
          setNudgeX={setNudgeX}
          nudgeY={nudgeY}
          setNudgeY={setNudgeY}
          calibrating={calibrating}
          onApplyTimelineTime={applyTimelineTime}
          onSaveCalibration={handleSaveCalibration}
          onApplyToChannels={handleApplyToChannels}
          onBackStep={() => setGeneratorStep(2)}
        />
      ) : null}
    </div>
  );
}

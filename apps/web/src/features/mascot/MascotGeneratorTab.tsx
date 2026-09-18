import { lazy, Suspense } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { useTranslation } from "../../i18n";
import { MascotConceptStep } from "./components/MascotConceptStep";
import { MascotActionsStep } from "./components/MascotActionsStep";
import { MascotAnimationProcessingStep } from "./components/MascotAnimationProcessingStep";
import { MascotGeneratorStepperHeader } from "./components/MascotGeneratorStepperHeader";
import { useMascotGenerator } from "./hooks/useMascotGenerator";
import { useMascotStyles } from "./hooks/useMascotStyles";
import type { Notice } from "../../components/types";

const MascotMotionAnimationStep = lazy(() =>
  import("./components/MascotMotionAnimationStep").then((module) => ({ default: module.MascotMotionAnimationStep })),
);

type MascotGeneratorTabProps = {
  generatorState: ReturnType<typeof useMascotGenerator>;
  onNotice?: (notice: Notice) => void;
};

export function MascotGeneratorTab({ generatorState, onNotice }: MascotGeneratorTabProps) {
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
    savingIdentity,
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
    effectiveMascot,
    activeStyle,
    previewStyleId,
    setPreviewStyleId,
    activeVariantIndex,
    setActiveVariantIndex,
    activeVariants,
    selectedVariant,
    actionMotions,
    actionSpeeds,
    actionIntensities,
    calibrating,
    handleInjectTag,
    handleApplyTemplate,
    handleCopyPrompt,
    handleGenerateConcept,
    handleSaveIdentity,
    handleRemoveBackground,
    handleChangeMotionPreset,
    handleChangeMotionSpeed,
    handleChangeMotionIntensity,
    handleResetDefaultMotions,
    handleSaveMotion,
    handleFinishMascot,
  } = generatorState;

  const mascotStylesState = useMascotStyles({
    mascot: editingMascot,
    onMascotUpdated: (updatedMascot) => {
      generatorState.setEditingMascot(updatedMascot);
    },
    onNotice: (notice) => {
      if (onNotice) {
        onNotice(notice);
      }
    },
  });

  return (
    <div className="mascot-generator-container">
      <MascotGeneratorStepperHeader
        generatorStep={generatorStep}
        onSelectStep={setGeneratorStep}
        hasMasterImage={Boolean(editingMascot?.master_image_url)}
        busyAction={busyAction}
        overallProgress={overallProgress}
        generationElapsed={generationElapsed}
        currentStageMessage={currentStageMessage}
        batchState={batchState}
      />

      {/* Step 1: Identity & Master Concept */}
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
          savingIdentity={savingIdentity}
          stylesState={mascotStylesState}
          onInjectTag={handleInjectTag}
          onApplyTemplate={handleApplyTemplate}
          onCopyPrompt={handleCopyPrompt}
          onGenerateConcept={handleGenerateConcept}
          onSaveIdentity={handleSaveIdentity}
          onRemoveBackground={handleRemoveBackground}
          onNextStep={() => setGeneratorStep(2)}
        />
      ) : null}

      {/* Step 2: Expressive States Studio */}
      {generatorStep === 2 ? (
        <MascotActionsStep
          editingMascot={editingMascot}
          stylesState={mascotStylesState}
          onBackStep={() => setGeneratorStep(1)}
          onNextStep={() => setGeneratorStep(3)}
          onOpenLightbox={setLightboxImage}
        />
      ) : null}

      {/* Step 3: Animation Processing Studio */}
      {generatorStep === 3 ? (
        <MascotAnimationProcessingStep
          editingMascot={editingMascot}
          stylesState={mascotStylesState}
          onBackStep={() => setGeneratorStep(2)}
          onNextStep={() => setGeneratorStep(4)}
          onNotice={onNotice}
        />
      ) : null}

      {/* Step 4: Motion & Animation Studio */}
      {generatorStep === 4 ? (
        <Suspense
          fallback={
            <div role="status" aria-live="polite" style={{ display: "grid", placeItems: "center", padding: "60px 0" }}>
              <CircleNotch size={32} className="spin" style={{ color: "var(--accent)" }} />
              <p style={{ marginTop: "12px", color: "var(--muted)" }}>{t("common.loading")}</p>
            </div>
          }
        >
          <MascotMotionAnimationStep
            effectiveMascot={effectiveMascot}
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
            onBackStep={() => setGeneratorStep(3)}
            activeStyle={activeStyle}
            previewStyleId={previewStyleId}
            onPreviewStyleChange={setPreviewStyleId}
            activeVariants={activeVariants}
            selectedVariant={selectedVariant}
            activeVariantIndex={activeVariantIndex}
            onSelectVariantIndex={setActiveVariantIndex}
            stylesState={mascotStylesState}
            onNotice={onNotice}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

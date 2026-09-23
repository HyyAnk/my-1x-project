import { ArrowLeft, ArrowRight, Sparkle } from "@phosphor-icons/react";
import type { MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";
import { useMascotStepStyles } from "../hooks/useMascotStepStyles";
import { MascotStyleTabBar } from "./MascotStyleTabBar";
import { MascotStyleHeader } from "./MascotStyleHeader";
import { MascotBatchProgressCard } from "./MascotBatchProgressCard";
import { MascotStateSlotsColumn } from "./MascotStateSlotsColumn";
import { SlotPromptModal } from "./SlotPromptModal";

export type MascotActionsStepProps = {
  editingMascot: MascotProfile | null;
  stylesState: ReturnType<typeof useMascotStyles>;
  onBackStep: () => void;
  onNextStep: () => void;
  onOpenLightbox?: (img: string) => void;
};

export function MascotActionsStep({ editingMascot, stylesState, onBackStep, onNextStep, onOpenLightbox }: MascotActionsStepProps) {
  const { t } = useTranslation();

  const {
    activeStyleId,
    setActiveStyleId,
    activeStyle,
    busySlotKey,
    queuedSlotKeys,
    handleGenerateSlot,
    handleBatchGenerateStyle,
    handleGenerateSelectedSlots,
    handleRegenerateSelectedSlots,
    batchProgress,
    handleStopBatchGeneration,
    editingSlot,
    handleOpenSlotPromptModal,
    handleCloseSlotPromptModal,
    handleSaveSlotPrompt,
  } = stylesState;

  const { allStyles, resolvedActiveStyle } = useMascotStepStyles(editingMascot, activeStyle, activeStyleId);

  // Completion calculation for active style
  const thinkingVariants = resolvedActiveStyle?.states?.thinking || [];
  const celebrateVariants = resolvedActiveStyle?.states?.celebrate || [];
  const thinkingFilledCount = thinkingVariants.filter((v) => Boolean(v.image_url)).length;
  const celebrateFilledCount = celebrateVariants.filter((v) => Boolean(v.image_url)).length;
  const totalFilledCount = thinkingFilledCount + celebrateFilledCount;
  const totalSlots = 20;

  const isCoreStyle = resolvedActiveStyle?.id === "core" || Boolean(resolvedActiveStyle?.is_default);
  const isBatchBusy = batchProgress !== null || busySlotKey === "batch";

  useBeforeUnloadWarning(isBatchBusy || busySlotKey !== null);

  return (
    <div className="wizard-step-content mascot-actions-step-container">
      <div className="wizard-card states-studio-card">
        {/* Step Header */}
        <div className="wizard-card-header-flex">
          <div>
            <span className="states-studio-badge">
              <Sparkle size={13} weight="fill" />
              <span>Step 2: Expressive States &amp; Multi-Style Studio</span>
            </span>
            <h3 className="states-studio-main-heading">Mascot Styles &amp; Expressive Poses</h3>
            <p className="states-studio-subheading">
              Manage wardrobe themes and generate up to 10 Thinking and 10 Celebrate pose variants per style.
            </p>
          </div>
        </div>

        {/* 1. Style Tabs & Management */}
        <MascotStyleTabBar
          allStyles={allStyles}
          activeStyleId={activeStyleId}
          resolvedActiveStyle={resolvedActiveStyle}
          editingMascot={editingMascot}
          isBatchBusy={isBatchBusy}
          busySlotKey={busySlotKey}
          onSelectStyle={setActiveStyleId}
          onManageStyles={onBackStep}
        />

        {/* 2. Active Style Banner & Controls */}
        <MascotStyleHeader
          resolvedActiveStyle={resolvedActiveStyle}
          editingMascot={editingMascot}
          stylesState={stylesState}
          totalFilledCount={totalFilledCount}
          totalSlots={totalSlots}
          isCoreStyle={isCoreStyle}
          isBatchBusy={isBatchBusy}
          busySlotKey={busySlotKey}
          onOpenLightbox={onOpenLightbox}
        />

        {/* 3. Live Batch Generation Progress Deck */}
        <MascotBatchProgressCard batchProgress={batchProgress} onStopBatch={handleStopBatchGeneration} />

        {/* 4. Two State Columns (10 Slots Each) */}
        <div className="variant-states-container">
          <MascotStateSlotsColumn
            state="thinking"
            variants={thinkingVariants}
            busySlotKey={busySlotKey}
            queuedSlotKeys={queuedSlotKeys}
            batchProgress={batchProgress}
            mascotName={editingMascot?.name}
            styleName={resolvedActiveStyle?.name}
            onBatchGenerate={handleBatchGenerateStyle}
            onGenerateSelected={handleGenerateSelectedSlots}
            onRegenerateSelected={handleRegenerateSelectedSlots}
            onGenerateSlot={handleGenerateSlot}
            onEditPrompt={handleOpenSlotPromptModal}
            onOpenLightbox={onOpenLightbox}
          />

          <MascotStateSlotsColumn
            state="celebrate"
            variants={celebrateVariants}
            busySlotKey={busySlotKey}
            queuedSlotKeys={queuedSlotKeys}
            batchProgress={batchProgress}
            mascotName={editingMascot?.name}
            styleName={resolvedActiveStyle?.name}
            onBatchGenerate={handleBatchGenerateStyle}
            onGenerateSelected={handleGenerateSelectedSlots}
            onRegenerateSelected={handleRegenerateSelectedSlots}
            onGenerateSlot={handleGenerateSlot}
            onEditPrompt={handleOpenSlotPromptModal}
            onOpenLightbox={onOpenLightbox}
          />
        </div>

        {/* Wizard Footer Navigation */}
        <div className="wizard-action-row" style={{ marginTop: "28px" }}>
          <button type="button" className="quiet-button" onClick={onBackStep}>
            <ArrowLeft size={15} />
            <span>{t("mascots.backIdentityBtn") || "Back to Identity"}</span>
          </button>
          <button type="button" className="primary-button" onClick={onNextStep}>
            <span>{t("mascots.nextAnimationBtn") || "Next: Motion Studio"}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <SlotPromptModal
        isOpen={Boolean(editingSlot)}
        state={editingSlot?.state || "thinking"}
        slotIndex={editingSlot?.slotIndex || 1}
        initialPrompt={editingSlot?.currentPrompt || ""}
        styleKeyword={resolvedActiveStyle?.keyword || ""}
        styleName={resolvedActiveStyle?.name || "Active Style"}
        onClose={handleCloseSlotPromptModal}
        onSave={handleSaveSlotPrompt}
      />
    </div>
  );
}

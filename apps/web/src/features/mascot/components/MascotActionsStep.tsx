import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import type { MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";
import { useMascotStepStyles } from "../hooks/useMascotStepStyles";
import { useMascotGreenScreenAudit } from "../hooks/useMascotGreenScreenAudit";
import { MascotStyleTabBar } from "./MascotStyleTabBar";
import { MascotStyleHeader } from "./MascotStyleHeader";
import { MascotBatchProgressCard } from "./MascotBatchProgressCard";
import { MascotStateSlotsColumn } from "./MascotStateSlotsColumn";
import { SlotPromptModal } from "./SlotPromptModal";
import { MascotGreenScreenAuditModal } from "./MascotGreenScreenAuditModal";
import { MascotStatesHeader } from "./MascotStatesHeader";

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

  const greenScreenAudit = useMascotGreenScreenAudit({
    mascotId: editingMascot?.id,
  });

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
        <MascotStatesHeader mascot={editingMascot} onAudit={greenScreenAudit.openAuditModal} />

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

      <MascotGreenScreenAuditModal
        isOpen={greenScreenAudit.isOpen}
        onClose={greenScreenAudit.closeAuditModal}
        mascotName={editingMascot?.name}
        auditResult={greenScreenAudit.activeResult}
        auditStatus={greenScreenAudit.auditStatus}
        isScanning={greenScreenAudit.isScanning}
        isRepairing={greenScreenAudit.isRepairing}
        error={greenScreenAudit.error}
        onScan={greenScreenAudit.runScan}
        onRepair={greenScreenAudit.runRepair}
        onOpenLightbox={onOpenLightbox}
      />
    </div>
  );
}

import { useCallback, useMemo } from "react";
import { CircleNotch, Lightning } from "@phosphor-icons/react";
import type { MascotStateVariant } from "@studio/shared";
import { useMascotBatchDownload } from "../hooks/useMascotBatchDownload";
import { useMascotSlotQueueSelection } from "../hooks/useMascotSlotQueueSelection";
import type { BatchProgressState, BatchSlotItem } from "../types/mascotBatch.types";
import { MascotSlotSelectionToolbar } from "./slot/MascotSlotSelectionToolbar";
import { VariantSlotCard } from "./VariantSlotCard";

const SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type MascotStateSlotsColumnProps = {
  state: "thinking" | "celebrate";
  variants: MascotStateVariant[];
  busySlotKey: string | null;
  queuedSlotKeys?: string[];
  batchProgress: BatchProgressState | null;
  mascotName?: string;
  styleName?: string;
  onBatchGenerate: (state: "thinking" | "celebrate") => void;
  onGenerateSelected?: (slots: BatchSlotItem[]) => Promise<boolean>;
  onRegenerateSelected?: (slots: BatchSlotItem[]) => Promise<boolean>;
  onGenerateSlot: (state: "thinking" | "celebrate", slotIndex: number, promptModifier?: string) => void;
  onEditPrompt: (state: "thinking" | "celebrate", slotIndex: number) => void;
  onOpenLightbox?: (img: string) => void;
};

export function MascotStateSlotsColumn({
  state,
  variants,
  busySlotKey,
  queuedSlotKeys = [],
  batchProgress,
  mascotName,
  styleName,
  onBatchGenerate,
  onGenerateSelected,
  onRegenerateSelected,
  onGenerateSlot,
  onEditPrompt,
  onOpenLightbox,
}: MascotStateSlotsColumnProps) {
  const title = state === "thinking" ? "Thinking" : "Celebrate";
  const subtitle =
    state === "thinking"
      ? "Pondering, chin resting, clue inspection, countdown poses."
      : "Joyful jump, triumphant arms raised, victory poses.";
  const headingId = `${state}-section-heading`;
  const variantBySlot = useMemo(() => new Map(variants.map((variant) => [variant.slot_index, variant])), [variants]);
  const filledCount = useMemo(() => variants.filter((variant) => Boolean(variant.image_url)).length, [variants]);
  const activeSlotKeys = useMemo(() => new Set(batchProgress?.activeSlotKeys ?? []), [batchProgress?.activeSlotKeys]);
  const queuedKeys = useMemo(() => new Set(queuedSlotKeys), [queuedSlotKeys]);

  const isSlotBusy = (slotIndex: number): boolean => {
    const slotKey = `${state}_${slotIndex}`;
    return busySlotKey === slotKey || activeSlotKeys.has(slotKey);
  };
  const isSlotQueued = (slotIndex: number): boolean => queuedKeys.has(`${state}_${slotIndex}`);
  const availableSlotIndices = SLOT_NUMBERS.filter((slotIndex) => {
    if (isSlotBusy(slotIndex) || isSlotQueued(slotIndex)) return false;
    const hasImage = Boolean(variantBySlot.get(slotIndex)?.image_url);
    return hasImage ? Boolean(onRegenerateSelected) : Boolean(onGenerateSelected);
  });
  const queueableEmptyCount = availableSlotIndices.filter((slotIndex) => !variantBySlot.get(slotIndex)?.image_url).length;
  const pendingSlotCount = SLOT_NUMBERS.filter((slotIndex) => isSlotBusy(slotIndex) || isSlotQueued(slotIndex)).length;
  const hasPendingEmptySlots = 10 - filledCount > queueableEmptyCount;

  const selection = useMascotSlotQueueSelection({
    state,
    variants,
    availableSlotIndices,
    onGenerateSelected,
    onRegenerateSelected,
  });

  const batchDownload = useMascotBatchDownload();

  const selectedVariants = useMemo(() => {
    return (selection.selectedSlotIndices ?? [])
      .map((slotIndex) => variantBySlot.get(slotIndex))
      .filter((variant): variant is MascotStateVariant => Boolean(variant?.image_url));
  }, [selection.selectedSlotIndices, variantBySlot]);

  const handleDownloadOriginalZip = useCallback(() => {
    void batchDownload.downloadSelectedZip("original", selectedVariants, state, {
      mascotName,
      styleName,
    });
  }, [batchDownload, mascotName, selectedVariants, state, styleName]);

  const handleDownloadTransparentZip = useCallback(() => {
    void batchDownload.downloadSelectedZip("transparent", selectedVariants, state, {
      mascotName,
      styleName,
    });
  }, [batchDownload, mascotName, selectedVariants, state, styleName]);

  const getSlotStatusText = (slotIndex: number): string => {
    const slotKey = `${state}_${slotIndex}`;
    const streamIndex = batchProgress?.activeSlotKeys.indexOf(slotKey) ?? -1;
    if (streamIndex >= 0) return `Stream ${streamIndex + 1} generating...`;
    return "Generating pose...";
  };

  return (
    <section className="variant-state-section" aria-labelledby={headingId}>
      <div className="variant-state-header">
        <div className="state-header-text">
          <div className="state-title-wrap">
            <h4 id={headingId}>{title}</h4>
            <span className="state-counter-pill">{filledCount}/10</span>
          </div>
          <p className="state-subtitle">{subtitle}</p>
        </div>

        {filledCount < 10 ? (
          <div className="state-header-actions">
            <button
              type="button"
              className={`quiet-button is-quick-batch ${pendingSlotCount > 0 ? "is-generating" : ""}`}
              onClick={() => onBatchGenerate(state)}
              disabled={queueableEmptyCount === 0 || Boolean(batchProgress?.isStopping)}
              title={`Queue all available empty ${title} slots`}
            >
              {pendingSlotCount > 0 && queueableEmptyCount === 0 ? (
                <>
                  <CircleNotch size={13} className="spin" />
                  <span>Queue Active</span>
                </>
              ) : (
                <>
                  <Lightning size={13} weight="bold" />
                  <span>
                    {hasPendingEmptySlots ? `Queue Remaining (${queueableEmptyCount})` : `Queue All Empty (${queueableEmptyCount})`}
                  </span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {availableSlotIndices.length > 0 || selection.selectedCount > 0 ? (
        <MascotSlotSelectionToolbar
          state={state}
          mode={selection.mode}
          selectedCount={selection.selectedCount}
          isAllSelected={selection.isAllSelected}
          isSubmitting={selection.isSubmitting}
          isDisabled={Boolean(batchProgress?.isStopping)}
          onSelectAll={selection.selectAllForMode}
          onDeselectAll={selection.deselectAll}
          onSubmitSelected={() => void selection.submitSelected()}
          totalSelectableCount={selection.totalSelectableCount}
          onDownloadOriginalZip={handleDownloadOriginalZip}
          onDownloadTransparentZip={handleDownloadTransparentZip}
          isDownloadingZip={batchDownload.isDownloading}
          downloadingZipKind={batchDownload.downloadingKind}
        />
      ) : null}

      <div className="variant-slots-grid">
        {SLOT_NUMBERS.map((slotIndex) => {
          const variant = variantBySlot.get(slotIndex);
          const isBusy = isSlotBusy(slotIndex);
          const isQueued = isSlotQueued(slotIndex);

          return (
            <VariantSlotCard
              key={`${state}-${slotIndex}`}
              state={state}
              slotIndex={slotIndex}
              variant={variant}
              isBusy={isBusy}
              isQueued={isQueued}
              isSelected={selection.isSelected(slotIndex)}
              isSelectable={selection.isSlotSelectable(slotIndex)}
              onToggleSelect={(index, checked) => selection.toggleSlot(index, checked)}
              statusText={getSlotStatusText(slotIndex)}
              onGenerate={(slot) => onGenerateSlot(state, slot)}
              onRegenerate={(slot) => onGenerateSlot(state, slot)}
              onEditPrompt={(slot) => onEditPrompt(state, slot)}
              onOpenLightbox={onOpenLightbox}
            />
          );
        })}
      </div>
    </section>
  );
}

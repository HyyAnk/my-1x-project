import { Lightning } from "@phosphor-icons/react";
import type { MascotStateVariant } from "@studio/shared";
import type { BatchProgressState } from "../hooks/useMascotBatchGeneration";
import { VariantSlotCard } from "./VariantSlotCard";

const SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type MascotStateSlotsColumnProps = {
  state: "thinking" | "celebrate";
  variants: MascotStateVariant[];
  isBatchBusy: boolean;
  busySlotKey: string | null;
  batchProgress: BatchProgressState | null;
  onBatchGenerate: (state: "thinking" | "celebrate") => void;
  onGenerateSlot: (state: "thinking" | "celebrate", slotIndex: number, promptModifier?: string) => void;
  onEditPrompt: (state: "thinking" | "celebrate", slotIndex: number) => void;
  onOpenLightbox?: (img: string) => void;
};

export function MascotStateSlotsColumn({
  state,
  variants,
  isBatchBusy,
  busySlotKey,
  batchProgress,
  onBatchGenerate,
  onGenerateSlot,
  onEditPrompt,
  onOpenLightbox,
}: MascotStateSlotsColumnProps) {
  const isThinking = state === "thinking";
  const title = isThinking ? "Thinking" : "Celebrate";
  const subtitle = isThinking
    ? "Pondering, chin resting, clue inspection, countdown poses."
    : "Joyful jump, triumphant arms raised, victory poses.";
  const headingId = `${state}-section-heading`;

  const filledCount = variants.filter((v) => Boolean(v.image_url)).length;
  const emptyCount = 10 - filledCount;

  const getSlotBusyState = (slotIndex: number) => {
    const slotKey = `${state}_${slotIndex}`;
    if (busySlotKey === slotKey) return true;
    if (batchProgress) {
      return batchProgress.activeSlotKeys.includes(slotKey);
    }
    if (busySlotKey === "batch") {
      const existing = variants.find((v) => v.slot_index === slotIndex);
      return !existing?.image_url;
    }
    return false;
  };

  const getSlotStatusText = (slotIndex: number) => {
    const slotKey = `${state}_${slotIndex}`;
    if (busySlotKey === slotKey) return "Generating pose...";
    if (batchProgress && batchProgress.activeSlotKeys.includes(slotKey)) {
      const streamIdx = batchProgress.activeSlotKeys.indexOf(slotKey) + 1;
      return `Stream ${streamIdx} generating...`;
    }
    return "Generating...";
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

        <div className="state-header-actions">
          <button
            type="button"
            className="quiet-button is-quick-batch"
            onClick={() => onBatchGenerate(state)}
            disabled={isBatchBusy || busySlotKey !== null || filledCount === 10}
            title={`Generate all empty ${title} slots`}
          >
            <Lightning size={13} weight="bold" />
            <span>
              Batch {title} ({emptyCount} empty)
            </span>
          </button>
        </div>
      </div>

      <div className="variant-slots-grid">
        {SLOT_NUMBERS.map((slotIndex) => {
          const variant = variants.find((v) => v.slot_index === slotIndex);
          const isBusy = getSlotBusyState(slotIndex);

          return (
            <VariantSlotCard
              key={`${state}-${slotIndex}`}
              state={state}
              slotIndex={slotIndex}
              variant={variant}
              isBusy={isBusy}
              statusText={getSlotStatusText(slotIndex)}
              onGenerate={(slot) => onGenerateSlot(state, slot)}
              onRegenerate={(slot) => onGenerateSlot(state, slot, undefined)}
              onEditPrompt={(slot) => onEditPrompt(state, slot)}
              onOpenLightbox={onOpenLightbox}
            />
          );
        })}
      </div>
    </section>
  );
}

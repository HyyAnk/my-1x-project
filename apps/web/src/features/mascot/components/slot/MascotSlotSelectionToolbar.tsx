import { ArrowCounterClockwise, CheckSquare, CircleNotch, Sparkle, Square } from "@phosphor-icons/react";
import type { MascotSlotSelectionMode } from "../../hooks/useMascotSlotQueueSelection";

export interface MascotSlotSelectionToolbarProps {
  state: "thinking" | "celebrate";
  mode: MascotSlotSelectionMode;
  selectedCount: number;
  isAllSelected: boolean;
  isSubmitting: boolean;
  isDisabled?: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSubmitSelected: () => void;
  totalSelectableCount: number;
}

export function MascotSlotSelectionToolbar({
  state,
  mode,
  selectedCount,
  isAllSelected,
  isSubmitting,
  isDisabled = false,
  onSelectAll,
  onDeselectAll,
  onSubmitSelected,
  totalSelectableCount,
}: MascotSlotSelectionToolbarProps) {
  const stateLabel = state === "thinking" ? "Thinking" : "Celebrate";
  const isGenerateMode = mode === "generate";
  const selectionLabel = isGenerateMode ? "empty" : "generated";
  const actionLabel = isGenerateMode ? "Generate Selected" : "Regenerate Selected";
  const actionDescription = isGenerateMode ? "generate" : "regenerate";

  return (
    <div className="slot-selection-toolbar" role="toolbar" aria-label={`${stateLabel} slot queue controls`}>
      <div className="slot-selection-toolbar-left">
        <button
          type="button"
          className="slot-selection-toggle-btn"
          onClick={isAllSelected ? onDeselectAll : onSelectAll}
          disabled={isDisabled || totalSelectableCount === 0}
          title={isAllSelected ? `Deselect all ${stateLabel} slots` : `Select all available ${selectionLabel} ${stateLabel} slots`}
          aria-label={isAllSelected ? `Deselect all ${stateLabel} slots` : `Select all available ${selectionLabel} ${stateLabel} slots`}
        >
          {isAllSelected ? (
            <CheckSquare size={14} weight="fill" className="slot-check-icon is-checked" />
          ) : (
            <Square size={14} className="slot-check-icon" />
          )}
          <span>{isAllSelected ? "Deselect All" : isGenerateMode ? "Select Empty" : "Select Generated"}</span>
        </button>

        {selectedCount > 0 ? <span className="slot-selection-count-badge">{selectedCount} selected</span> : null}
      </div>

      <div className="slot-selection-toolbar-right">
        <button
          type="button"
          className={`slot-action-btn is-queue-selected ${isSubmitting ? "is-generating" : ""}`}
          onClick={onSubmitSelected}
          disabled={selectedCount === 0 || isSubmitting || isDisabled}
          title={
            selectedCount === 0
              ? `Select at least one ${stateLabel.toLowerCase()} slot to ${actionDescription}`
              : `${actionLabel} ${selectedCount} ${stateLabel.toLowerCase()} slot${selectedCount > 1 ? "s" : ""}`
          }
          aria-label={`${actionLabel} ${selectedCount} ${stateLabel.toLowerCase()} slot${selectedCount === 1 ? "" : "s"}`}
        >
          {isSubmitting ? (
            <>
              <CircleNotch size={13} className="spin" />
              <span>Queueing</span>
            </>
          ) : (
            <>
              {isGenerateMode ? <Sparkle size={13} weight="fill" /> : <ArrowCounterClockwise size={13} weight="bold" />}
              <span>
                {actionLabel} ({selectedCount})
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

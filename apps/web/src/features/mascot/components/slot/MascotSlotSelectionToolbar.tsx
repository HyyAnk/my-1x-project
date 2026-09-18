import { CheckSquare, Square, ArrowCounterClockwise, CircleNotch } from "@phosphor-icons/react";

export interface MascotSlotSelectionToolbarProps {
  state: "thinking" | "celebrate";
  selectedCount: number;
  isAllSelected: boolean;
  isBatchBusy: boolean;
  isRegeneratingSelected?: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRegenerateSelected: () => void;
  totalSelectableCount: number;
}

export function MascotSlotSelectionToolbar({
  state,
  selectedCount,
  isAllSelected,
  isBatchBusy,
  isRegeneratingSelected = false,
  onSelectAll,
  onDeselectAll,
  onRegenerateSelected,
  totalSelectableCount,
}: MascotSlotSelectionToolbarProps) {
  const stateLabel = state === "thinking" ? "Thinking" : "Celebrate";

  return (
    <div className="slot-selection-toolbar" role="toolbar" aria-label={`${stateLabel} variant selection toolbar`}>
      <div className="slot-selection-toolbar-left">
        <button
          type="button"
          className="slot-selection-toggle-btn"
          onClick={isAllSelected ? onDeselectAll : onSelectAll}
          disabled={isBatchBusy || totalSelectableCount === 0}
          title={isAllSelected ? `Deselect all ${stateLabel} slots` : `Select all filled ${stateLabel} slots`}
          aria-label={isAllSelected ? `Deselect all ${stateLabel} slots` : `Select all filled ${stateLabel} slots`}
        >
          {isAllSelected ? (
            <CheckSquare size={14} weight="fill" className="slot-check-icon is-checked" />
          ) : (
            <Square size={14} className="slot-check-icon" />
          )}
          <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
        </button>

        {selectedCount > 0 ? (
          <span className="slot-selection-count-badge">{selectedCount} selected</span>
        ) : (
          <span className="slot-selection-hint">Select variants to batch regenerate</span>
        )}
      </div>

      <div className="slot-selection-toolbar-right">
        <button
          type="button"
          className={`slot-action-btn is-regen-selected ${isRegeneratingSelected ? "is-generating" : ""}`}
          onClick={onRegenerateSelected}
          disabled={selectedCount === 0 || isBatchBusy}
          title={
            selectedCount === 0
              ? `Select at least one ${stateLabel.toLowerCase()} slot to regenerate`
              : `Regenerate ${selectedCount} selected ${stateLabel.toLowerCase()} slot${selectedCount > 1 ? "s" : ""}`
          }
          aria-label={`Regenerate ${selectedCount} selected ${stateLabel.toLowerCase()} slots`}
        >
          {isRegeneratingSelected ? (
            <>
              <CircleNotch size={13} className="spin" />
              <span>Regenerating...</span>
            </>
          ) : (
            <>
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Regenerate Selected ({selectedCount})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import { ArrowCounterClockwise, CheckSquare, CircleNotch, DownloadSimple, Sparkle, Square } from "@phosphor-icons/react";
import type { MascotSlotSelectionMode } from "../../hooks/useMascotSlotQueueSelection";
import type { MascotDownloadKind } from "../../utils/mascotSlotDownloadHelpers";

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
  onDownloadOriginalZip?: () => void;
  onDownloadTransparentZip?: () => void;
  isDownloadingZip?: boolean;
  downloadingZipKind?: MascotDownloadKind | null;
}

interface ZipDownloadButtonProps {
  stateLabel: string;
  selectedCount: number;
  kind: MascotDownloadKind;
  isDownloading: boolean;
  isDisabled: boolean;
  onDownload: () => void;
}

function ZipDownloadButton({ stateLabel, selectedCount, kind, isDownloading, isDisabled, onDownload }: ZipDownloadButtonProps) {
  const isOriginal = kind === "original";
  const titleKind = isOriginal ? "Original PNGs" : "Transparent PNGs";
  const label = isOriginal ? "Original Zip" : "Transparent Zip";

  return (
    <button
      type="button"
      className={`slot-action-btn is-download-zip ${isDownloading ? "is-downloading" : ""}`}
      onClick={onDownload}
      disabled={isDisabled}
      title={
        selectedCount === 0
          ? `Select at least one ${stateLabel.toLowerCase()} slot to download ${titleKind} (ZIP)`
          : `Download ${titleKind} as ZIP for ${selectedCount} selected ${stateLabel.toLowerCase()} slot${selectedCount > 1 ? "s" : ""}`
      }
      aria-label={`Download ${titleKind} as ZIP for ${selectedCount} selected ${stateLabel.toLowerCase()} slot${selectedCount === 1 ? "" : "s"}`}
    >
      {isDownloading ? (
        <>
          <CircleNotch size={13} className="spin" />
          <span>Zipping...</span>
        </>
      ) : (
        <>
          <DownloadSimple size={13} weight="bold" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

interface QueueActionButtonProps {
  isGenerateMode: boolean;
  actionLabel: string;
  actionDescription: string;
  stateLabel: string;
  selectedCount: number;
  isSubmitting: boolean;
  isDisabled: boolean;
  onSubmit: () => void;
}

function QueueActionButton({
  isGenerateMode,
  actionLabel,
  actionDescription,
  stateLabel,
  selectedCount,
  isSubmitting,
  isDisabled,
  onSubmit,
}: QueueActionButtonProps) {
  return (
    <button
      type="button"
      className={`slot-action-btn is-queue-selected ${isSubmitting ? "is-generating" : ""}`}
      onClick={onSubmit}
      disabled={isDisabled}
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
  );
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
  onDownloadOriginalZip,
  onDownloadTransparentZip,
  isDownloadingZip = false,
  downloadingZipKind = null,
}: MascotSlotSelectionToolbarProps) {
  const stateLabel = state === "thinking" ? "Thinking" : "Celebrate";
  const isGenerateMode = mode === "generate";
  const selectionLabel = isGenerateMode ? "empty" : "generated";
  const actionLabel = isGenerateMode ? "Generate Selected" : "Regenerate Selected";
  const actionDescription = isGenerateMode ? "generate" : "regenerate";
  const isActionDisabled = selectedCount === 0 || isSubmitting || isDisabled || isDownloadingZip;

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
        <QueueActionButton
          isGenerateMode={isGenerateMode}
          actionLabel={actionLabel}
          actionDescription={actionDescription}
          stateLabel={stateLabel}
          selectedCount={selectedCount}
          isSubmitting={isSubmitting}
          isDisabled={isActionDisabled}
          onSubmit={onSubmitSelected}
        />

        {!isGenerateMode && onDownloadOriginalZip ? (
          <ZipDownloadButton
            stateLabel={stateLabel}
            selectedCount={selectedCount}
            kind="original"
            isDownloading={downloadingZipKind === "original"}
            isDisabled={isActionDisabled}
            onDownload={onDownloadOriginalZip}
          />
        ) : null}

        {!isGenerateMode && onDownloadTransparentZip ? (
          <ZipDownloadButton
            stateLabel={stateLabel}
            selectedCount={selectedCount}
            kind="transparent"
            isDownloading={downloadingZipKind === "transparent"}
            isDisabled={isActionDisabled}
            onDownload={onDownloadTransparentZip}
          />
        ) : null}
      </div>
    </div>
  );
}

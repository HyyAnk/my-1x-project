import { FloppyDisk } from "@phosphor-icons/react";

export interface SegmentSaveButtonProps {
  segmentIndex: number;
  isSaving: boolean;
  onSave: () => void;
}

export function SegmentSaveButton({ segmentIndex, isSaving, onSave }: SegmentSaveButtonProps) {
  return (
    <div className="short-reel-form-actions">
      <button
        type="button"
        className="short-reel-primary-btn"
        disabled={isSaving}
        onClick={onSave}
        aria-label={`Save Segment ${segmentIndex}`}
      >
        {isSaving ? (
          <>
            <span className="short-reel-spinner" aria-hidden="true" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <FloppyDisk size={16} weight="bold" />
            <span>Save Segment {segmentIndex}</span>
          </>
        )}
      </button>
    </div>
  );
}

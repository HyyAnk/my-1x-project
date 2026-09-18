import { UploadSimple, ArrowCounterClockwise, ArrowsClockwise } from "@phosphor-icons/react";

export interface SlotCardActionsProps {
  isReady: boolean;
  isFailed: boolean;
  isProcessing: boolean;
  onRetry: () => void;
  onTriggerUpload: () => void;
  onTriggerReplace: () => void;
}

export function SlotCardActions({ isReady, isFailed, isProcessing, onRetry, onTriggerUpload, onTriggerReplace }: SlotCardActionsProps) {
  return (
    <div className="anim-slot-actions">
      {isReady ? (
        <button
          type="button"
          className="anim-action-btn is-replace"
          onClick={onTriggerReplace}
          disabled={isProcessing}
          title="Upload a new video to replace this animation"
        >
          <ArrowsClockwise size={13} weight="bold" />
          <span>Replace Video</span>
        </button>
      ) : isFailed ? (
        <div className="anim-failed-actions-row">
          <button
            type="button"
            className="anim-action-btn is-retry"
            onClick={onRetry}
            disabled={isProcessing}
            title="Retry processing on existing video"
          >
            <ArrowCounterClockwise size={13} weight="bold" />
            <span>Retry</span>
          </button>
          <button
            type="button"
            className="anim-action-btn is-reupload"
            onClick={onTriggerUpload}
            disabled={isProcessing}
            title="Upload a replacement video"
          >
            <UploadSimple size={13} weight="bold" />
            <span>Upload New</span>
          </button>
        </div>
      ) : isProcessing ? (
        <div className="anim-processing-indicator">
          <span>Working...</span>
        </div>
      ) : (
        <button type="button" className="anim-action-btn is-upload" onClick={onTriggerUpload} title="Select video file for this slot">
          <UploadSimple size={13} weight="bold" />
          <span>Select Video</span>
        </button>
      )}
    </div>
  );
}

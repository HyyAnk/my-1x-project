import type { AnimationProcessingSlotCardProps } from "./slotCard";
import { SlotReplacementWarning } from "./slotCard/SlotReplacementWarning";
import {
  useSlotCardDropZone,
  SlotCardHeader,
  SlotCardFileInputs,
  SlotCardProgress,
  SlotCardMediaPreview,
  SlotCardActions,
  SlotCardEmptyPrompt,
  SlotCardFailedBox,
} from "./slotCard";

export type { AnimationProcessingSlotCardProps };

export function AnimationProcessingSlotCard({
  mascotId,
  styleId,
  state,
  slotIndex,
  projection,
  activeJob,
  sourceImageUrl,
  isBusy = false,
  onUploadVideo,
  onRetry,
  onReplaceVideo,
  onCancelJob,
}: AnimationProcessingSlotCardProps) {
  const status = projection?.status || "empty";
  const attempt = projection?.active_attempt ?? 0;
  const isReady = status === "ready";
  const isFailed = status === "failed" || status === "qa_failed" || status === "cancelled";
  const isQueued = status === "queued" || activeJob?.status === "queued";
  const isProcessing =
    isBusy || isQueued || status === "uploading" || status === "processing" || status === "retrying" || status === "replacing";

  const {
    isDragOver,
    fileInputRef,
    replaceInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleReplaceInputChange,
    triggerUpload,
    triggerReplace,
  } = useSlotCardDropZone({ isProcessing, isReady, onUploadVideo, onReplaceVideo });

  return (
    <div
      className={`anim-slot-card status-${status} ${isDragOver ? "is-drag-over" : ""} ${isProcessing ? "is-processing" : ""}`}
      data-slot-index={slotIndex}
      data-slot-state={state}
      data-slot-status={status}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SlotCardFileInputs
        state={state}
        slotIndex={slotIndex}
        fileInputRef={fileInputRef}
        replaceInputRef={replaceInputRef}
        onFileInputChange={handleFileInputChange}
        onReplaceInputChange={handleReplaceInputChange}
      />

      <SlotCardHeader
        slotIndex={slotIndex}
        attempt={attempt}
        status={status}
        isReady={isReady && !isProcessing}
        isQueued={isQueued}
        isProcessing={isProcessing}
        isFailed={isFailed}
        errorMessage={projection?.error_message}
      />

      <div className="anim-slot-canvas-wrap">
        {isReady && !isProcessing ? (
          <SlotCardMediaPreview
            mascotId={mascotId}
            styleId={styleId}
            state={state}
            slotIndex={slotIndex}
            projection={projection}
            sourceImageUrl={sourceImageUrl}
          />
        ) : isProcessing ? (
          <SlotCardProgress
            status={status}
            isQueued={isQueued}
            jobProgress={activeJob?.progress}
            activeJobId={projection?.active_job_id}
            onCancelJob={onCancelJob}
          />
        ) : isFailed ? (
          <SlotCardFailedBox errorCode={projection?.error_code} errorMessage={projection?.error_message} />
        ) : (
          <SlotCardEmptyPrompt sourceImageUrl={sourceImageUrl} onTriggerUpload={triggerUpload} />
        )}
      </div>

      {isReady && !isProcessing ? <SlotReplacementWarning errorMessage={projection?.error_message} /> : null}

      <SlotCardActions
        isReady={isReady}
        isFailed={isFailed}
        isProcessing={isProcessing}
        onRetry={onRetry}
        onTriggerUpload={triggerUpload}
        onTriggerReplace={triggerReplace}
      />
    </div>
  );
}

export default AnimationProcessingSlotCard;

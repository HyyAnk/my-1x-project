import { UploadSimple } from "@phosphor-icons/react";

export interface SlotCardEmptyPromptProps {
  sourceImageUrl?: string | null;
  onTriggerUpload: () => void;
}

export function SlotCardEmptyPrompt({ sourceImageUrl, onTriggerUpload }: SlotCardEmptyPromptProps) {
  return (
    <div
      className="anim-slot-empty-box"
      onClick={onTriggerUpload}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTriggerUpload();
        }
      }}
    >
      {sourceImageUrl ? (
        <div className="anim-empty-source-bg">
          <img src={sourceImageUrl} alt="Step 2 Pose" className="anim-empty-source-img" />
          <div className="anim-empty-overlay">
            <UploadSimple size={22} weight="bold" />
            <span className="anim-empty-label">Drop video or click</span>
          </div>
        </div>
      ) : (
        <div className="anim-empty-prompt">
          <UploadSimple size={24} weight="bold" />
          <span className="anim-empty-label">Upload Video</span>
          <span className="anim-empty-hint">16:9 • 4–10s • MP4/MOV/WebM</span>
        </div>
      )}
    </div>
  );
}

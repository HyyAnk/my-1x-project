import React, { useRef } from "react";
import { ArrowCounterClockwise, CircleNotch, Eye, UploadSimple } from "@phosphor-icons/react";
import type { QuestionImageSlot } from "../../types/questionImages.types";
import type { PreviewImageData } from "../../types";
import { QuestionImageStatusBadge } from "./QuestionImageStatusBadge";
import { QuestionImageUploader } from "./QuestionImageUploader";

export interface QuestionImageSlotCardProps {
  questionNumber: number;
  questionText: string;
  slot: QuestionImageSlot;
  imageUrl?: string | null;
  uploading?: boolean;
  disabled?: boolean;
  onUpload: (file: File) => void | Promise<unknown>;
  onReset: () => void | Promise<unknown>;
  onPreview?: (data: PreviewImageData) => void;
}

function resolveAspectRatioClass(aspectRatio: string): string {
  if (aspectRatio === "1:1") return "is-ratio-1-1";
  if (aspectRatio === "3:4") return "is-ratio-3-4";
  return "is-ratio-16-9";
}

export function QuestionImageSlotCard({
  questionNumber,
  questionText,
  slot,
  imageUrl,
  uploading = false,
  disabled = false,
  onUpload,
  onReset,
  onPreview,
}: QuestionImageSlotCardProps): React.JSX.Element {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const hasImage = Boolean(imageUrl && slot.status !== "missing");
  const ratioClass = resolveAspectRatioClass(slot.aspect_ratio);

  const handleHiddenFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !disabled && !uploading) {
      void onUpload(file);
    }
    if (hiddenInputRef.current) hiddenInputRef.current.value = "";
  };

  const handleTriggerUpload = () => {
    hiddenInputRef.current?.click();
  };

  const handlePreview = () => {
    if (!imageUrl || !onPreview) return;
    onPreview({
      url: imageUrl,
      filename: slot.filename ?? `q${questionNumber}-${slot.slot_id}.png`,
      bundleId: `Q#${questionNumber} [${slot.label}]`,
      title: `${slot.label}: ${slot.choice_text ?? questionText}`,
      prompt: slot.prompt || "",
      aspectRatio: slot.aspect_ratio || "1:1",
      priceVnd: slot.price_vnd,
      model: slot.model,
    });
  };

  return (
    <div className={`question-image-slot-card ${uploading ? "is-active-upload" : ""}`}>
      <input
        ref={hiddenInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleHiddenFileChange}
        tabIndex={-1}
        disabled={disabled || uploading}
      />

      {/* Slot Header */}
      <div className="question-slot-card-header">
        <div className="question-slot-label-group">
          <span className="question-slot-label-badge">{slot.label}</span>
          {slot.choice_text ? (
            <span className="question-slot-choice-text" title={slot.choice_text}>
              {slot.choice_text}
            </span>
          ) : null}
        </div>
        <QuestionImageStatusBadge status={slot.status} />
      </div>

      {/* Visual Slot Stage */}
      <div className={`question-slot-stage ${ratioClass}`}>
        {hasImage && imageUrl && !imgError ? (
          <>
            <img
              src={imageUrl}
              alt={`${slot.label} for Question #${questionNumber}`}
              loading="lazy"
              onError={() => setImgError(true)}
            />
            {uploading && (
              <div className="question-image-stage-overlay">
                <CircleNotch size={22} className="spin" />
                <span>Uploading...</span>
              </div>
            )}
          </>
        ) : (
          <QuestionImageUploader
            compact
            questionNumber={questionNumber}
            uploading={uploading}
            disabled={disabled}
            onUpload={onUpload}
          />
        )}
      </div>

      {/* Slot Actions */}
      <div className="question-slot-actions">
        {hasImage && onPreview ? (
          <button
            type="button"
            className="question-slot-btn"
            onClick={handlePreview}
            disabled={disabled || uploading}
            title="Preview full size"
            aria-label={`Preview ${slot.label}`}
          >
            <Eye size={15} />
            <span>View</span>
          </button>
        ) : null}

        <button
          type="button"
          className="question-slot-btn"
          onClick={handleTriggerUpload}
          disabled={disabled || uploading}
          title="Upload or replace image"
          aria-label={`Replace ${slot.label}`}
        >
          <UploadSimple size={15} />
          <span>{hasImage ? "Replace" : "Upload"}</span>
        </button>

        {slot.status === "user_uploaded" || slot.user_selected ? (
          <button
            type="button"
            className="question-slot-btn btn-danger-subtle"
            onClick={() => void onReset()}
            disabled={disabled || uploading}
            title="Reset to default image"
            aria-label={`Reset ${slot.label}`}
          >
            <ArrowCounterClockwise size={15} />
            <span>Reset</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

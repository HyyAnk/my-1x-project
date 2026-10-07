import React, { useRef, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import type { QuestionImageItem, QuestionImageSlot } from "../../types/questionImages.types";
import type { PreviewImageData } from "../../types";
import { QuestionImageStatusBadge } from "./QuestionImageStatusBadge";
import { QuestionImageUploader } from "./QuestionImageUploader";
import { QuestionImageActionBar } from "./QuestionImageActionBar";
import { QuestionImageSlotGrid } from "./QuestionImageSlotGrid";

export interface QuestionImageCardProps {
  item: QuestionImageItem;
  imageUrl?: string | null;
  uploading?: boolean;
  uploadingSlots?: Record<string, boolean>;
  generating?: boolean;
  disabled?: boolean;
  onUpload: (file: File) => void | Promise<unknown>;
  onReset: () => void | Promise<unknown>;
  onGenerate: (promptOverride?: string) => void | Promise<unknown>;
  onPreviewImage?: (data: PreviewImageData) => void;
  onUploadSlot?: (slotId: string, file: File) => void | Promise<unknown>;
  onResetSlot?: (slotId: string) => void | Promise<unknown>;
  getImageUrlForSlot?: (slot: QuestionImageSlot) => string | null;
}

function resolveLayoutTag(layoutId?: string): string | null {
  if (layoutId === "visual_choices_three") return "3 Choices (1:1)";
  if (layoutId === "visual_choices_three_pure") return "3 Posters (3:4)";
  if (layoutId === "split_versus_two") return "Versus (16:9)";
  return null;
}

export function QuestionImageCard({
  item,
  imageUrl,
  uploading = false,
  uploadingSlots = {},
  generating = false,
  disabled = false,
  onUpload,
  onReset,
  onGenerate,
  onPreviewImage,
  onUploadSlot,
  onResetSlot,
  getImageUrlForSlot,
}: QuestionImageCardProps): React.JSX.Element {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const hasMultipleSlots = Boolean(item.slots && item.slots.length > 1);
  const hasImage = Boolean(imageUrl && item.status !== "missing");
  const layoutTag = resolveLayoutTag(item.layout_id);

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
    if (!imageUrl || !onPreviewImage) return;
    onPreviewImage({
      url: imageUrl,
      filename: item.filename ?? `q${item.question_number}.png`,
      bundleId: `Q#${item.question_number}`,
      title: item.question_text || `Question #${item.question_number}`,
      prompt: item.prompt || "",
      aspectRatio: item.aspect_ratio || "16:9",
      priceVnd: item.price_vnd,
      model: item.model,
    });
  };

  return (
    <div className={`question-image-card ${uploading ? "is-active-upload" : ""} ${hasMultipleSlots ? "is-multi-slot" : ""}`}>
      <input
        ref={hiddenInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleHiddenFileChange}
        tabIndex={-1}
        disabled={disabled || uploading}
      />

      {/* Header */}
      <div className="question-image-card-header">
        <div>
          <div className="question-header-top-row">
            <span className="question-image-card-number">Q#{item.question_number}</span>
            {layoutTag ? <span className="question-layout-pill">{layoutTag}</span> : null}
          </div>
          <p className="question-image-card-title" title={item.question_text}>
            {item.question_text}
          </p>
        </div>
        <QuestionImageStatusBadge status={item.status} />
      </div>

      {/* Visual Content: Slot Grid or Single Hero Stage */}
      {hasMultipleSlots ? (
        <QuestionImageSlotGrid
          item={item}
          uploadingSlots={uploadingSlots}
          disabled={disabled || generating}
          getImageUrlForSlot={(slot) => (getImageUrlForSlot ? getImageUrlForSlot(slot) : slot.image_url)}
          onUploadSlot={(slotId, file) => (onUploadSlot ? onUploadSlot(slotId, file) : onUpload(file))}
          onResetSlot={(slotId) => (onResetSlot ? onResetSlot(slotId) : onReset())}
          onPreviewSlot={onPreviewImage}
        />
      ) : (
        <div className="question-image-stage">
          {hasImage && imageUrl && !imgError ? (
            <>
              <img
                src={imageUrl}
                alt={`Question #${item.question_number}`}
                loading="lazy"
                onError={() => setImgError(true)}
              />
              {(uploading || generating) && (
                <div className="question-image-stage-overlay">
                  <CircleNotch size={26} className="spin" />
                  <span>{uploading ? "Uploading replacement..." : "Generating AI image..."}</span>
                </div>
              )}
            </>
          ) : (
            <QuestionImageUploader
              questionNumber={item.question_number}
              uploading={uploading}
              disabled={disabled || generating}
              onUpload={onUpload}
            />
          )}
        </div>
      )}

      {/* Footer & Actions */}
      <div className="question-image-card-footer">
        {item.prompt ? (
          <div>
            <button
              type="button"
              className="question-image-prompt-toggle"
              onClick={() => setShowPrompt((prev) => !prev)}
            >
              {showPrompt ? "Hide Prompt" : "View Prompt"}
            </button>
            {showPrompt && <div className="question-image-prompt-box">{item.prompt}</div>}
          </div>
        ) : null}

        {!hasMultipleSlots ? (
          <QuestionImageActionBar
            item={item}
            hasImage={hasImage}
            uploading={uploading}
            generating={generating}
            disabled={disabled}
            onTriggerUpload={handleTriggerUpload}
            onReset={onReset}
            onGenerate={() => void onGenerate()}
            onPreview={hasImage ? handlePreview : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}

import React from "react";
import { ArrowCounterClockwise, CircleNotch, Eye, Sparkle, UploadSimple } from "@phosphor-icons/react";
import type { QuestionImageItem } from "../../types/questionImages.types";

export interface QuestionImageActionBarProps {
  item: QuestionImageItem;
  hasImage: boolean;
  uploading?: boolean;
  generating?: boolean;
  disabled?: boolean;
  onTriggerUpload: () => void;
  onReset?: () => void;
  onGenerate?: () => void;
  onPreview?: () => void;
}

export function QuestionImageActionBar({
  item,
  hasImage,
  uploading = false,
  generating = false,
  disabled = false,
  onTriggerUpload,
  onReset,
  onGenerate,
  onPreview,
}: QuestionImageActionBarProps): React.JSX.Element {
  const isBusy = uploading || generating || disabled;
  const isUserCustom = item.status === "user_uploaded" || item.user_selected;

  return (
    <div className="question-image-actions">
      <div className="question-image-action-group">
        <button
          type="button"
          className="quiet-button compact"
          onClick={onTriggerUpload}
          disabled={isBusy}
          title={hasImage ? "Replace this image" : "Upload an image"}
        >
          {uploading ? <CircleNotch size={14} className="spin" /> : <UploadSimple size={14} />}
          <span>{hasImage ? "Replace" : "Upload"}</span>
        </button>

        {isUserCustom && onReset ? (
          <button
            type="button"
            className="quiet-button compact"
            onClick={onReset}
            disabled={isBusy}
            title="Reset to default AI generated asset"
          >
            <ArrowCounterClockwise size={14} />
            <span>Reset to AI</span>
          </button>
        ) : null}

        {onGenerate ? (
          <button
            type="button"
            className="quiet-button compact"
            onClick={onGenerate}
            disabled={isBusy}
            title="Generate or re-generate image using AI"
          >
            {generating ? <CircleNotch size={14} className="spin" /> : <Sparkle size={14} />}
            <span>AI Generate</span>
          </button>
        ) : null}
      </div>

      {hasImage && onPreview ? (
        <button
          type="button"
          className="quiet-button compact icon-only"
          onClick={onPreview}
          disabled={uploading || generating}
          title="Preview image in full view"
          aria-label="Preview image"
        >
          <Eye size={15} />
        </button>
      ) : null}
    </div>
  );
}

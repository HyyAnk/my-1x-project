import React, { useRef, useState } from "react";
import { CircleNotch, CloudArrowUp } from "@phosphor-icons/react";

export interface QuestionImageUploaderProps {
  questionNumber: number;
  uploading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onUpload: (file: File) => void | Promise<unknown>;
}

export function QuestionImageUploader({
  questionNumber,
  uploading = false,
  disabled = false,
  compact = false,
  onUpload,
}: QuestionImageUploaderProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !disabled && !uploading) {
      void onUpload(file);
    }
    // Reset file input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void onUpload(file);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`question-image-dropzone ${isDragging ? "is-dragging" : ""} ${compact ? "is-compact" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled || uploading ? -1 : 0}
      aria-label={`Upload image for Question #${questionNumber}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
        tabIndex={-1}
        disabled={disabled || uploading}
      />
      {uploading ? (
        <>
          <CircleNotch size={24} className="spin" color="var(--color-primary, #6366f1)" />
          <p>Uploading image...</p>
        </>
      ) : (
        <>
          <CloudArrowUp size={28} color="var(--color-primary, #6366f1)" />
          <strong>{compact ? "Click to replace" : "Click to upload image"}</strong>
          <p>{compact ? "Drop new PNG, JPEG, WebP" : "Drop PNG, JPEG, WebP up to 15MB"}</p>
        </>
      )}
    </div>
  );
}

import { useRef, useState } from "react";
import { ArrowsClockwise, CheckCircle, FilmSlate, Trash, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import type { VideoFileInfo } from "./types";

export interface VideoDropzoneCardProps {
  label: string;
  roleBadge: string;
  isIntro: boolean;
  inputId: string;
  fileInfo: VideoFileInfo | null;
  probing: boolean;
  disabled?: boolean;
  onSelectFile: (file: File) => void;
  onClear: () => void;
}

export function VideoDropzoneCard({
  label,
  roleBadge,
  isIntro,
  inputId,
  fileInfo,
  probing,
  disabled = false,
  onSelectFile,
  onClear,
}: VideoDropzoneCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || probing) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || probing) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.includes("mp4")) {
      onSelectFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectFile(file);
    }
    // Reset so same file can be selected again if replaced
    e.target.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasValidVideo = fileInfo && !fileInfo.error && fileInfo.dataUrl;

  return (
    <div className={`video-dropzone-card ${hasValidVideo ? "is-active" : ""}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        id={inputId}
        accept="video/mp4"
        style={{ display: "none" }}
        onChange={handleInputChange}
        disabled={disabled || probing}
      />

      {/* Card Header */}
      <div className="video-dropzone-card-header">
        <div className="video-dropzone-label">
          <FilmSlate size={16} />
          <span>{label}</span>
        </div>
        <span className={`video-role-tag ${isIntro ? "intro-tag" : "outro-tag"}`}>{roleBadge}</span>
      </div>

      {/* Probing State */}
      {probing && (
        <div className="video-probing-state">
          <div className="video-probing-spinner" />
          <span>Analyzing video resolution & format...</span>
        </div>
      )}

      {/* Error State */}
      {!probing && fileInfo?.error && (
        <div className="video-error-banner">
          <WarningCircle size={18} weight="fill" style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="video-error-content">
            <div className="video-error-title">Resolution Mismatch</div>
            <div>{fileInfo.error}</div>
            <button
              type="button"
              className="video-action-btn"
              style={{ marginTop: 8 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <ArrowsClockwise size={13} />
              <span>Choose Another File</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Video Preview when Valid */}
      {!probing && hasValidVideo && (
        <div className="video-preview-wrapper">
          <video src={fileInfo.dataUrl} className="video-player-frame" controls playsInline preload="metadata" />
          <div className="video-preview-overlay-badges">
            <span className="video-preview-badge is-good">
              <CheckCircle size={12} weight="fill" />
              <span>1080p FHD</span>
            </span>
            <span className="video-preview-badge">
              <span>{fileInfo.duration.toFixed(1)}s</span>
            </span>
          </div>

          <div className="video-preview-actions">
            <div className="video-file-meta">
              <span className="video-file-name" title={fileInfo.file.name}>
                {fileInfo.file.name}
              </span>
              <span className="video-file-subtext">
                {formatFileSize(fileInfo.sizeBytes)} • {fileInfo.width}x{fileInfo.height}
              </span>
            </div>

            <div className="video-action-buttons">
              <button
                type="button"
                className="video-action-btn"
                title="Replace with another file"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <ArrowsClockwise size={13} />
                <span>Replace</span>
              </button>
              <button type="button" className="video-action-btn danger" title="Remove video" onClick={onClear} disabled={disabled}>
                <Trash size={13} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Dropzone Area */}
      {!probing && !hasValidVideo && !fileInfo?.error && (
        <div
          className={`video-drop-area ${isDragOver ? "is-dragover" : ""}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="video-drop-icon">
            <UploadSimple size={22} weight="bold" />
          </div>
          <p className="video-drop-title">Select 1080p MP4 Video</p>
          <p className="video-drop-hint">Drag & drop or click to browse (1920x1080)</p>
        </div>
      )}
    </div>
  );
}

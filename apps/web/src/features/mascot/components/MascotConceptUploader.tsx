import { useRef } from "react";
import { CircleNotch, Trash, UploadSimple } from "@phosphor-icons/react";
import type { QuizImageStyle, UploadMascotConceptResponse } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { Notice } from "../../../components/types";
import { useMascotUploader } from "../hooks/useMascotUploader";

export interface MascotConceptUploaderProps {
  mascotId?: string | null;
  name?: string;
  description?: string;
  colorTheme?: string;
  visualStyle?: QuizImageStyle;
  onSuccess?: (response: UploadMascotConceptResponse) => void | Promise<void>;
  onNotice?: (notice: Notice) => void;
  onMascotsChanged?: () => Promise<void>;
  uploader?: ReturnType<typeof useMascotUploader>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MascotConceptUploader({
  mascotId,
  name,
  description,
  colorTheme,
  visualStyle,
  onSuccess,
  onNotice,
  onMascotsChanged,
  uploader: injectedUploader,
}: MascotConceptUploaderProps) {
  const { t } = useTranslation();
  const internalUploader = useMascotUploader({
    mascotId,
    name,
    description,
    colorTheme,
    visualStyle,
    onSuccess,
    onNotice,
    onMascotsChanged,
  });

  const uploader = injectedUploader || internalUploader;
  const {
    uploadFile,
    previewUrl,
    autoMatting,
    setAutoMatting,
    isUploading,
    dragOver,
    handleFileSelect,
    handleUploadConcept,
    clearUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = uploader;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset file input so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mascot-concept-uploader" data-testid="mascot-concept-uploader">
      <input
        ref={fileInputRef}
        type="file"
        data-testid="concept-file-input"
        accept="image/png,image/jpeg,image/webp"
        onChange={onInputChange}
        className="dropzone-hidden-input"
        aria-label={t("mascots.browseFiles")}
      />

      {!uploadFile ? (
        <div
          className={`concept-dropzone ${dragOver ? "is-drag-over" : ""}`}
          data-testid="concept-dropzone"
          onDragOver={handleDragOver}
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
          aria-label={t("mascots.dropzonePrompt")}
        >
          <div className="dropzone-icon-wrap">
            <UploadSimple size={28} weight="bold" />
          </div>
          <p className="dropzone-title">{t("mascots.dropzonePrompt")}</p>
          <button
            type="button"
            className="quiet-button dropzone-browse-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <span>{t("mascots.browseFiles")}</span>
          </button>
          <span className="dropzone-formats-badge">{t("mascots.dropzoneFormats")}</span>
        </div>
      ) : (
        <div className="uploader-preview-container" data-testid="uploader-preview-container">
          <div className="uploader-file-header">
            <div className="uploader-file-details">
              <span className="uploader-file-name" title={uploadFile.name}>
                {uploadFile.name}
              </span>
              <span className="uploader-file-meta">
                {uploadFile.type} · {formatFileSize(uploadFile.size)}
              </span>
            </div>
            <button
              type="button"
              data-testid="clear-upload-btn"
              className="icon-button compact"
              onClick={clearUpload}
              disabled={isUploading}
              aria-label={t("mascots.clearFileBtn")}
              title={t("mascots.clearFileBtn")}
            >
              <Trash size={15} />
            </button>
          </div>

          <div className="uploader-preview-frame">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={uploadFile.name}
                data-testid="concept-preview-image"
                className="uploader-preview-img"
              />
            ) : (
              <CircleNotch className="spin" size={24} style={{ color: "var(--accent)" }} />
            )}
          </div>

          <label className="auto-matting-row" htmlFor="auto-matting-checkbox">
            <input
              id="auto-matting-checkbox"
              type="checkbox"
              data-testid="auto-matting-toggle"
              checked={autoMatting}
              onChange={(e) => setAutoMatting(e.target.checked)}
              disabled={isUploading}
              className="auto-matting-checkbox"
            />
            <div className="auto-matting-content">
              <span className="auto-matting-title">{t("mascots.autoMattingLabel")}</span>
              <span className="auto-matting-help">{t("mascots.autoMattingHelp")}</span>
            </div>
          </label>

          <div className="uploader-actions-row">
            <button
              type="button"
              data-testid="upload-concept-submit-btn"
              className="primary-button uploader-submit-btn"
              disabled={isUploading || !uploadFile}
              onClick={handleUploadConcept}
            >
              {isUploading ? <CircleNotch className="spin" size={18} /> : <UploadSimple size={18} weight="bold" />}
              <span>{isUploading ? t("mascots.uploadingBtn") : t("mascots.uploadBtn")}</span>
            </button>

            <button
              type="button"
              className="quiet-button"
              disabled={isUploading}
              onClick={clearUpload}
            >
              <Trash size={15} />
              <span>{t("mascots.clearFileBtn")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

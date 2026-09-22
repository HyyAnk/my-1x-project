import { useState } from "react";
import { ArrowClockwise, DownloadSimple, Trash, UploadSimple } from "@phosphor-icons/react";
import type { BrandAssetItem } from "@studio/shared";
import { useAssetDropzone } from "../hooks/useAssetDropzone";
import { formatDate, formatFileSize, triggerFileDownload } from "../utils/fileUploadHelpers";

export interface ChannelLogoCardProps {
  logo?: BrandAssetItem;
  isMutating?: boolean;
  onUploadLogo: (file: File) => Promise<void>;
  onDeleteLogo: () => Promise<void>;
}

export function ChannelLogoCard({
  logo,
  isMutating = false,
  onUploadLogo,
  onDeleteLogo,
}: ChannelLogoCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const {
    isDragOver,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openFileDialog,
    handleInputChange,
  } = useAssetDropzone({
    onFileSelect: onUploadLogo,
    disabled: isMutating,
  });

  const handleDownload = () => {
    if (logo?.url) {
      triggerFileDownload(logo.url, logo.filename);
    }
  };

  const handleDelete = async () => {
    await onDeleteLogo();
    setIsConfirmingDelete(false);
  };

  return (
    <div className="brand-asset-card channel-logo-card" data-testid="channel-logo-card">
      <input
        ref={fileInputRef}
        type="file"
        data-testid="logo-file-input"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        onChange={handleInputChange}
        className="visually-hidden"
        aria-label="Upload channel brand logo"
      />

      <div className="card-header">
        <div className="card-header-titles">
          <h3 className="card-title">Channel Logo</h3>
          <span className="card-guidance">Square 1:1, transparent background (PNG, SVG, WebP)</span>
        </div>
        <span
          className={`status-pill ${logo ? "pill-configured" : "pill-missing"}`}
          data-testid="logo-status-pill"
        >
          {logo ? "Configured" : "Missing"}
        </span>
      </div>

      <div className="channel-logo-content">
        <div
          className={`logo-preview-box transparent-checkerboard ${isDragOver ? "is-dragover" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="logo-preview-area"
        >
          {logo ? (
            <img
              src={logo.url}
              alt={logo.filename}
              className="channel-logo-img"
              data-testid="channel-logo-image"
            />
          ) : (
            <div
              className="logo-upload-dropzone"
              onClick={openFileDialog}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openFileDialog()}
              data-testid="logo-upload-dropzone"
            >
              <UploadSimple size={36} className="upload-dropzone-icon" />
              <p className="upload-dropzone-title">Upload Channel Logo</p>
              <span className="upload-dropzone-sub">
                Drag and drop or browse (PNG, SVG, WebP, JPEG)
              </span>
            </div>
          )}
        </div>

        {logo ? (
          <div className="logo-details-panel">
            <dl className="asset-metadata-list">
              <div className="meta-item">
                <dt className="meta-label">File</dt>
                <dd className="meta-value filename" title={logo.filename}>
                  {logo.filename}
                </dd>
              </div>
              <div className="meta-item">
                <dt className="meta-label">Dimensions</dt>
                <dd className="meta-value">{`${logo.width} × ${logo.height} px`}</dd>
              </div>
              <div className="meta-item">
                <dt className="meta-label">Size</dt>
                <dd className="meta-value">{formatFileSize(logo.size_bytes)}</dd>
              </div>
              <div className="meta-item">
                <dt className="meta-label">Uploaded</dt>
                <dd className="meta-value">{formatDate(logo.updated_at || logo.created_at)}</dd>
              </div>
            </dl>

            <div className="asset-actions-toolbar">
              <button
                type="button"
                className="button secondary replace-asset-btn"
                onClick={openFileDialog}
                disabled={isMutating}
                data-testid="replace-logo-btn"
              >
                <ArrowClockwise size={15} />
                <span>Replace</span>
              </button>

              <button
                type="button"
                className="button quiet download-asset-btn"
                onClick={handleDownload}
                disabled={isMutating || !logo.url}
                data-testid="download-logo-btn"
              >
                <DownloadSimple size={15} />
                <span>Download</span>
              </button>

              {isConfirmingDelete ? (
                <div className="delete-confirm-group">
                  <button
                    type="button"
                    className="button danger confirm-delete-btn"
                    onClick={handleDelete}
                    disabled={isMutating}
                    data-testid="confirm-delete-logo-btn"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="button quiet cancel-delete-btn"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isMutating}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="button quiet delete-asset-btn"
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={isMutating}
                  data-testid="delete-logo-btn"
                  aria-label="Delete Logo"
                >
                  <Trash size={15} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

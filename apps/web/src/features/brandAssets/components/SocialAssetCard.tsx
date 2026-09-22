import { useState } from "react";
import { ArrowClockwise, DownloadSimple, Trash, UploadSimple } from "@phosphor-icons/react";
import type { BrandAssetItem, SocialAssetKind, SocialPlatform } from "@studio/shared";
import { useAssetDropzone } from "../hooks/useAssetDropzone";
import { formatDate, formatFileSize, triggerFileDownload } from "../utils/fileUploadHelpers";

export interface SocialAssetCardProps {
  platform: SocialPlatform;
  kind: SocialAssetKind;
  title: string;
  recommendedGuidance: string;
  aspectRatio: "1/1" | "16/9" | "3/1";
  asset?: BrandAssetItem;
  isMutating?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function SocialAssetCard({
  platform,
  kind,
  title,
  recommendedGuidance,
  aspectRatio,
  asset,
  isMutating = false,
  onUpload,
  onDelete,
}: SocialAssetCardProps) {
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
    onFileSelect: onUpload,
    disabled: isMutating,
  });

  const handleDownload = () => {
    if (asset?.url) {
      triggerFileDownload(asset.url, asset.filename);
    }
  };

  const handleDelete = async () => {
    await onDelete();
    setIsConfirmingDelete(false);
  };

  const aspectClass =
    aspectRatio === "1/1"
      ? "aspect-1-1"
      : aspectRatio === "16/9"
        ? "aspect-16-9"
        : "aspect-3-1";

  return (
    <div
      className="brand-asset-card social-asset-card"
      data-testid={`social-asset-card-${platform}-${kind}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        data-testid={`social-file-input-${platform}-${kind}`}
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        onChange={handleInputChange}
        className="visually-hidden"
        aria-label={`Upload ${title}`}
      />

      <div className="card-header">
        <div className="card-header-titles">
          <h4 className="card-title">{title}</h4>
          <span className="card-guidance">{recommendedGuidance}</span>
        </div>
        <span
          className={`status-pill ${asset ? "pill-configured" : "pill-missing"}`}
          data-testid={`social-status-pill-${platform}-${kind}`}
        >
          {asset ? "Configured" : "Missing"}
        </span>
      </div>

      <div className="social-asset-content">
        <div
          className={`social-preview-box transparent-checkerboard ${aspectClass} ${isDragOver ? "is-dragover" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid={`social-preview-area-${platform}-${kind}`}
        >
          {asset ? (
            <img
              src={asset.url}
              alt={asset.filename}
              className="social-asset-img"
              data-testid={`social-asset-image-${platform}-${kind}`}
            />
          ) : (
            <div
              className="social-upload-dropzone"
              onClick={openFileDialog}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openFileDialog()}
              data-testid={`social-upload-dropzone-${platform}-${kind}`}
            >
              <UploadSimple size={30} className="upload-dropzone-icon" />
              <p className="upload-dropzone-title">Upload {kind === "avatar" ? "Avatar" : "Banner"}</p>
              <span className="upload-dropzone-sub">{recommendedGuidance}</span>
            </div>
          )}
        </div>

        {asset ? (
          <div className="social-details-panel">
            <dl className="asset-metadata-list">
              <div className="meta-item">
                <dt className="meta-label">File</dt>
                <dd className="meta-value filename" title={asset.filename}>
                  {asset.filename}
                </dd>
              </div>
              <div className="meta-item">
                <dt className="meta-label">Dimensions</dt>
                <dd className="meta-value">{`${asset.width} × ${asset.height} px`}</dd>
              </div>
              <div className="meta-item">
                <dt className="meta-label">Size</dt>
                <dd className="meta-value">{formatFileSize(asset.size_bytes)}</dd>
              </div>
              <div className="meta-item">
                <dt className="meta-label">Uploaded</dt>
                <dd className="meta-value">{formatDate(asset.updated_at || asset.created_at)}</dd>
              </div>
            </dl>

            <div className="asset-actions-toolbar">
              <button
                type="button"
                className="button secondary replace-asset-btn"
                onClick={openFileDialog}
                disabled={isMutating}
                data-testid={`replace-asset-${platform}-${kind}`}
              >
                <ArrowClockwise size={15} />
                <span>Replace</span>
              </button>

              <button
                type="button"
                className="button quiet download-asset-btn"
                onClick={handleDownload}
                disabled={isMutating || !asset.url}
                data-testid={`download-asset-${platform}-${kind}`}
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
                    data-testid={`confirm-delete-${platform}-${kind}`}
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
                  data-testid={`delete-asset-${platform}-${kind}`}
                  aria-label={`Delete ${kind}`}
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

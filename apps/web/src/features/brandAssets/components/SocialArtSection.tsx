import { useState } from "react";
import { Images, Plus, UploadSimple } from "@phosphor-icons/react";
import type { SocialArtAsset } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useAssetDropzone } from "../hooks/useAssetDropzone";
import { ArtDeleteConfirmModal } from "./ArtDeleteConfirmModal";
import { ArtLightboxModal } from "./ArtLightboxModal";
import { SocialArtCard } from "./SocialArtCard";

export interface SocialArtSectionProps {
  artAssets: SocialArtAsset[];
  isMutating?: boolean;
  onUploadArt: (file: File, caption?: string) => Promise<void>;
  onDeleteArt: (assetId: string) => Promise<void>;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export function SocialArtSection({
  artAssets = [],
  isMutating = false,
  onUploadArt,
  onDeleteArt,
  onNotice,
}: SocialArtSectionProps) {
  const [activeLightboxAsset, setActiveLightboxAsset] = useState<SocialArtAsset | null>(null);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<SocialArtAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  );

  const handleFilesSelect = async (files: File[]) => {
    if (!files.length) return;
    setUploadProgress({ current: 0, total: files.length });
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length });
      try {
        await onUploadArt(files[i]);
        successCount++;
      } catch {
        // Individual failure notice is emitted by parent hook
      }
    }
    setUploadProgress(null);
    if (files.length > 1 && successCount > 0) {
      onNotice?.({
        tone: "good",
        message: `Uploaded ${successCount} of ${files.length} artworks successfully.`,
      });
    }
  };

  const {
    isDragOver,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openFileDialog,
    handleInputChange,
  } = useAssetDropzone({
    onFilesSelect: handleFilesSelect,
    disabled: isMutating || Boolean(uploadProgress),
  });

  const handleConfirmDelete = async () => {
    if (!pendingDeleteAsset) return;
    try {
      await onDeleteArt(pendingDeleteAsset.id);
      setPendingDeleteAsset(null);
    } catch {
      // Handled in parent hook
    }
  };

  const isBusy = isMutating || Boolean(uploadProgress);

  return (
    <section
      className="social-art-section"
      data-testid="social-art-section"
      aria-label="Social Art & Auxiliary Media Section"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
        onChange={handleInputChange}
        className="visually-hidden"
        data-testid="art-multi-file-input"
        aria-label="Upload artwork files"
      />

      <div className="art-section-topbar">
        <div className="art-section-headings">
          <div className="art-title-row">
            <h2 className="section-title">Social Art & Auxiliary Media</h2>
            <span className="art-count-badge" data-testid="art-count-badge">
              {artAssets.length} {artAssets.length === 1 ? "asset" : "assets"}
            </span>
          </div>
          <p className="section-subtitle">
            Freeform storage for auxiliary graphics, stickers, badges, overlays, and background
            artwork.
          </p>
        </div>

        <button
          type="button"
          className="button primary upload-artwork-btn"
          onClick={openFileDialog}
          disabled={isBusy}
          data-testid="upload-artwork-btn"
        >
          <Plus size={16} weight="bold" />
          <span>Upload Artwork</span>
        </button>
      </div>

      <div
        className={`art-dropzone-panel ${isDragOver ? "is-dragover" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && openFileDialog()}
        data-testid="art-dropzone-panel"
      >
        <UploadSimple size={26} className="art-dropzone-icon" />
        <div className="art-dropzone-labels">
          <p className="art-dropzone-title">
            Drop artwork files here or <strong>browse</strong>
          </p>
          <span className="art-dropzone-hint">
            Supports PNG, JPG, SVG, WebP, GIF (multi-file upload supported)
          </span>
        </div>
      </div>

      {uploadProgress ? (
        <div className="art-upload-progress-card" data-testid="art-upload-progress">
          <div className="progress-labels">
            <span>
              Uploading artwork {uploadProgress.current} of {uploadProgress.total}...
            </span>
            <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-bar"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {artAssets.length === 0 ? (
        <div className="brand-assets-empty-card" data-testid="social-art-empty-state">
          <div className="empty-state">
            <div className="empty-icon">
              <Images size={38} weight="duotone" />
            </div>
            <h3>No auxiliary art assets yet</h3>
            <p>
              No auxiliary art assets yet. Upload stickers, overlays, badges, or backgrounds to
              enrich your channel content.
            </p>
            <button
              type="button"
              className="button secondary empty-action-btn"
              onClick={openFileDialog}
              disabled={isBusy}
              data-testid="empty-upload-artwork-btn"
            >
              <UploadSimple size={16} />
              <span>Upload First Artwork</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="social-art-grid" data-testid="social-art-grid">
          {artAssets.map((asset) => (
            <SocialArtCard
              key={asset.id}
              asset={asset}
              isMutating={isBusy}
              onView={(a) => setActiveLightboxAsset(a)}
              onDeleteRequest={(a) => setPendingDeleteAsset(a)}
              onNotice={onNotice}
            />
          ))}
        </div>
      )}

      <ArtLightboxModal
        asset={activeLightboxAsset}
        onClose={() => setActiveLightboxAsset(null)}
      />

      <ArtDeleteConfirmModal
        asset={pendingDeleteAsset}
        isDeleting={isMutating}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDeleteAsset(null)}
      />
    </section>
  );
}

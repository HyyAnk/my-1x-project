import { useState } from "react";
import { ArrowLeft, DownloadSimple, Sparkle, Stop, ArrowsClockwise, Warning } from "@phosphor-icons/react";
import type { Channel, GenerateShortReelTarget, ReelGenerationMode } from "@studio/shared";

export interface ShortReelHeaderActionsProps {
  isGeneratingOrPending: boolean;
  canExport: boolean;
  scriptMissing: boolean;
  hasExistingDeliverables?: boolean;
  cancel: () => void;
  generate: (target: GenerateShortReelTarget, mode?: ReelGenerationMode) => Promise<void> | void;
  exportPackage: () => void;
}

function RegenerateConfirmModal({
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="short-reel-modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm Regenerate All">
      <div className="short-reel-modal short-reel-confirm-modal">
        <div className="short-reel-modal-header">
          <div className="short-reel-modal-title-group">
            <Warning size={20} weight="fill" className="short-reel-warn-icon" />
            <h3>Regenerate Full Package?</h3>
          </div>
        </div>
        <div className="short-reel-modal-body">
          <p>
            Regenerating the full package will re-create the script, portrait style reference, vertical cover, and publishing metadata.
            Previous accepted assets will be replaced once new outputs complete.
          </p>
        </div>
        <div className="short-reel-modal-footer">
          <button type="button" className="short-reel-secondary-btn" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="short-reel-primary-btn"
            onClick={onConfirm}
            disabled={isSubmitting}
            aria-label="Confirm Regenerate All"
          >
            {isSubmitting ? (
              <>
                <span className="short-reel-spinner" aria-hidden="true" />
                <span>Starting...</span>
              </>
            ) : (
              <span>Confirm Regenerate</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function HeaderActions({
  isGeneratingOrPending,
  canExport,
  scriptMissing,
  hasExistingDeliverables,
  cancel,
  generate,
  exportPackage,
}: ShortReelHeaderActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const handleAction = async (target: GenerateShortReelTarget, mode?: ReelGenerationMode) => {
    if (isSubmitting || isGeneratingOrPending) return;
    setIsSubmitting(true);
    try {
      await generate(target, mode);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRegenerate = async () => {
    await handleAction("package", "regenerate");
    setShowRegenerateConfirm(false);
  };

  const isLocked = isGeneratingOrPending || isSubmitting;

  return (
    <div className="short-reel-header-actions">
      {isGeneratingOrPending ? (
        <button type="button" className="short-reel-cancel-btn" onClick={cancel} aria-label="Cancel active generation">
          <Stop size={16} weight="fill" />
          <span>Cancel</span>
        </button>
      ) : (
        <>
          {scriptMissing && (
            <button
              type="button"
              className="short-reel-secondary-btn"
              disabled={isLocked}
              onClick={() => handleAction("script")}
              aria-label="Generate Script"
            >
              {isSubmitting ? <span className="short-reel-spinner" aria-hidden="true" /> : <Sparkle size={16} weight="fill" />}
              <span>{isSubmitting ? "Starting..." : "Generate Script"}</span>
            </button>
          )}

          {hasExistingDeliverables && !scriptMissing && (
            <button
              type="button"
              className="short-reel-secondary-btn"
              disabled={isLocked}
              onClick={() => setShowRegenerateConfirm(true)}
              aria-label="Regenerate All Deliverables"
            >
              <ArrowsClockwise size={16} />
              <span>Regenerate All</span>
            </button>
          )}

          <button
            type="button"
            className="short-reel-generate-btn"
            disabled={isLocked}
            onClick={() => handleAction("package")}
            aria-label="Generate Full Package"
          >
            {isSubmitting ? (
              <>
                <span className="short-reel-spinner" aria-hidden="true" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Sparkle size={16} weight="fill" />
                <span>Generate Package</span>
              </>
            )}
          </button>
        </>
      )}

      <button
        type="button"
        className="short-reel-export-btn"
        disabled={!canExport || isLocked}
        onClick={exportPackage}
        title={
          !canExport
            ? "All units (script, references, cover, publishing) must be ready and current before exporting."
            : "Download complete short-reel PKZIP package."
        }
        aria-label="Export PKZIP Package"
      >
        <DownloadSimple size={16} weight="bold" />
        <span>Export Package</span>
      </button>

      {showRegenerateConfirm && (
        <RegenerateConfirmModal
          onConfirm={handleConfirmRegenerate}
          onCancel={() => setShowRegenerateConfirm(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

export interface ShortReelHeaderProps extends ShortReelHeaderActionsProps {
  channel: Channel;
  reelId: string;
  cleanTitle: string;
  revision: number;
  sourceQuestionId: string;
  isDraftDirty: boolean;
  onBack: () => void;
}

export function ShortReelHeader({
  channel,
  reelId,
  cleanTitle,
  revision,
  sourceQuestionId,
  isDraftDirty,
  onBack,
  ...actions
}: ShortReelHeaderProps) {
  // Enforce rule: no title ending with a period
  const formattedTitle = cleanTitle.replace(/\.+$/, "").trim();

  return (
    <header className="short-reel-header">
      <div className="short-reel-header-left">
        <button type="button" className="short-reel-back-btn" onClick={onBack} aria-label="Back to channel">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="short-reel-title-block">
          <div className="short-reel-title-row">
            <h2 className="short-reel-title">{formattedTitle}</h2>
            <span className="short-reel-badge short-reel-badge-aspect">9:16 Short-Reel</span>
            <span className="short-reel-badge short-reel-badge-rev">Rev v{revision}</span>
            <span className="short-reel-badge short-reel-badge-status">Draft</span>
            {isDraftDirty && <span className="short-reel-badge short-reel-badge-dirty">Unsaved Draft</span>}
          </div>
          <div className="short-reel-sub-bar">
            <span>Channel: {channel.display_name}</span>
            <span>•</span>
            <span>
              Reel ID: <code>{reelId}</code>
            </span>
            <span>•</span>
            <span>Source: {sourceQuestionId}</span>
          </div>
        </div>
      </div>

      <HeaderActions {...actions} />
    </header>
  );
}

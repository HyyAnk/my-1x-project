import { ArrowLeft, DownloadSimple, Sparkle, Stop } from "@phosphor-icons/react";
import type { Channel, GenerateShortReelTarget } from "@studio/shared";

export interface ShortReelHeaderActionsProps {
  isGeneratingOrPending: boolean;
  canExport: boolean;
  scriptMissing: boolean;
  cancel: () => void;
  generate: (target: GenerateShortReelTarget) => void;
  exportPackage: () => void;
}

function HeaderActions({ isGeneratingOrPending, canExport, scriptMissing, cancel, generate, exportPackage }: ShortReelHeaderActionsProps) {
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
            <button type="button" className="short-reel-secondary-btn" onClick={() => generate("script")} aria-label="Generate Script">
              <Sparkle size={16} weight="fill" />
              <span>Generate Script</span>
            </button>
          )}
          <button type="button" className="short-reel-generate-btn" onClick={() => generate("package")} aria-label="Generate Full Package">
            <Sparkle size={16} weight="fill" />
            <span>Generate Package</span>
          </button>
        </>
      )}
      <button
        type="button"
        className="short-reel-export-btn"
        disabled={!canExport || isGeneratingOrPending}
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
  return (
    <header className="short-reel-header">
      <div className="short-reel-header-left">
        <button type="button" className="short-reel-back-btn" onClick={onBack} aria-label="Back to channel">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="short-reel-title-block">
          <div className="short-reel-title-row">
            <h2 className="short-reel-title">{cleanTitle}</h2>
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

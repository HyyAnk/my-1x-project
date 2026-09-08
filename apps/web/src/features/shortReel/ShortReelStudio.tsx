import { useState } from "react";
import { ArrowClockwise, ArrowLeft, DownloadSimple, FilmStrip, Sparkle, Stop, Warning, X } from "@phosphor-icons/react";
import type { Channel, GenerateShortReelTarget, ShortReelRecord, Task } from "@studio/shared";
import type { Notice } from "../../components/types";
import { LoadingState } from "../../components/EmptyState";
import { ShortReelSourceCard } from "./components/ShortReelSourceCard";
import { SegmentEditor } from "./components/SegmentEditor";
import { ReelAssets } from "./components/ReelAssets";
import { PublishingPanel } from "./components/PublishingPanel";
import { useShortReel } from "./hooks/useShortReel";
import "./ShortReelStudio.css";

export interface ShortReelStudioProps {
  channel: Channel;
  reelId: string;
  onBack: () => void;
  onNotice: (notice: NonNullable<Notice>) => void;
}

type StudioTab = "script" | "assets" | "publishing";

type HeaderActionsProps = {
  isGeneratingOrPending: boolean;
  canExport: boolean;
  scriptMissing: boolean;
  cancel: () => void;
  generate: (target: GenerateShortReelTarget) => void;
  exportPackage: () => void;
};

function HeaderActions({ isGeneratingOrPending, canExport, scriptMissing, cancel, generate, exportPackage }: HeaderActionsProps) {
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

function canExportReel(reel: ShortReelRecord): boolean {
  const requiredUnits = [reel.units.script, reel.units.references, reel.units.cover, reel.units.publishing];
  return requiredUnits.every((unit) => unit.state === "ready") && (reel.stale_segments?.length ?? 0) === 0;
}

function hasPendingGeneration(reel: ShortReelRecord, task: Task | null, isGenerating: boolean): boolean {
  if (isGenerating || task?.status === "RUNNING" || task?.status === "QUEUED") return true;
  return [reel.units.script, reel.units.references, reel.units.cover, reel.units.publishing].some((unit) => unit.state === "pending");
}

export function ShortReelStudio({ channel, reelId, onBack, onNotice }: ShortReelStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("script");

  const {
    status,
    reel,
    error,
    isSaving,
    isGenerating,
    activeTask,
    draftScript,
    draftPublishing,
    isDraftDirty,
    conflictRemoteRecord,
    clipboardFallbackText,
    setDraftScript,
    setDraftPublishing,
    clearClipboardFallback,
    saveSegment,
    savePublishing,
    generate,
    cancel,
    exportPackage,
    copyText,
    keepLocalDraft,
    discardDraftAndReload,
    retry,
  } = useShortReel({
    channelId: channel.channel_id,
    reelId,
    onNotice,
  });

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "not_found" || status === "error" || !reel) {
    return (
      <div className="short-reel-state-container" role="region" aria-label="Short-Reel Error">
        <FilmStrip size={40} weight="duotone" />
        <h3>{status === "not_found" ? "Short-Reel Not Found" : "Failed to Load Short-Reel"}</h3>
        <p>{error || "The requested Short-Reel could not be found or loaded."}</p>
        <div className="short-reel-state-actions">
          <button type="button" className="short-reel-back-btn" onClick={onBack} aria-label="Back to channel">
            <ArrowLeft size={16} />
            <span>Back to Channel</span>
          </button>
          <button type="button" className="short-reel-primary-btn" onClick={retry} aria-label="Retry loading Short-Reel">
            <ArrowClockwise size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const { topic, source, units, revision } = reel;
  const cleanTitle = topic.title.replace(/\.+$/, "");
  const isKeywordOrigin = topic.origin === "keyword";

  const isAllReadyForExport = canExportReel(reel);
  const isGeneratingOrPending = hasPendingGeneration(reel, activeTask, isGenerating);

  return (
    <div className="short-reel-studio">
      {/* Header bar */}
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
                Reel ID: <code>{reel.reel_id}</code>
              </span>
              <span>•</span>
              <span>Source: {source.question_id}</span>
            </div>
          </div>
        </div>

        <HeaderActions
          isGeneratingOrPending={isGeneratingOrPending}
          canExport={isAllReadyForExport}
          scriptMissing={!reel.script || units.script.state === "missing"}
          cancel={() => cancel()}
          generate={generate}
          exportPackage={exportPackage}
        />
      </header>

      {/* Concurrent Edit Conflict Banner */}
      {conflictRemoteRecord && (
        <div className="short-reel-alert short-reel-alert-conflict" role="alert">
          <Warning size={20} weight="fill" />
          <div className="short-reel-alert-body">
            <strong>Revision Conflict Detected</strong>
            <p>
              This Short-Reel was updated to Revision v{conflictRemoteRecord.revision} while you were editing. You can keep your local draft
              for manual reconciliation, or reload the latest remote version. Saving the local draft does not bypass revision checks.
            </p>
            <div className="short-reel-conflict-actions">
              <button type="button" className="short-reel-secondary-btn" onClick={keepLocalDraft}>
                Keep My Draft
              </button>
              <button type="button" className="short-reel-primary-btn" onClick={discardDraftAndReload}>
                Discard & Reload Remote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Task Banner */}
      {isGeneratingOrPending && (
        <div className="short-reel-alert short-reel-alert-info" role="status">
          <span className="short-reel-spinner" aria-hidden="true" />
          <div className="short-reel-alert-body">
            <strong>Generation In Progress</strong>
            <p>{activeTask?.progress_message || "Generating creative deliverables..."}</p>
          </div>
        </div>
      )}

      {/* Top Cards Grid: Topic Concept & Source Question */}
      <main className="short-reel-grid">
        <section className="short-reel-card short-reel-topic-card" aria-label="Topic Concept">
          <div className="short-reel-card-header">
            <div className="short-reel-card-title-group">
              <h3 className="short-reel-card-title">Topic Concept</h3>
              <span className={`short-reel-tag ${isKeywordOrigin ? "short-reel-tag-origin-keyword" : "short-reel-tag-origin-discovery"}`}>
                Origin: {topic.origin}
              </span>
            </div>
          </div>

          <div className="short-reel-field">
            <span className="short-reel-field-label">Premise</span>
            <p className="short-reel-field-value">{topic.premise}</p>
          </div>

          <div className="short-reel-field">
            <span className="short-reel-field-label">Hook</span>
            <p className="short-reel-field-value">{topic.hook}</p>
          </div>
        </section>

        <ShortReelSourceCard source={source} />
      </main>

      {/* Deliverable Units Overview */}
      <section className="short-reel-card short-reel-units-section" aria-label="Creative Deliverables">
        <div className="short-reel-card-header">
          <h3 className="short-reel-card-title">Creative Deliverables Status</h3>
        </div>
        <div className="short-reel-units-grid">
          {(["references", "script", "cover", "publishing"] as const).map((unitKey) => {
            const unit = units[unitKey];
            const isReady = unit.state === "ready";
            const isPending = unit.state === "pending";
            const isStale = unit.state === "stale";
            const isFailed = unit.state === "failed";

            let stateClass = "short-reel-unit-state-missing";
            if (isReady) stateClass = "short-reel-unit-state-ready";
            if (isPending) stateClass = "short-reel-unit-state-pending";
            if (isStale) stateClass = "short-reel-unit-state-stale";
            if (isFailed) stateClass = "short-reel-unit-state-failed";

            return (
              <div key={unitKey} className="short-reel-unit-card">
                <span className="short-reel-unit-title">{unitKey}</span>
                <span className="short-reel-unit-status">
                  Status: <strong className={stateClass}>{unit.state}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Primary Studio Tabs: Script | Assets | Publishing */}
      <nav className="short-reel-nav-tabs" role="tablist" aria-label="Studio View Tabs">
        <button
          type="button"
          role="tab"
          aria-label="Script & Segments"
          aria-selected={activeTab === "script"}
          className={`short-reel-nav-tab ${activeTab === "script" ? "active" : ""}`}
          onClick={() => setActiveTab("script")}
        >
          <span>Script</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-label="Assets & Prompts"
          aria-selected={activeTab === "assets"}
          className={`short-reel-nav-tab ${activeTab === "assets" ? "active" : ""}`}
          onClick={() => setActiveTab("assets")}
        >
          <span>Assets</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-label="Publishing Metadata"
          aria-selected={activeTab === "publishing"}
          className={`short-reel-nav-tab ${activeTab === "publishing" ? "active" : ""}`}
          onClick={() => setActiveTab("publishing")}
        >
          <span>Publishing</span>
        </button>
      </nav>

      {/* Active Tab Panel */}
      <div className="short-reel-tab-panel">
        {activeTab === "script" && (
          <SegmentEditor
            segments={draftScript ?? reel.script?.segments ?? []}
            staleSegments={reel.stale_segments}
            isSaving={isSaving}
            onSaveSegment={saveSegment}
            onChangeSegmentDraft={setDraftScript}
            onGenerateScript={() => generate("script")}
            isGenerating={isGeneratingOrPending}
          />
        )}

        {activeTab === "assets" && (
          <ReelAssets
            reel={reel}
            onCopyText={copyText}
            onRegenerateUnit={(target) => generate(target)}
            isGenerating={isGeneratingOrPending}
          />
        )}

        {activeTab === "publishing" && (
          <PublishingPanel
            publishing={draftPublishing ?? units.publishing.last_accepted_payload}
            isSaving={isSaving}
            isGenerating={isGeneratingOrPending}
            onSavePublishing={savePublishing}
            onRegeneratePublishing={() => generate("publishing")}
            onCopyText={copyText}
            onChangeDraft={setDraftPublishing}
          />
        )}
      </div>

      {/* Selectable Fallback Modal for Clipboard Denial */}
      {clipboardFallbackText && (
        <div className="short-reel-modal-backdrop" role="dialog" aria-modal="true" aria-label="Manual Copy Fallback">
          <div className="short-reel-modal">
            <div className="short-reel-modal-header">
              <h3>Manual Copy Fallback</h3>
              <button type="button" className="short-reel-modal-close-btn" onClick={clearClipboardFallback} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>
            <div className="short-reel-modal-body">
              <p>Clipboard access was not permitted. You can select and copy the text below:</p>
              <textarea
                readOnly
                rows={6}
                className="short-reel-textarea short-reel-fallback-textarea"
                value={clipboardFallbackText}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="short-reel-modal-footer">
              <button type="button" className="short-reel-primary-btn" onClick={clearClipboardFallback}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

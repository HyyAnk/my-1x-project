import { useState } from "react";
import { X } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import type { Notice } from "../../components/types";
import { LoadingState } from "../../components/EmptyState";
import { ShortReelSourceCard } from "./components/ShortReelSourceCard";
import { SegmentEditor } from "./components/SegmentEditor";
import { ReelAssets } from "./components/ReelAssets";
import { PublishingPanel } from "./components/PublishingPanel";
import { ShortReelHeader } from "./components/ShortReelHeader";
import { ShortReelConflictBanner } from "./components/ShortReelConflictBanner";
import { ShortReelTopicCard } from "./components/ShortReelTopicCard";
import { ShortReelDeliverablesGrid } from "./components/ShortReelDeliverablesGrid";
import { ShortReelStateError } from "./components/ShortReelStateError";
import { ReelGenerationProgress } from "./components/ReelGenerationProgress";
import { useShortReel } from "./hooks/useShortReel";
import { canExportReel, getCleanTopicTitle, hasPendingGeneration } from "./utils/shortReelStudioRules";
import "./ShortReelStudio.css";

export interface ShortReelStudioProps {
  channel: Channel;
  reelId: string;
  onBack: () => void;
  onNotice: (notice: NonNullable<Notice>) => void;
}

type StudioTab = "script" | "assets" | "publishing";

const STUDIO_TABS: { key: StudioTab; label: string; ariaLabel: string }[] = [
  { key: "script", label: "Script", ariaLabel: "Script & Segments" },
  { key: "assets", label: "Assets", ariaLabel: "Assets & Prompts" },
  { key: "publishing", label: "Publishing", ariaLabel: "Publishing Metadata" },
];

function StudioTabNav({ activeTab, onSelectTab }: { activeTab: StudioTab; onSelectTab: (tab: StudioTab) => void }) {
  return (
    <nav className="short-reel-nav-tabs" role="tablist" aria-label="Studio View Tabs">
      {STUDIO_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-label={tab.ariaLabel}
          aria-selected={activeTab === tab.key}
          className={`short-reel-nav-tab ${activeTab === tab.key ? "active" : ""}`}
          onClick={() => onSelectTab(tab.key)}
        >
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

function ClipboardFallbackModal({ clipboardFallbackText, onClose }: { clipboardFallbackText: string; onClose: () => void }) {
  return (
    <div className="short-reel-modal-backdrop" role="dialog" aria-modal="true" aria-label="Manual Copy Fallback">
      <div className="short-reel-modal">
        <div className="short-reel-modal-header">
          <h3>Manual Copy Fallback</h3>
          <button type="button" className="short-reel-modal-close-btn" onClick={onClose} aria-label="Close dialog">
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
          <button type="button" className="short-reel-primary-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
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
    return <ShortReelStateError isNotFound={status === "not_found"} error={error} onBack={onBack} onRetry={retry} />;
  }

  const { topic, source, units, revision } = reel;
  const isAllReadyForExport = canExportReel(reel);
  const isGeneratingOrPending = hasPendingGeneration(reel, activeTask, isGenerating);
  const hasExistingDeliverables = Boolean(reel.script || units.references.last_accepted_payload || units.cover.last_accepted_payload);

  return (
    <div className="short-reel-studio">
      <ShortReelHeader
        channel={channel}
        reelId={reel.reel_id}
        cleanTitle={getCleanTopicTitle(topic.title)}
        revision={revision}
        sourceQuestionId={source.question_id}
        isDraftDirty={isDraftDirty}
        onBack={onBack}
        isGeneratingOrPending={isGeneratingOrPending}
        canExport={isAllReadyForExport}
        scriptMissing={!reel.script || units.script.state === "missing"}
        hasExistingDeliverables={hasExistingDeliverables}
        cancel={() => cancel()}
        generate={generate}
        exportPackage={exportPackage}
      />

      <ShortReelConflictBanner
        conflictRemoteRecord={conflictRemoteRecord}
        onKeepLocalDraft={keepLocalDraft}
        onDiscardDraftAndReload={discardDraftAndReload}
      />

      <ReelGenerationProgress
        isVisible={isGeneratingOrPending}
        activeStage={activeTask?.short_reel_progress?.stages?.find((s) => s.state === "running")?.stage}
        progressPercent={activeTask?.progress_percent ?? undefined}
        progressMessage={activeTask?.progress_message}
        stages={activeTask?.short_reel_progress?.stages}
      />

      <main className="short-reel-grid">
        <ShortReelTopicCard topic={topic} />
        <ShortReelSourceCard source={source} />
      </main>

      <ShortReelDeliverablesGrid units={units} />

      <StudioTabNav activeTab={activeTab} onSelectTab={setActiveTab} />

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
            channel={channel}
            onCopyText={copyText}
            onRegenerateUnit={(target) => generate(target)}
            isGenerating={isGeneratingOrPending}
            activeTask={activeTask}
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

      {clipboardFallbackText && <ClipboardFallbackModal clipboardFallbackText={clipboardFallbackText} onClose={clearClipboardFallback} />}
    </div>
  );
}

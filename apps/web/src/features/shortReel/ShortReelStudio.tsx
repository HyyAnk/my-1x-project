import { useState } from "react";
import type { Channel } from "@studio/shared";
import type { Notice } from "../../components/types";
import { LoadingState } from "../../components/EmptyState";
import { ShortReelBreadcrumb } from "../../components/Breadcrumbs";
import { useRouteTab } from "../../hooks/router/useRouteTab";
import { SegmentEditor } from "./components/SegmentEditor";
import { ReelAssets } from "./components/ReelAssets";
import { PublishingPanel } from "./components/PublishingPanel";
import { ShortReelHeader } from "./components/ShortReelHeader";
import { ShortReelConflictBanner } from "./components/ShortReelConflictBanner";
import { ShortReelTopicCard } from "./components/ShortReelTopicCard";
import { ShortReelSourceCard } from "./components/ShortReelSourceCard";
import { ShortReelDeliverablesGrid } from "./components/ShortReelDeliverablesGrid";
import { ShortReelStateError } from "./components/ShortReelStateError";
import { ReelGenerationProgress } from "./components/ReelGenerationProgress";
import { StudioTabNav, type StudioTab } from "./components/StudioTabNav";
import { ClipboardFallbackModal } from "./components/ClipboardFallbackModal";
import { useShortReel } from "./hooks/useShortReel";
import { canExportReel, getCleanTopicTitle, hasPendingGeneration } from "./utils/shortReelStudioRules";
import "./ShortReelStudio.css";

export interface ShortReelStudioProps {
  channel: Channel;
  reelId: string;
  onBack: () => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
  onNavigateChannel?: () => void;
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
}

export function ShortReelStudio({
  channel,
  reelId,
  onBack,
  onNotice,
  onNavigateHome,
  onNavigateChannels,
  onNavigateChannel,
  activeTab: routeTab,
  onTabChange,
}: ShortReelStudioProps) {
  const [activeTab, switchTab] = useRouteTab<StudioTab>({
    value: routeTab,
    allowedTabs: ["script", "assets", "publishing"] as const,
    fallback: "script",
    onChange: onTabChange,
  });

  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);

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
  } = useShortReel({ channelId: channel.channel_id, reelId, onNotice });

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
      {onNavigateHome ? (
        <ShortReelBreadcrumb
          channelName={channel.display_name}
          channelId={channel.channel_id}
          reelTitle={getCleanTopicTitle(topic.title)}
          onNavigateHome={onNavigateHome}
          onNavigateChannels={onNavigateChannels}
          onNavigateChannel={onNavigateChannel || onBack}
        />
      ) : null}

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

      <StudioTabNav activeTab={activeTab} onSelectTab={switchTab} />

      <div className="short-reel-tab-panel">
        {activeTab === "script" && (
          <SegmentEditor
            segments={draftScript ?? reel.script?.segments ?? []}
            staleSegments={reel.stale_segments}
            isSaving={isSaving}
            onSaveSegment={saveSegment}
            onChangeSegmentDraft={setDraftScript}
            onGenerateScript={() => generate("script", undefined, selectedSeedId ?? undefined)}
            isGenerating={isGeneratingOrPending}
            onCopyText={copyText}
            topic={topic}
            source={source}
            selectedSeedId={selectedSeedId}
            onSelectSeed={setSelectedSeedId}
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
            onNotice={onNotice}
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

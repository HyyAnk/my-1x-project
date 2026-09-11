import { useState } from "react";
import type { Channel } from "@studio/shared";
import type { Notice } from "../../components/types";
import { useSandboxChannelSync } from "./hooks/useSandboxChannelSync";
import { useSandboxDesignState } from "./hooks/useSandboxDesignState";
import { useSandboxMascotState } from "./hooks/useSandboxMascotState";
import { useSandboxBrandNameState } from "./hooks/useSandboxBrandNameState";
import { useSandboxPresets } from "./hooks/useSandboxPresets";
import { useSandboxPreviewRenderer } from "./hooks/useSandboxPreviewRenderer";
import { useSandboxQuestionState } from "./hooks/useSandboxQuestionState";
import { useSandboxTimelineState } from "./hooks/useSandboxTimelineState";
import { useSandboxViewportState } from "./hooks/useSandboxViewportState";
import { useSandboxLayoutSync } from "./hooks/useSandboxLayoutSync";
import { useSandboxTransitionState, type SandboxTransitionState } from "./hooks/useSandboxTransitionState";
import { PALETTES } from "./constants";
import { TransitionPreviewPlayer } from "../transitions/components/TransitionPreviewPlayer";
import type { TransitionAspectRatio } from "../transitions/types/transitionPreview.types";
import {
  SandboxChannelSyncModal,
  SandboxContentTab,
  SandboxDesignTab,
  SandboxHeader,
  SandboxInspectorTabs,
  type SandboxInspectorTabId,
  SandboxMascotTab,
  SandboxPresetModal,
  SandboxPresetSelector,
  SandboxPreviewCanvas,
  SandboxTransitionTab,
} from "./components";

export type { VisualPresetItem } from "./hooks/useSandboxPresets";
export type { SandboxTransitionState } from "./hooks/useSandboxTransitionState";
export type { SandboxInspectorTabId } from "./components/SandboxInspectorTabs";

export function VisualSandboxTab({
  channels = [],
  onNotice,
  onRefreshChannels,
}: {
  channels?: Channel[];
  onNotice?: (notice: NonNullable<Notice>) => void;
  onRefreshChannels?: () => Promise<void>;
}) {
  const [activeInspectorTab, setActiveInspectorTab] = useState<SandboxInspectorTabId>("design");

  const viewport = useSandboxViewportState();
  const design = useSandboxDesignState();
  const mascot = useSandboxMascotState();
  const brandName = useSandboxBrandNameState();
  const timeline = useSandboxTimelineState();
  const question = useSandboxQuestionState();
  const transition = useSandboxTransitionState();

  const { handleLayoutChange, handleApplyPresetQuestion } = useSandboxLayoutSync({
    design,
    question,
    viewport,
    mascot,
  });

  const preview = useSandboxPreviewRenderer({
    design,
    mascot,
    timeline,
    question,
    aspectRatio: viewport.aspectRatio,
    channelBrandName: brandName.channelBrandName,
    onNotice,
  });
  const presets = useSandboxPresets({
    design,
    mascot,
    brandName,
    transition,
    onNotice,
    onLayoutChange: handleLayoutChange,
  });
  const channelSync = useSandboxChannelSync({
    channels,
    design,
    mascot,
    transition,
    onNotice,
    onRefreshChannels,
  });

  const activePalette = PALETTES.find((p) => p.id === design.paletteId) ?? PALETTES[0];
  const themeColors = { from: activePalette.primary, to: activePalette.secondary };
  const isTransitionMode = activeInspectorTab === "transition" || transition.isTransitionActive;

  const handleTabChange = (tab: SandboxInspectorTabId) => {
    setActiveInspectorTab(tab);
    if (tab === "transition") {
      transition.triggerPlay();
    }
  };

  return (
    <section className="page-wrap visual-sandbox-page">
      <SandboxHeader
        hasChannels={channels.length > 0}
        loading={preview.loading}
        onOpenPresetModal={() => presets.setPresetModalOpen(true)}
        onOpenChannelSyncModal={() => channelSync.setChannelSyncOpen(true)}
        onRerender={() => void preview.renderPreview(true)}
      />

      <div className="visual-sandbox-workspace">
        <div
          className="panel visual-sandbox-inspector"
          style={{
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            padding: "16px",
            background: "var(--surface)",
            borderRadius: "16px",
            borderRight: "1px solid var(--line)",
          }}
        >
          <SandboxPresetSelector
            allPresets={presets.allPresets}
            builtInPresets={presets.builtInPresets}
            customPresets={presets.customPresets}
            matchedPreset={presets.matchedPreset}
            activeCustomPreset={presets.activeCustomPreset}
            loadedPresetId={presets.loadedPresetId}
            loadedPreset={presets.loadedPreset}
            canUpdateActivePreset={presets.canUpdateActivePreset}
            onLoadPreset={presets.handleLoadPreset}
            onOpenSaveModal={() => presets.setPresetModalOpen(true)}
            onDeleteCustomPreset={presets.handleDeleteCustomPreset}
            onUpdateActivePreset={presets.handleUpdateActivePreset}
            onDuplicatePreset={presets.handleDuplicateCustomPreset}
            onUpdateMetadata={presets.handleUpdatePresetMetadata}
            onRefreshPresets={presets.refreshPresets}
          />

          <SandboxInspectorTabs
            activeTab={activeInspectorTab}
            onTabChange={handleTabChange}
            mascotEnabled={mascot.mascotEnabled}
            mascotId={mascot.mascotId}
          />

          {activeInspectorTab === "design" && (
            <SandboxDesignTab
              aspectRatio={viewport.aspectRatio}
              layoutId={design.layoutId}
              setLayoutId={handleLayoutChange}
              paletteId={design.paletteId}
              setPaletteId={design.setPaletteId}
              thinkingBarStyle={design.thinkingBarStyle}
              setThinkingBarStyle={design.setThinkingBarStyle}
              questionBoxStyle={design.questionBoxStyle}
              setQuestionBoxStyle={design.setQuestionBoxStyle}
              answerCardStyle={design.answerCardStyle}
              setAnswerCardStyle={design.setAnswerCardStyle}
              counterStyle={design.counterStyle}
              setCounterStyle={design.setCounterStyle}
              backgroundStyle={design.backgroundStyle}
              setBackgroundStyle={design.setBackgroundStyle}
            />
          )}

          {activeInspectorTab === "mascot" && (
            <SandboxMascotTab
              mascots={mascot.mascots}
              mascotId={mascot.mascotId}
              setMascotId={mascot.setMascotId}
              mascotStyleId={mascot.mascotStyleId}
              setMascotStyleId={mascot.setMascotStyleId}
              availableStyles={mascot.availableStyles}
              activeStyle={mascot.activeStyle}
              selectedVariantIndex={mascot.selectedVariantIndex}
              setSelectedVariantIndex={mascot.setSelectedVariantIndex}
              mascotEnabled={mascot.mascotEnabled}
              setMascotEnabled={mascot.setMascotEnabled}
              channelBrandName={brandName.channelBrandName}
              setChannelBrandName={brandName.setChannelBrandName}
              mascotAction={mascot.mascotAction}
              setMascotAction={mascot.setMascotAction}
              mascotPosition={mascot.mascotPosition}
              setMascotPosition={mascot.setMascotPosition}
              mascotScale={mascot.mascotScale}
              setMascotScale={mascot.setMascotScale}
              mascotOffsetX={mascot.mascotOffsetX}
              setMascotOffsetX={mascot.setMascotOffsetX}
              mascotOffsetY={mascot.mascotOffsetY}
              setMascotOffsetY={mascot.setMascotOffsetY}
              mascotFlipX={mascot.mascotFlipX}
              setMascotFlipX={mascot.setMascotFlipX}
              resetToDefaultPlacement={mascot.resetToDefaultPlacement}
            />
          )}

          {activeInspectorTab === "content" && (
            <SandboxContentTab
              sampleQuestions={question.sampleQuestions}
              questionText={question.questionText}
              setQuestionText={question.setQuestionText}
              choices={question.choices}
              setChoices={question.setChoices}
              correctChoiceIndex={question.correctChoiceIndex}
              setCorrectChoiceIndex={question.setCorrectChoiceIndex}
              questionNumber={question.questionNumber}
              setQuestionNumber={question.setQuestionNumber}
              totalQuestions={question.totalQuestions}
              setTotalQuestions={question.setTotalQuestions}
              factCardText={question.factCardText}
              setFactCardText={question.setFactCardText}
              phase={timeline.phase}
              setPhase={timeline.handlePhaseChange}
              setUseScrubber={timeline.setUseScrubber}
              handleApplyPresetQuestion={handleApplyPresetQuestion}
              layoutId={design.layoutId}
              onLayoutChange={handleLayoutChange}
            />
          )}

          {activeInspectorTab === "transition" && <SandboxTransitionTab transition={transition} />}
        </div>

        {isTransitionMode ? (
          <div
            className="sandbox-transition-canvas-area"
            data-testid="sandbox-transition-canvas-area"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#060911",
              borderRadius: "16px",
              border: "1px solid var(--line)",
              padding: "24px",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "880px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <TransitionPreviewPlayer
                transitionType={transition.transitionId}
                durationSeconds={transition.transitionDuration}
                aspectRatio={viewport.aspectRatio}
                themeColors={themeColors}
                onDurationChange={transition.setTransitionDuration}
                onTransitionChange={transition.setTransitionId}
                progress={transition.transitionProgress}
                onProgressChange={transition.setTransitionProgress}
                isPlaying={transition.isPlaying}
                onPlayingChange={transition.setIsPlaying}
                isLooping={transition.isLooping}
                onLoopingChange={transition.setIsLooping}
                playTrigger={transition.playTrigger}
                onTogglePlay={transition.togglePlay}
                onReplay={transition.triggerPlay}
                onToggleLoop={transition.toggleLoop}
              />
            </div>
          </div>
        ) : (
          <SandboxPreviewCanvas
            containerRef={viewport.containerRef}
            contrastReport={preview.contrastReport}
            lastRenderTime={preview.lastRenderTime}
            showSafeArea={viewport.showSafeArea}
            setShowSafeArea={viewport.setShowSafeArea}
            showShortsGuide={viewport.showShortsGuide}
            setShowShortsGuide={viewport.setShowShortsGuide}
            aspectRatio="16:9"
            iframeKey={preview.iframeKey}
            setIframeKey={preview.setIframeKey}
            zoom={viewport.zoom}
            setZoom={viewport.setZoom}
            scaleFactor={viewport.scaleFactor}
            previewHtml={preview.previewHtml}
            pendingPreviewHtml={preview.pendingPreviewHtml}
            loading={preview.loading}
            previewError={preview.previewError}
            onPendingPreviewLoad={preview.verifyPendingPreview}
            onRetryPreview={() => void preview.renderPreview()}
            phase={timeline.phase}
            useScrubber={timeline.useScrubber}
            timelineSeconds={timeline.timelineSeconds}
            handlePhaseChange={timeline.handlePhaseChange}
            isPlaying={timeline.isPlaying}
            setIsPlaying={timeline.setIsPlaying}
            handleTogglePlay={timeline.handleTogglePlay}
            setUseScrubber={timeline.setUseScrubber}
            handleScrubberChange={timeline.handleScrubberChange}
            iframeRef={timeline.iframeRef}
            isMuted={timeline.isMuted}
            onToggleMute={timeline.toggleMute}
            totalDuration={timeline.totalDuration}
          />
        )}
      </div>

      <SandboxPresetModal
        isOpen={presets.presetModalOpen}
        onClose={() => presets.setPresetModalOpen(false)}
        presetName={presets.newPresetName}
        onChangePresetName={presets.setNewPresetName}
        onSave={presets.handleSaveCustomPreset}
      />

      <SandboxChannelSyncModal
        isOpen={channelSync.channelSyncOpen}
        onClose={() => channelSync.setChannelSyncOpen(false)}
        channels={channels}
        selectedChannelId={channelSync.selectedChannelId}
        setSelectedChannelId={channelSync.setSelectedChannelId}
        mascotId={mascot.mascotId}
        activeMascot={mascot.activeMascot}
        syncMascotToChannel={channelSync.syncMascotToChannel}
        setSyncMascotToChannel={channelSync.setSyncMascotToChannel}
        layoutId={design.layoutId}
        paletteId={design.paletteId}
        thinkingBarStyle={design.thinkingBarStyle}
        questionBoxStyle={design.questionBoxStyle}
        answerCardStyle={design.answerCardStyle}
        counterStyle={design.counterStyle}
        backgroundStyle={design.backgroundStyle}
        mascotPosition={mascot.mascotPosition}
        mascotScale={mascot.mascotScale}
        savingChannel={channelSync.savingChannel}
        onApply={channelSync.handleApplyToChannel}
      />
    </section>
  );
}

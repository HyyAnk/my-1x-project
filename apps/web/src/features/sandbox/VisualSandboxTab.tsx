import { useState } from "react";
import type { Channel } from "@studio/shared";
import type { Notice } from "../../components/types";
import { useTranslation } from "../../i18n";
import { useSandboxChannelSync } from "./hooks/useSandboxChannelSync";
import { useSandboxDesignState } from "./hooks/useSandboxDesignState";
import { useSandboxMascotState } from "./hooks/useSandboxMascotState";
import { useSandboxPresets } from "./hooks/useSandboxPresets";
import { useSandboxPreviewRenderer } from "./hooks/useSandboxPreviewRenderer";
import { useSandboxQuestionState } from "./hooks/useSandboxQuestionState";
import { useSandboxTimelineState } from "./hooks/useSandboxTimelineState";
import { useSandboxViewportState } from "./hooks/useSandboxViewportState";
import {
  SandboxChannelSyncModal,
  SandboxContentTab,
  SandboxDesignTab,
  SandboxHeader,
  SandboxInspectorTabs,
  SandboxMascotTab,
  SandboxPresetModal,
  SandboxPresetSelector,
  SandboxPreviewCanvas,
} from "./components";

export type { VisualPresetItem } from "./hooks/useSandboxPresets";

export function VisualSandboxTab({
  channels = [],
  onNotice,
  onRefreshChannels,
}: {
  channels?: Channel[];
  onNotice?: (notice: NonNullable<Notice>) => void;
  onRefreshChannels?: () => Promise<void>;
}) {
  const { language } = useTranslation();
  const [activeInspectorTab, setActiveInspectorTab] = useState<"design" | "mascot" | "content">("design");

  const design = useSandboxDesignState();
  const mascot = useSandboxMascotState();
  const timeline = useSandboxTimelineState();
  const question = useSandboxQuestionState(language);
  const viewport = useSandboxViewportState();
  const preview = useSandboxPreviewRenderer({ design, mascot, timeline, question, aspectRatio: viewport.aspectRatio, onNotice });
  const presets = useSandboxPresets({ design, mascot, onNotice });
  const channelSync = useSandboxChannelSync({ channels, design, mascot, onNotice, onRefreshChannels });

  return (
    <section
      className="page-wrap visual-sandbox-page"
      style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      {/* 1. Top Header Bar */}
      <SandboxHeader
        hasChannels={channels.length > 0}
        loading={preview.loading}
        onOpenPresetModal={() => presets.setPresetModalOpen(true)}
        onOpenChannelSyncModal={() => channelSync.setChannelSyncOpen(true)}
        onRerender={() => void preview.renderPreview(true)}
      />

      {/* 2. Main Studio Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "450px 1fr", gap: "16px", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Left Inspector Panel */}
        <div
          className="panel"
          style={{
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            padding: "16px",
            background: "var(--surface)",
            borderRadius: "16px",
            border: "1px solid var(--line)",
          }}
        >
          {/* Style Presets Dropdown & Quick Actions */}
          <SandboxPresetSelector
            allPresets={presets.allPresets}
            builtInPresets={presets.builtInPresets}
            customPresets={presets.customPresets}
            matchedPreset={presets.matchedPreset}
            activeCustomPreset={presets.activeCustomPreset}
            onLoadPreset={presets.handleLoadPreset}
            onOpenSaveModal={() => presets.setPresetModalOpen(true)}
            onDeleteCustomPreset={presets.handleDeleteCustomPreset}
          />

          {/* 3-Tab Inspector Switcher */}
          <SandboxInspectorTabs
            activeTab={activeInspectorTab}
            onTabChange={setActiveInspectorTab}
            mascotEnabled={mascot.mascotEnabled}
            mascotId={mascot.mascotId}
          />

          {/* Tab Content Panels */}
          {activeInspectorTab === "design" && (
            <SandboxDesignTab
              layoutId={design.layoutId}
              setLayoutId={design.setLayoutId}
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
            />
          )}

          {activeInspectorTab === "mascot" && (
            <SandboxMascotTab
              mascots={mascot.mascots}
              mascotId={mascot.mascotId}
              setMascotId={mascot.setMascotId}
              mascotEnabled={mascot.mascotEnabled}
              setMascotEnabled={mascot.setMascotEnabled}
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
              setPhase={timeline.setPhase}
              setUseScrubber={timeline.setUseScrubber}
              handleApplyPresetQuestion={question.handleApplyPresetQuestion}
            />
          )}
        </div>

        {/* Right Canvas & Timeline Studio */}
        <SandboxPreviewCanvas
          containerRef={viewport.containerRef}
          contrastReport={preview.contrastReport}
          lastRenderTime={preview.lastRenderTime}
          showSafeArea={viewport.showSafeArea}
          setShowSafeArea={viewport.setShowSafeArea}
          showShortsGuide={viewport.showShortsGuide}
          setShowShortsGuide={viewport.setShowShortsGuide}
          aspectRatio={viewport.aspectRatio}
          setAspectRatio={viewport.setAspectRatio}
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
          setUseScrubber={timeline.setUseScrubber}
          handleScrubberChange={timeline.handleScrubberChange}
        />
      </div>

      {/* Save Preset Modal Dialog */}
      <SandboxPresetModal
        isOpen={presets.presetModalOpen}
        onClose={() => presets.setPresetModalOpen(false)}
        presetName={presets.newPresetName}
        onChangePresetName={presets.setNewPresetName}
        onSave={presets.handleSaveCustomPreset}
      />

      {/* Apply to Channel Modal Dialog */}
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
        mascotPosition={mascot.mascotPosition}
        mascotScale={mascot.mascotScale}
        savingChannel={channelSync.savingChannel}
        onApply={channelSync.handleApplyToChannel}
      />
    </section>
  );
}

import type { QuizPreviewLayoutId } from "@studio/shared";
import type { PresetSampleQuestion } from "../hooks/useSandboxQuestionState";
import type { useSandboxPresets } from "../hooks/useSandboxPresets";
import type { useSandboxViewportState } from "../hooks/useSandboxViewportState";
import type { useSandboxDesignState } from "../hooks/useSandboxDesignState";
import type { useSandboxMascotState } from "../hooks/useSandboxMascotState";
import type { useSandboxBrandNameState } from "../hooks/useSandboxBrandNameState";
import type { useSandboxQuestionState } from "../hooks/useSandboxQuestionState";
import type { useSandboxTimelineState } from "../hooks/useSandboxTimelineState";
import type { useSandboxTransitionState } from "../hooks/useSandboxTransitionState";
import { SandboxPresetSelector } from "./SandboxPresetSelector";
import { SandboxInspectorTabs, type SandboxInspectorTabId } from "./SandboxInspectorTabs";
import { SandboxDesignTab } from "./SandboxDesignTab";
import { SandboxMascotTab } from "./SandboxMascotTab";
import { SandboxContentTab } from "./SandboxContentTab";
import { SandboxTransitionTab } from "./transition";

export interface SandboxInspectorContainerProps {
  activeInspectorTab: SandboxInspectorTabId;
  onTabChange: (tab: SandboxInspectorTabId) => void;
  presets: ReturnType<typeof useSandboxPresets>;
  viewport: ReturnType<typeof useSandboxViewportState>;
  design: ReturnType<typeof useSandboxDesignState>;
  mascot: ReturnType<typeof useSandboxMascotState>;
  brandName: ReturnType<typeof useSandboxBrandNameState>;
  question: ReturnType<typeof useSandboxQuestionState>;
  timeline: ReturnType<typeof useSandboxTimelineState>;
  transition: ReturnType<typeof useSandboxTransitionState>;
  onLayoutChange: (layoutId: QuizPreviewLayoutId) => void;
  onApplyPresetQuestion: (sample: PresetSampleQuestion) => void;
}

export function SandboxInspectorContainer({
  activeInspectorTab,
  onTabChange,
  presets,
  viewport,
  design,
  mascot,
  brandName,
  question,
  timeline,
  transition,
  onLayoutChange,
  onApplyPresetQuestion,
}: SandboxInspectorContainerProps) {
  return (
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
        onTabChange={onTabChange}
        mascotEnabled={mascot.mascotEnabled}
        mascotId={mascot.mascotId}
      />

      {activeInspectorTab === "design" && (
        <SandboxDesignTab
          aspectRatio={viewport.aspectRatio}
          layoutId={design.layoutId}
          setLayoutId={onLayoutChange}
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
          handleApplyPresetQuestion={onApplyPresetQuestion}
          layoutId={design.layoutId}
          onLayoutChange={onLayoutChange}
        />
      )}

      {activeInspectorTab === "transition" && <SandboxTransitionTab transition={transition} />}
    </div>
  );
}

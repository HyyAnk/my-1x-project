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
import {
  SandboxCanvasArea,
  SandboxHeader,
  SandboxInspectorContainer,
  type SandboxInspectorTabId,
  SandboxModalsContainer,
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
        <SandboxInspectorContainer
          activeInspectorTab={activeInspectorTab}
          onTabChange={handleTabChange}
          presets={presets}
          viewport={viewport}
          design={design}
          mascot={mascot}
          brandName={brandName}
          question={question}
          timeline={timeline}
          transition={transition}
          onLayoutChange={handleLayoutChange}
          onApplyPresetQuestion={handleApplyPresetQuestion}
        />

        <SandboxCanvasArea
          isTransitionMode={isTransitionMode}
          transition={transition}
          viewport={viewport}
          preview={preview}
          timeline={timeline}
          themeColors={themeColors}
        />
      </div>

      <SandboxModalsContainer
        channels={channels}
        presets={presets}
        channelSync={channelSync}
        mascot={mascot}
        design={design}
      />
    </section>
  );
}

import type { Channel } from "@studio/shared";
import type { Notice } from "../../components/types";
import { useRouteTab } from "../../hooks/router/useRouteTab";
import { useSandboxChannelSync } from "./hooks/useSandboxChannelSync";
import { useSandboxDesignState } from "./hooks/useSandboxDesignState";
import { useSandboxMascotState } from "./hooks/useSandboxMascotState";
import { useSandboxStageSource } from "./hooks/useSandboxStageSource";
import { useSandboxBrandNameState } from "./hooks/useSandboxBrandNameState";
import { useSandboxPresets } from "./hooks/useSandboxPresets";
import { useSandboxPreviewRenderer } from "./hooks/useSandboxPreviewRenderer";
import { useSandboxQuestionState } from "./hooks/useSandboxQuestionState";
import { useSandboxTimelineState } from "./hooks/useSandboxTimelineState";
import { useSandboxViewportState } from "./hooks/useSandboxViewportState";
import { useSandboxLayoutSync } from "./hooks/useSandboxLayoutSync";
import { useSandboxTransitionState } from "./hooks/useSandboxTransitionState";
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
  activeTab,
  onTabChange,
}: {
  channels?: Channel[];
  onNotice?: (notice: NonNullable<Notice>) => void;
  onRefreshChannels?: () => Promise<void>;
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
}) {
  const [activeInspectorTab, setActiveInspectorTab] = useRouteTab({
    value: activeTab,
    allowedTabs: ["design", "mascot", "content", "transition"] as const,
    fallback: "design",
    onChange: onTabChange,
  });

  const viewport = useSandboxViewportState();
  const design = useSandboxDesignState();
  const mascotDraft = useSandboxMascotState();
  const stageSource = useSandboxStageSource(mascotDraft, channels);
  const mascot = stageSource.mascot;
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
    stageChannelId: stageSource.channelId,
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
    channels: stageSource.channels,
    design,
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
        hasChannels={stageSource.channels.length > 0}
        loading={preview.loading}
        onOpenPresetModal={() => presets.setPresetModalOpen(true)}
        onOpenChannelSyncModal={() => channelSync.setChannelSyncOpen(true)}
        onRerender={() => void preview.renderPreview(true)}
      />

      <div style={{ minWidth: 0, marginBottom: 12 }}>
        <label style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          Stage Studio source
          <select
            style={{
              width: "100%",
              maxWidth: 450,
              minHeight: 36,
              borderRadius: 8,
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--line)",
              padding: "6px 10px",
            }}
            className="select-input"
            value={stageSource.channelId}
            onChange={(event) => stageSource.setChannelId(event.target.value)}
          >
            <option value="">Stage Studio default</option>
            {stageSource.channels.map((channel) => (
              <option key={channel.channel_id} value={channel.channel_id}>
                {channel.display_name}
              </option>
            ))}
          </select>
        </label>
        {stageSource.error ? (
          <p role="alert">
            {stageSource.error}{" "}
            <button type="button" onClick={() => void stageSource.refresh()}>
              Retry
            </button>
          </p>
        ) : (
          !stageSource.ready && <p role="status">Loading Stage Studio placement</p>
        )}
      </div>
      <div className="visual-sandbox-workspace">
        <SandboxInspectorContainer
          stageAssignmentLocked={Boolean(stageSource.channelId)}
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

      <SandboxModalsContainer channels={stageSource.channels} presets={presets} channelSync={channelSync} design={design} />
    </section>
  );
}

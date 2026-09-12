import type { Channel } from "@studio/shared";
import type { useSandboxPresets } from "../hooks/useSandboxPresets";
import type { useSandboxChannelSync } from "../hooks/useSandboxChannelSync";
import type { useSandboxMascotState } from "../hooks/useSandboxMascotState";
import type { useSandboxDesignState } from "../hooks/useSandboxDesignState";
import { SandboxPresetModal } from "./SandboxPresetModal";
import { SandboxChannelSyncModal } from "./SandboxChannelSyncModal";

export interface SandboxModalsContainerProps {
  channels?: Channel[];
  presets: ReturnType<typeof useSandboxPresets>;
  channelSync: ReturnType<typeof useSandboxChannelSync>;
  mascot: ReturnType<typeof useSandboxMascotState>;
  design: ReturnType<typeof useSandboxDesignState>;
}

export function SandboxModalsContainer({
  channels = [],
  presets,
  channelSync,
  mascot,
  design,
}: SandboxModalsContainerProps) {
  return (
    <>
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
    </>
  );
}

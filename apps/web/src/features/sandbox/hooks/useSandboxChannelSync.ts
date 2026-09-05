import { useState } from "react";
import {
  type Channel,
  type ChannelMascotConfig,
  type MascotPlacementPreset,
  RECOMMENDED_MASCOT_PLACEMENT_PRESETS,
  resolveChannelMascotPlacement,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { StageAspectRatio } from "../../stageStudio/types";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";

type UseSandboxChannelSyncInput = {
  channels: Channel[];
  design: Pick<
    SandboxDesignState,
    "thinkingBarStyle" | "questionBoxStyle" | "answerCardStyle" | "counterStyle" | "backgroundStyle" | "paletteId"
  >;
  mascot: Pick<
    SandboxMascotState,
    "mascotId" | "mascotEnabled" | "mascotPosition" | "mascotScale" | "mascotOffsetX" | "mascotOffsetY" | "mascotFlipX"
  >;
  aspectRatio?: StageAspectRatio;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onRefreshChannels?: () => Promise<void>;
};

export function useSandboxChannelSync({
  channels,
  design,
  mascot,
  aspectRatio = "16:9",
  onNotice,
  onRefreshChannels,
}: UseSandboxChannelSyncInput) {
  const { t } = useTranslation();
  const [channelSyncOpen, setChannelSyncOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState(channels[0]?.channel_id || "");
  const [syncMascotToChannel, setSyncMascotToChannel] = useState(true);
  const [savingChannel, setSavingChannel] = useState(false);

  const handleApplyToChannel = async () => {
    if (!selectedChannelId) return;
    const targetChannel = channels.find((channel) => channel.channel_id === selectedChannelId);
    if (!targetChannel) return;

    setSavingChannel(true);
    try {
      await api.updateChannel(selectedChannelId, {
        default_thinking_bar_style: design.thinkingBarStyle,
        default_question_box_style: design.questionBoxStyle,
        default_answer_card_style: design.answerCardStyle,
        default_counter_style: design.counterStyle,
        default_background_style: design.backgroundStyle,
        default_palette_id: design.paletteId,
      });

      if (syncMascotToChannel && mascot.mascotId) {
        if (mascot.mascotId === "none") {
          await api.assignMascotToChannel(selectedChannelId, { mascot_id: null, config: { enabled: false } });
        } else {
          const activeAspect = aspectRatio ?? "16:9";
          const otherAspect: StageAspectRatio = activeAspect === "16:9" ? "9:16" : "16:9";

          const activePlacement: MascotPlacementPreset = {
            position: mascot.mascotPosition,
            scale: mascot.mascotScale,
            offset_x: mascot.mascotOffsetX,
            offset_y: mascot.mascotOffsetY,
            flip_x: mascot.mascotFlipX,
          };

          const otherPlacement: MascotPlacementPreset =
            targetChannel.mascot_config
              ? resolveChannelMascotPlacement(targetChannel.mascot_config, otherAspect)
              : RECOMMENDED_MASCOT_PLACEMENT_PRESETS[otherAspect];

          const placements: Record<StageAspectRatio, MascotPlacementPreset> = {
            [activeAspect]: activePlacement,
            [otherAspect]: otherPlacement,
          } as Record<StageAspectRatio, MascotPlacementPreset>;

          const config: ChannelMascotConfig = {
            enabled: mascot.mascotEnabled,
            position: placements["16:9"].position,
            scale: placements["16:9"].scale,
            offset_x: placements["16:9"].offset_x,
            offset_y: placements["16:9"].offset_y,
            flip_x: placements["16:9"].flip_x,
            show_in_intro: targetChannel.mascot_config?.show_in_intro ?? false,
            show_in_outro: targetChannel.mascot_config?.show_in_outro ?? false,
            show_in_question: true,
            placements,
          };

          await api.assignMascotToChannel(selectedChannelId, {
            mascot_id: mascot.mascotId,
            config,
          });
        }
      }

      if (onRefreshChannels) await onRefreshChannels();
      setChannelSyncOpen(false);
      if (onNotice) {
        onNotice({ tone: "good", message: t("visualSandbox.noticeAppliedToChannel", { name: targetChannel.display_name }) });
      }
    } catch (error) {
      if (onNotice) {
        onNotice({ tone: "bad", message: error instanceof Error ? error.message : t("visualSandbox.noticeSaveError") });
      }
    } finally {
      setSavingChannel(false);
    }
  };

  return {
    channelSyncOpen,
    setChannelSyncOpen,
    selectedChannelId,
    setSelectedChannelId,
    syncMascotToChannel,
    setSyncMascotToChannel,
    savingChannel,
    handleApplyToChannel,
  };
}

export type SandboxChannelSyncState = ReturnType<typeof useSandboxChannelSync>;

import { useState } from "react";
import type { Channel } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";

type UseSandboxChannelSyncInput = {
  channels: Channel[];
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onRefreshChannels?: () => Promise<void>;
};

export function useSandboxChannelSync({ channels, design, mascot, onNotice, onRefreshChannels }: UseSandboxChannelSyncInput) {
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
        default_palette_id: design.paletteId,
      });

      if (syncMascotToChannel && mascot.mascotId) {
        if (mascot.mascotId === "none") {
          await api.assignMascotToChannel(selectedChannelId, { mascot_id: null, config: { enabled: false } });
        } else {
          await api.assignMascotToChannel(selectedChannelId, {
            mascot_id: mascot.mascotId,
            config: {
              enabled: mascot.mascotEnabled,
              position: mascot.mascotPosition,
              scale: mascot.mascotScale,
              offset_x: mascot.mascotOffsetX,
              offset_y: mascot.mascotOffsetY,
              flip_x: mascot.mascotFlipX,
              show_in_question: true,
            },
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

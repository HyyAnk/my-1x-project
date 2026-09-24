import { useEffect, useState } from "react";
import { type Channel } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxTransitionState } from "./useSandboxTransitionState";

type UseSandboxChannelSyncInput = {
  channels: Channel[];
  design: Pick<
    SandboxDesignState,
    "thinkingBarStyle" | "questionBoxStyle" | "answerCardStyle" | "counterStyle" | "backgroundStyle" | "paletteId"
  >;
  transition?: Pick<SandboxTransitionState, "syncFromChannel">;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onRefreshChannels?: () => Promise<void>;
};

export function useSandboxChannelSync({ channels, design, transition, onNotice, onRefreshChannels }: UseSandboxChannelSyncInput) {
  const { t } = useTranslation();
  const [channelSyncOpen, setChannelSyncOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState(channels[0]?.channel_id || "");
  const [savingChannel, setSavingChannel] = useState(false);

  useEffect(() => {
    if (!selectedChannelId) return;
    const targetChannel = channels.find((channel) => channel.channel_id === selectedChannelId);
    if (targetChannel && transition?.syncFromChannel) {
      transition.syncFromChannel(targetChannel);
    }
  }, [selectedChannelId, channels, transition]);

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
    savingChannel,
    handleApplyToChannel,
  };
}

export type SandboxChannelSyncState = ReturnType<typeof useSandboxChannelSync>;

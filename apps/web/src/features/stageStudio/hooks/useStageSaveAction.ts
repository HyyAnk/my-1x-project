import { useState } from "react";
import type { Channel, MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import type { StagePosition } from "../types";

export function useStageSaveAction(options: {
  isSingleChannelMode: boolean;
  targetChannel: Channel | null;
  selectedMascotId: string | null;
  activeMascot: MascotProfile | null;
  channels: Channel[];
  selectedChannelIds: string[];
  position: StagePosition;
  scale: number;
  offsetX: number;
  offsetY: number;
  flipHorizontal: boolean;
  showInIntro: boolean;
  showInOutro: boolean;
  showInQuestion: boolean;
  onNotice: (notice: NonNullable<Notice>) => void;
  onSaved: () => Promise<void>;
  onClose: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const {
    isSingleChannelMode,
    targetChannel,
    selectedMascotId,
    activeMascot,
    channels,
    selectedChannelIds,
    position,
    scale,
    offsetX,
    offsetY,
    flipHorizontal,
    showInIntro,
    showInOutro,
    showInQuestion,
    onNotice,
    onSaved,
    onClose,
    t,
  } = options;

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const mascotConfig = {
        enabled: true,
        position,
        scale,
        offset_x: offsetX,
        offset_y: offsetY,
        flip_x: flipHorizontal,
        show_in_intro: showInIntro,
        show_in_outro: showInOutro,
        show_in_question: showInQuestion,
      };

      if (isSingleChannelMode && targetChannel) {
        await api.assignMascotToChannel(targetChannel.channel_id, {
          mascot_id: selectedMascotId,
          config: mascotConfig,
        });
        onNotice({
          tone: "good",
          message: selectedMascotId
            ? t("stageStudio.noticeSaveSuccessSingle", {
                name: targetChannel.display_name || targetChannel.slug,
              })
            : t("stageStudio.noticeUnassignedSingle"),
        });
      } else if (activeMascot) {
        const promises = channels
          .map((ch) => {
            const isAssigned = selectedChannelIds.includes(ch.channel_id);
            if (isAssigned) {
              return api.assignMascotToChannel(ch.channel_id, {
                mascot_id: activeMascot.id,
                config: mascotConfig,
              });
            } else if (!isAssigned && ch.mascot_id === activeMascot.id) {
              return api.assignMascotToChannel(ch.channel_id, {
                mascot_id: null,
              });
            }
            return null;
          })
          .filter((p): p is Promise<{ channel: Channel }> => p !== null);

        if (promises.length > 0) {
          await Promise.all(promises);
        }
        onNotice({
          tone: "good",
          message: t("stageStudio.noticeSaveSuccessMulti"),
        });
      }

      await onSaved();
      onClose();
    } catch (err) {
      onNotice({
        tone: "bad",
        message: err instanceof Error ? err.message : t("stageStudio.noticeSaveFailed"),
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    handleSave,
  };
}

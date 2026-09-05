import { useState } from "react";
import {
  type Channel,
  type ChannelMascotConfig,
  type MascotPlacementPreset,
  type MascotProfile,
  RECOMMENDED_MASCOT_PLACEMENT_PRESETS,
  resolveChannelMascotPlacement,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import type { StageAspectRatio, StagePosition } from "../types";

export interface BuildDecoupledChannelMascotConfigParams {
  aspectRatio: StageAspectRatio;
  activePlacement: MascotPlacementPreset;
  placements?: Partial<Record<StageAspectRatio, MascotPlacementPreset>> | null;
  channel?: Channel | null;
  showInIntro?: boolean;
  showInOutro?: boolean;
  showInQuestion?: boolean;
}

/**
 * Builds a ChannelMascotConfig ensuring active and other aspect ratio placements
 * remain strictly isolated without fallbacks crossing between 16:9 and 9:16.
 */
export function buildDecoupledChannelMascotConfig({
  aspectRatio,
  activePlacement,
  placements,
  channel,
  showInIntro = false,
  showInOutro = false,
  showInQuestion = true,
}: BuildDecoupledChannelMascotConfigParams): ChannelMascotConfig {
  const activeAspect = aspectRatio ?? "16:9";
  const otherAspect: StageAspectRatio = activeAspect === "16:9" ? "9:16" : "16:9";

  const otherPlacement =
    placements?.[otherAspect] ??
    (channel?.mascot_config
      ? resolveChannelMascotPlacement(channel.mascot_config, otherAspect)
      : RECOMMENDED_MASCOT_PLACEMENT_PRESETS[otherAspect]);

  const resolvedPlacements: Record<StageAspectRatio, MascotPlacementPreset> = {
    [activeAspect]: { ...activePlacement },
    [otherAspect]: { ...otherPlacement },
  } as Record<StageAspectRatio, MascotPlacementPreset>;

  return {
    enabled: true,
    position: resolvedPlacements["16:9"].position,
    scale: resolvedPlacements["16:9"].scale,
    offset_x: resolvedPlacements["16:9"].offset_x,
    offset_y: resolvedPlacements["16:9"].offset_y,
    flip_x: resolvedPlacements["16:9"].flip_x,
    show_in_intro: showInIntro,
    show_in_outro: showInOutro,
    show_in_question: showInQuestion,
    placements: resolvedPlacements,
  };
}

export function useStageSaveAction(options: {
  aspectRatio?: StageAspectRatio;
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
  placements?: Record<StageAspectRatio, MascotPlacementPreset>;
  showInIntro: boolean;
  showInOutro: boolean;
  showInQuestion: boolean;
  onNotice: (notice: NonNullable<Notice>) => void;
  onSaved: () => Promise<void>;
  onClose: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const {
    aspectRatio = "16:9",
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
    placements,
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
      const activePlacement: MascotPlacementPreset = {
        position,
        scale,
        offset_x: offsetX,
        offset_y: offsetY,
        flip_x: flipHorizontal,
      };

      const createConfig = (ch: Channel | null) =>
        buildDecoupledChannelMascotConfig({
          aspectRatio,
          activePlacement,
          placements,
          channel: ch,
          showInIntro,
          showInOutro,
          showInQuestion,
        });

      if (isSingleChannelMode && targetChannel) {
        await api.assignMascotToChannel(targetChannel.channel_id, {
          mascot_id: selectedMascotId,
          config: createConfig(targetChannel),
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
                config: createConfig(ch),
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

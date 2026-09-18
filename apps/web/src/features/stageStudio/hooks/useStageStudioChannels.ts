import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Channel, type MascotPlacementPreset, type MascotProfile, resolveChannelMascotPlacement } from "@studio/shared";
import type { StageAspectRatio, StageQuestionLayout } from "../types";
import { useStageChannelFilter } from "./useStageChannelFilter";
import { resolveInitialStageQuestionLayout } from "../questionLayouts";

export interface UseStageStudioChannelsOptions {
  isOpen: boolean;
  singleChannelId?: string;
  mascot?: MascotProfile | null;
  channels: Channel[];
  allMascots?: MascotProfile[];
  aspectRatio: StageAspectRatio;
  presetReady: boolean;
  defaultPlacements: Record<StageAspectRatio, MascotPlacementPreset>;
  initPlacements: (placements: Record<StageAspectRatio, MascotPlacementPreset>) => void;
  setShowInIntro: (show: boolean) => void;
  setShowInOutro: (show: boolean) => void;
  setShowInQuestion: (show: boolean) => void;
  setQuestionLayoutId: (layoutId: StageQuestionLayout) => void;
}

export function useStageStudioChannels({
  isOpen,
  singleChannelId,
  mascot,
  channels,
  allMascots = [],
  aspectRatio,
  presetReady,
  defaultPlacements,
  initPlacements,
  setShowInIntro,
  setShowInOutro,
  setShowInQuestion,
  setQuestionLayoutId,
}: UseStageStudioChannelsOptions) {
  const isSingleChannelMode = Boolean(singleChannelId);
  const targetChannel = useMemo(
    () => (singleChannelId ? channels.find((c) => c.channel_id === singleChannelId) || null : null),
    [channels, singleChannelId],
  );

  const rawTargetChannel = targetChannel as unknown as { layout_id?: string } | null;
  const channelAspectRatio: StageAspectRatio = "16:9";

  const [selectedMascotId, setSelectedMascotId] = useState<string | null>(null);
  const channelFilter = useStageChannelFilter();
  const initializedForOpenRef = useRef(false);

  const selectMascot = useCallback(
    (mascotId: string | null) => {
      setSelectedMascotId(mascotId);
      if (isSingleChannelMode) {
        if (mascotId && mascotId === targetChannel?.mascot_id && targetChannel?.mascot_config) {
          initPlacements({
            "16:9": resolveChannelMascotPlacement(targetChannel.mascot_config, "16:9"),
          });
          setShowInIntro(targetChannel.mascot_config.show_in_intro ?? false);
          setShowInOutro(targetChannel.mascot_config.show_in_outro ?? false);
          setShowInQuestion(targetChannel.mascot_config.show_in_question ?? true);
        } else if (mascotId && mascotId !== targetChannel?.mascot_id) {
          initPlacements({ "16:9": defaultPlacements["16:9"] });
        }
      }
    },
    [defaultPlacements, initPlacements, isSingleChannelMode, setShowInIntro, setShowInOutro, setShowInQuestion, targetChannel],
  );

  useEffect(() => {
    if (!isOpen) {
      initializedForOpenRef.current = false;
      return;
    }
    if (!presetReady || initializedForOpenRef.current) return;

    const rawLayoutId = rawTargetChannel?.layout_id;
    if (isSingleChannelMode && targetChannel) {
      setQuestionLayoutId(resolveInitialStageQuestionLayout(rawLayoutId, channelAspectRatio));
    } else {
      setQuestionLayoutId(resolveInitialStageQuestionLayout(rawLayoutId, aspectRatio));
    }

    if (isSingleChannelMode && targetChannel) {
      const assignedId = targetChannel.mascot_id || (allMascots.length > 0 ? allMascots[0].id : null);
      setSelectedMascotId(assignedId);
      if (targetChannel.mascot_id && targetChannel.mascot_config) {
        initPlacements({
          "16:9": resolveChannelMascotPlacement(targetChannel.mascot_config, "16:9"),
        });
        setShowInIntro(targetChannel.mascot_config.show_in_intro ?? false);
        setShowInOutro(targetChannel.mascot_config.show_in_outro ?? false);
        setShowInQuestion(targetChannel.mascot_config.show_in_question ?? true);
      } else {
        initPlacements({ "16:9": defaultPlacements["16:9"] });
        setShowInIntro(false);
        setShowInOutro(false);
        setShowInQuestion(true);
      }
    } else if (mascot) {
      setSelectedMascotId(mascot.id);
      channelFilter.setSelectedChannelIds(mascot.assigned_channel_ids || []);
      const sample = channels.find((c) => c.mascot_id === mascot.id);
      if (sample?.mascot_config) {
        initPlacements({
          "16:9": resolveChannelMascotPlacement(sample.mascot_config, "16:9"),
        });
        setShowInIntro(sample.mascot_config.show_in_intro ?? false);
        setShowInOutro(sample.mascot_config.show_in_outro ?? false);
        setShowInQuestion(sample.mascot_config.show_in_question ?? true);
      } else {
        initPlacements({ "16:9": defaultPlacements["16:9"] });
        setShowInIntro(false);
        setShowInOutro(false);
        setShowInQuestion(true);
      }
    }
    initializedForOpenRef.current = true;
  }, [
    isOpen,
    presetReady,
    isSingleChannelMode,
    targetChannel,
    rawTargetChannel,
    channelAspectRatio,
    aspectRatio,
    mascot,
    allMascots,
    channels,
    initPlacements,
    defaultPlacements,
    channelFilter,
    setShowInIntro,
    setShowInOutro,
    setShowInQuestion,
    setQuestionLayoutId,
  ]);

  const activeMascot = useMemo(() => {
    if (selectedMascotId) {
      return allMascots.find((m) => m.id === selectedMascotId) || mascot || null;
    }
    return mascot || (allMascots.length > 0 ? allMascots[0] : null);
  }, [selectedMascotId, allMascots, mascot]);

  return {
    isSingleChannelMode,
    targetChannel,
    channelAspectRatio,
    selectedMascotId,
    setSelectedMascotId: selectMascot,
    activeMascot,
    ...channelFilter,
  };
}

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveChannelMascotPlacement } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { MascotStageStudioModalProps, StageAspectRatio, StageInspectorTab, StageQuestionLayout, StageViewMode } from "../types";
import { useMascotPlacementPreset } from "./useMascotPlacementPreset";
import { useStagePreview } from "./useStagePreview";
import { useStageViewportDrag } from "./useStageViewportDrag";
import { useStageTimelineDirector } from "./useStageTimelineDirector";
import { useStageTransformState } from "./useStageTransformState";
import { useStageChannelFilter } from "./useStageChannelFilter";
import { useStageSaveAction } from "./useStageSaveAction";
import { resolveInitialStageQuestionLayout } from "../questionLayouts";

export function useStageStudio({
  isOpen,
  singleChannelId,
  mascot,
  channels,
  allMascots = [],
  onClose,
  onSaved,
  onNotice,
}: MascotStageStudioModalProps) {
  const { t } = useTranslation();

  const isSingleChannelMode = Boolean(singleChannelId);
  const targetChannel = useMemo(
    () => (singleChannelId ? channels.find((c) => c.channel_id === singleChannelId) || null : null),
    [channels, singleChannelId],
  );

  // Inspector & Viewport Modes
  const [activeInspectorTab, setActiveInspectorTab] = useState<StageInspectorTab>("transform");
  const rawTargetChannel = targetChannel as unknown as {
    layout_id?: string;
  } | null;
  const channelAspectRatio: StageAspectRatio = "16:9";
  const aspectRatio: StageAspectRatio = "16:9";
  const [stageViewMode, setStageViewMode] = useState<StageViewMode>("video_stage");
  const [questionLayoutId, setQuestionLayoutId] = useState<StageQuestionLayout>(() => {
    const initialAspect = isSingleChannelMode && targetChannel ? channelAspectRatio : "16:9";
    const rawLayoutId = rawTargetChannel?.layout_id;
    return resolveInitialStageQuestionLayout(rawLayoutId, initialAspect);
  });
  const [showGuides, setShowGuides] = useState(true);
  const [showSafeMargins, setShowSafeMargins] = useState(false);

  // Selected Mascot & Channels
  const [selectedMascotId, setSelectedMascotId] = useState<string | null>(null);
  const channelFilter = useStageChannelFilter();
  const transformState = useStageTransformState(aspectRatio);
  const {
    initPlacements,
    position,
    setPosition,
    scale,
    setScale,
    offsetX,
    setOffsetX,
    offsetY,
    setOffsetY,
    flipHorizontal,
    setFlipHorizontal,
    showInIntro,
    setShowInIntro,
    showInOutro,
    setShowInOutro,
    showInQuestion,
    setShowInQuestion,
  } = transformState;

  const placementPreset = useMascotPlacementPreset({
    isOpen,
    position,
    scale,
    offsetX,
    offsetY,
    flipHorizontal,
    applyPlacement: transformState.applyPlacement,
    setPosition,
    setScale,
    setOffsetX,
    setOffsetY,
    setFlipHorizontal,
    onNotice,
    t,
  });
  const { defaultPlacement, defaultPlacements, presetReady } = placementPreset;

  const initializedForOpenRef = useRef(false);

  // Sync state on open
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
    mascot,
    allMascots,
    channels,
    initPlacements,
    defaultPlacements,
    channelFilter,
    setShowInIntro,
    setShowInOutro,
    setShowInQuestion,
  ]);

  const selectMascot = (mascotId: string | null) => {
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
  };

  // Active Mascot Object
  const activeMascot = useMemo(() => {
    if (selectedMascotId) {
      return allMascots.find((m) => m.id === selectedMascotId) || mascot || null;
    }
    return mascot || (allMascots.length > 0 ? allMascots[0] : null);
  }, [selectedMascotId, allMascots, mascot]);

  // Stage Viewport Scaling and Dragging
  const viewportDrag = useStageViewportDrag({
    isOpen,
    aspectRatio,
    scale,
    setScale,
    offsetX,
    setOffsetX,
    offsetY,
    setOffsetY,
  });

  // Rehearsal & Timeline Simulation State
  const timelineDirector = useStageTimelineDirector({
    showInIntro,
    showInOutro,
    showInQuestion,
  });

  const preview = useStagePreview({
    isOpen,
    stageViewMode,
    aspectRatio,
    targetChannel,
    questionLayoutId,
    activeMascot,
    selectedMascotId,
    position,
    scale,
    offsetX,
    offsetY,
    flipHorizontal,
    scenarioPhase: timelineDirector.scenarioPhase,
    activePose: timelineDirector.activePose,
    reactionStyle: timelineDirector.reactionStyle,
    mascotPreviewTime: timelineDirector.mascotPreviewTime,
    isPlaying: timelineDirector.isPlaying,
    showInIntro,
    showInOutro,
    showInQuestion,
  });

  // Reset all transforms to default
  const handleResetLayout = () => {
    transformState.resetPlacement(aspectRatio, defaultPlacement);
    setShowInIntro(false);
    setShowInOutro(false);
    setShowInQuestion(true);
  };

  const saveAction = useStageSaveAction({
    isSingleChannelMode,
    targetChannel,
    selectedMascotId,
    activeMascot,
    channels,
    selectedChannelIds: channelFilter.selectedChannelIds,
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
  });

  return {
    t,
    isSingleChannelMode,
    targetChannel,
    activeInspectorTab,
    setActiveInspectorTab,
    aspectRatio,
    stageViewMode,
    setStageViewMode,
    questionLayoutId,
    setQuestionLayoutId,
    showGuides,
    setShowGuides,
    showSafeMargins,
    setShowSafeMargins,
    selectedMascotId,
    setSelectedMascotId: selectMascot,
    ...channelFilter,
    ...transformState,
    ...timelineDirector,
    ...placementPreset,
    activeMascot,
    ...viewportDrag,
    ...preview,
    handleResetLayout,
    ...saveAction,
  };
}

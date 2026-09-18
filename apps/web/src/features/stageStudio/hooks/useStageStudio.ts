import { useState } from "react";
import { useTranslation } from "../../../i18n";
import type { MascotStageStudioModalProps, StageAspectRatio, StageInspectorTab, StageQuestionLayout, StageViewMode } from "../types";
import { resolveInitialStageQuestionLayout } from "../questionLayouts";
import { useStageTransformState } from "./useStageTransformState";
import { useStageStudioPresets } from "./useStageStudioPresets";
import { useStageStudioChannels } from "./useStageStudioChannels";
import { useStageViewportDrag } from "./useStageViewportDrag";
import { useStageTimelineDirector } from "./useStageTimelineDirector";
import { useStagePreview } from "./useStagePreview";
import { useStageSaveAction } from "./useStageSaveAction";

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
  const aspectRatio: StageAspectRatio = "16:9";

  const [activeInspectorTab, setActiveInspectorTab] = useState<StageInspectorTab>("transform");
  const [stageViewMode, setStageViewMode] = useState<StageViewMode>("video_stage");
  const [questionLayoutId, setQuestionLayoutId] = useState<StageQuestionLayout>(() => {
    const rawTarget = singleChannelId
      ? (channels.find((c) => c.channel_id === singleChannelId) as unknown as { layout_id?: string })
      : null;
    return resolveInitialStageQuestionLayout(rawTarget?.layout_id, "16:9");
  });
  const [showGuides, setShowGuides] = useState(true);
  const [showSafeMargins, setShowSafeMargins] = useState(false);

  const transformState = useStageTransformState(aspectRatio);

  const presets = useStageStudioPresets({
    isOpen,
    aspectRatio,
    ...transformState,
    onNotice,
    t,
  });

  const channelSync = useStageStudioChannels({
    isOpen,
    singleChannelId,
    mascot,
    channels,
    allMascots,
    aspectRatio,
    presetReady: presets.presetReady,
    defaultPlacements: presets.defaultPlacements,
    ...transformState,
    setQuestionLayoutId,
  });

  const viewportDrag = useStageViewportDrag({ isOpen, aspectRatio, ...transformState });
  const timelineDirector = useStageTimelineDirector(transformState);

  const preview = useStagePreview({
    isOpen,
    stageViewMode,
    aspectRatio,
    targetChannel: channelSync.targetChannel,
    questionLayoutId,
    activeMascot: channelSync.activeMascot,
    selectedMascotId: channelSync.selectedMascotId,
    ...transformState,
    ...timelineDirector,
  });

  const saveAction = useStageSaveAction({
    isSingleChannelMode: channelSync.isSingleChannelMode,
    targetChannel: channelSync.targetChannel,
    selectedMascotId: channelSync.selectedMascotId,
    activeMascot: channelSync.activeMascot,
    channels,
    selectedChannelIds: channelSync.selectedChannelIds,
    ...transformState,
    onNotice,
    onSaved,
    onClose,
    t,
  });

  return {
    t,
    ...channelSync,
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
    ...transformState,
    ...timelineDirector,
    ...presets,
    ...viewportDrag,
    ...preview,
    handleResetLayout: presets.handleResetLayout,
    ...saveAction,
  };
}

import { useEffect, useMemo, useRef, useState } from "react";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET, type Channel } from "@studio/shared";
import { api } from "../../../api";
import { useTranslation } from "../../../i18n";
import type {
  ChannelFilterTab,
  MascotStageStudioModalProps,
  StageAspectRatio,
  StageInspectorTab,
  StagePosition,
  StageQuestionLayout,
  StageViewMode,
} from "../types";
import { useMascotPlacementPreset } from "./useMascotPlacementPreset";
import { useStagePreview } from "./useStagePreview";
import { useStageViewportDrag } from "./useStageViewportDrag";
import { useStageTimelineDirector } from "./useStageTimelineDirector";

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
  const [aspectRatio, setAspectRatio] = useState<StageAspectRatio>("16:9");
  const [stageViewMode, setStageViewMode] = useState<StageViewMode>("video_stage");
  const [questionLayoutId, setQuestionLayoutId] = useState<StageQuestionLayout>(
    (targetChannel as unknown as { layout_id?: StageQuestionLayout })?.layout_id === "visual_choices_three"
      ? "visual_choices_three"
      : "media_left_choices_right",
  );
  const [showGuides, setShowGuides] = useState(true);
  const [showSafeMargins, setShowSafeMargins] = useState(false);
  const [flipHorizontal, setFlipHorizontal] = useState(false);

  // Selected Mascot & Channels
  const [selectedMascotId, setSelectedMascotId] = useState<string | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelFilterTab, setChannelFilterTab] = useState<ChannelFilterTab>("all");

  // Transform & Layout Settings (Saved to ChannelMascotConfig)
  const [position, setPosition] = useState<StagePosition>("bottom_left");
  const [scale, setScale] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
  const [offsetX, setOffsetX] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
  const [offsetY, setOffsetY] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
  const [showInIntro, setShowInIntro] = useState<boolean>(false);
  const [showInOutro, setShowInOutro] = useState<boolean>(false);
  const [showInQuestion, setShowInQuestion] = useState<boolean>(true);

  const [saving, setSaving] = useState(false);

  const placementPreset = useMascotPlacementPreset({
    isOpen,
    position,
    scale,
    offsetX,
    offsetY,
    flipHorizontal,
    setPosition,
    setScale,
    setOffsetX,
    setOffsetY,
    setFlipHorizontal,
    onNotice,
    t,
  });
  const { defaultPlacement, presetReady, applyPlacement, applyDefaultPlacement } = placementPreset;

  const initializedForOpenRef = useRef(false);

  // Sync state on open
  useEffect(() => {
    if (!isOpen) {
      initializedForOpenRef.current = false;
      return;
    }
    if (!presetReady || initializedForOpenRef.current) return;

    setQuestionLayoutId(
      (targetChannel as unknown as { layout_id?: StageQuestionLayout })?.layout_id === "visual_choices_three"
        ? "visual_choices_three"
        : "media_left_choices_right",
    );

    if (isSingleChannelMode && targetChannel) {
      const assignedId = targetChannel.mascot_id || (allMascots.length > 0 ? allMascots[0].id : null);
      setSelectedMascotId(assignedId);
      if (targetChannel.mascot_id && targetChannel.mascot_config) {
        applyPlacement(targetChannel.mascot_config);
        setShowInIntro(targetChannel.mascot_config.show_in_intro ?? false);
        setShowInOutro(targetChannel.mascot_config.show_in_outro ?? false);
        setShowInQuestion(targetChannel.mascot_config.show_in_question ?? true);
      } else {
        applyPlacement(defaultPlacement);
        setShowInIntro(false);
        setShowInOutro(false);
        setShowInQuestion(true);
      }
    } else if (mascot) {
      setSelectedMascotId(mascot.id);
      setSelectedChannelIds(mascot.assigned_channel_ids || []);
      const sample = channels.find((c) => c.mascot_id === mascot.id);
      if (sample?.mascot_config) {
        applyPlacement(sample.mascot_config);
        setShowInIntro(sample.mascot_config.show_in_intro ?? false);
        setShowInOutro(sample.mascot_config.show_in_outro ?? false);
        setShowInQuestion(sample.mascot_config.show_in_question ?? true);
      } else {
        applyPlacement(defaultPlacement);
        setShowInIntro(false);
        setShowInOutro(false);
        setShowInQuestion(true);
      }
    }
    initializedForOpenRef.current = true;
  }, [isOpen, presetReady, isSingleChannelMode, targetChannel, mascot, allMascots, channels, applyPlacement, defaultPlacement]);

  const selectMascot = (mascotId: string | null) => {
    setSelectedMascotId(mascotId);
    if (isSingleChannelMode && mascotId && mascotId !== targetChannel?.mascot_id) {
      applyDefaultPlacement();
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
    applyDefaultPlacement();
    setShowInIntro(false);
    setShowInOutro(false);
    setShowInQuestion(true);
  };

  // Save / Apply handler
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
    t,
    isSingleChannelMode,
    targetChannel,
    activeInspectorTab,
    setActiveInspectorTab,
    aspectRatio,
    setAspectRatio,
    stageViewMode,
    setStageViewMode,
    questionLayoutId,
    setQuestionLayoutId,
    showGuides,
    setShowGuides,
    showSafeMargins,
    setShowSafeMargins,
    flipHorizontal,
    setFlipHorizontal,
    selectedMascotId,
    setSelectedMascotId: selectMascot,
    selectedChannelIds,
    setSelectedChannelIds,
    channelSearchQuery,
    setChannelSearchQuery,
    channelFilterTab,
    setChannelFilterTab,
    position,
    setPosition,
    scale,
    setScale,
    offsetX,
    setOffsetX,
    offsetY,
    setOffsetY,
    showInIntro,
    setShowInIntro,
    showInOutro,
    setShowInOutro,
    showInQuestion,
    setShowInQuestion,
    ...timelineDirector,
    saving,
    ...placementPreset,
    activeMascot,
    ...viewportDrag,
    ...preview,
    handleResetLayout,
    handleSave,
  };
}

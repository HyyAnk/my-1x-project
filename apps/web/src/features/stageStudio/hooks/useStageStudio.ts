import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET, type Channel, type MascotActionType } from "@studio/shared";
import { api } from "../../../api";
import { useTranslation } from "../../../i18n";
import type {
  ChannelFilterTab,
  MascotStageStudioModalProps,
  StageAspectRatio,
  StageInspectorTab,
  StagePosition,
  StageQuestionLayout,
  StageReactionStyle,
  StageScenarioPhase,
  StageViewMode,
} from "../types";
import { useMascotPlacementPreset } from "./useMascotPlacementPreset";
import { useStagePreview } from "./useStagePreview";
import { resolveStageTimelineState, stageBackgroundTime, STAGE_TIMELINE_DURATION_SECONDS } from "../utils/stageTimeline";

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

  // Rehearsal & Timeline Simulation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubberTime, setScrubberTime] = useState<number>(5.0);
  const [scenarioPhase, setScenarioPhase] = useState<StageScenarioPhase>("question");
  const [reactionStyle, setReactionStyle] = useState<StageReactionStyle>("celebrate");
  const [activePose, setActivePose] = useState<MascotActionType>("thinking");

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

  // Scale the selected canonical output canvas within the available editor viewport.
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 800, height: 450 });

  useLayoutEffect(() => {
    if (!stageViewportRef.current || !isOpen) return;
    const el = stageViewportRef.current;
    const updateSize = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setViewportDims({ width: el.clientWidth, height: el.clientHeight });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  const targetStageWidth = aspectRatio === "16:9" ? 1920 : 1080;
  const targetStageHeight = aspectRatio === "16:9" ? 1080 : 1920;

  // Fit the selected canvas within the container while keeping its aspect ratio.
  const stageScale = useMemo(() => {
    const scaleX = (viewportDims.width - 32) / targetStageWidth;
    const scaleY = (viewportDims.height - 32) / targetStageHeight;
    return Math.max(0.1, Math.min(scaleX, scaleY, 1.0));
  }, [viewportDims, targetStageWidth, targetStageHeight]);

  // Interactive Direct Dragging on Stage
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handleMascotMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: offsetX,
      initY: offsetY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (e.clientX - dragStartRef.current.startX) / stageScale;
      const dy = (e.clientY - dragStartRef.current.startY) / stageScale;
      setOffsetX(Math.max(-1500, Math.min(1500, Math.round(dragStartRef.current.initX + dx))));
      setOffsetY(Math.max(-1500, Math.min(1500, Math.round(dragStartRef.current.initY + dy))));
    };
    const onMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, stageScale]);

  // Interactive Corner Resize Dragging
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startY: number; initScale: number } | null>(null);

  const handleResizeHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      startY: e.clientY,
      initScale: scale,
    };
  };

  useEffect(() => {
    if (!isResizing) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dy = (resizeStartRef.current.startY - e.clientY) / (200 * stageScale);
      const nextScale = Math.max(0.3, Math.min(3.0, Number((resizeStartRef.current.initScale + dy).toFixed(2))));
      setScale(nextScale);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, stageScale, scale]);

  // Timeline Director Rehearsal Scrubber Logic
  const applyTimelineTime = useCallback(
    (timeSec: number) => {
      setScrubberTime(timeSec);
      const state = resolveStageTimelineState(timeSec, reactionStyle);
      setScenarioPhase(state.phase);
      setActivePose(state.pose);
    },
    [reactionStyle],
  );

  // Check if Mascot is enabled to appear in the currently previewed phase
  const isMascotVisibleInCurrentPhase = useMemo(() => {
    if (scenarioPhase === "intro") {
      return Boolean(showInIntro);
    }
    if (scenarioPhase === "outro") {
      return Boolean(showInOutro);
    }
    return showInQuestion !== false;
  }, [scenarioPhase, showInIntro, showInOutro, showInQuestion]);
  const mascotPreviewTime = isPlaying ? stageBackgroundTime(scenarioPhase) : scrubberTime;
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
    scenarioPhase,
    activePose,
    reactionStyle,
    mascotPreviewTime,
    isPlaying,
    showInIntro,
    showInOutro,
    showInQuestion,
  });

  // Rehearsal Playback Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubberTime((prev) => {
        const next = prev + 0.1;
        if (next > STAGE_TIMELINE_DURATION_SECONDS) {
          applyTimelineTime(0);
          return 0;
        }
        applyTimelineTime(next);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [applyTimelineTime, isPlaying]);

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
    isPlaying,
    setIsPlaying,
    scrubberTime,
    scenarioPhase,
    reactionStyle,
    setReactionStyle,
    activePose,
    setActivePose,
    saving,
    ...placementPreset,
    activeMascot,
    stageViewportRef,
    targetStageWidth,
    targetStageHeight,
    stageScale,
    isDragging,
    isResizing,
    ...preview,
    isMascotVisibleInCurrentPhase,
    handleMascotMouseDown,
    handleResizeHandleMouseDown,
    applyTimelineTime,
    handleResetLayout,
    handleSave,
  };
}

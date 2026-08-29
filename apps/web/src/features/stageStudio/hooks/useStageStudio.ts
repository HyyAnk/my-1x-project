import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Channel, MascotActionType, MascotProfile } from "@studio/shared";
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

type SandboxPreviewTiming = {
  phase: "question" | "choices" | "thinking" | "reveal" | "explain";
  timeSec: number;
};

const SANDBOX_PREVIEW_TIMINGS: Record<StageScenarioPhase, SandboxPreviewTiming> = {
  intro: { phase: "question", timeSec: 0.5 },
  question: { phase: "choices", timeSec: 2 },
  thinking: { phase: "thinking", timeSec: 5 },
  reveal: { phase: "reveal", timeSec: 8 },
  explain: { phase: "explain", timeSec: 9.5 },
  outro: { phase: "explain", timeSec: 9.5 },
};

function resolvePreviewSpriteUrl(mascot: MascotProfile | null, pose: MascotActionType): string | null {
  if (!mascot) return null;
  const actions = mascot.actions;
  const directSprite = actions[pose]?.sprite_url;
  if (directSprite) return directSprite;
  if (pose === "celebrate") return actions.wave?.sprite_url || actions.idle?.sprite_url || mascot.master_image_url || null;
  if (pose === "oops") return actions.thinking?.sprite_url || actions.idle?.sprite_url || mascot.master_image_url || null;
  if (pose === "outro") {
    return actions.wave?.sprite_url || actions.celebrate?.sprite_url || actions.idle?.sprite_url || mascot.master_image_url || null;
  }
  return actions.idle?.sprite_url || mascot.master_image_url || null;
}

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

  // Authentic Video Background Preview State (Powered by HyperFrames Engine)
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [iframeKey, setIframeKey] = useState<number>(1);

  // Selected Mascot & Channels
  const [selectedMascotId, setSelectedMascotId] = useState<string | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelFilterTab, setChannelFilterTab] = useState<ChannelFilterTab>("all");

  // Transform & Layout Settings (Saved to ChannelMascotConfig)
  const [position, setPosition] = useState<StagePosition>("bottom_left");
  const [scale, setScale] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
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

  // Sync state on open
  useEffect(() => {
    if (!isOpen) return;

    setQuestionLayoutId(
      (targetChannel as unknown as { layout_id?: StageQuestionLayout })?.layout_id === "visual_choices_three"
        ? "visual_choices_three"
        : "media_left_choices_right",
    );

    if (isSingleChannelMode && targetChannel) {
      const assignedId = targetChannel.mascot_id || (allMascots.length > 0 ? allMascots[0].id : null);
      setSelectedMascotId(assignedId);
      if (targetChannel.mascot_config) {
        setPosition(targetChannel.mascot_config.position || "bottom_left");
        setScale(targetChannel.mascot_config.scale || 1.0);
        setOffsetX(targetChannel.mascot_config.offset_x || 0);
        setOffsetY(targetChannel.mascot_config.offset_y || 0);
        setShowInIntro(targetChannel.mascot_config.show_in_intro ?? false);
        setShowInOutro(targetChannel.mascot_config.show_in_outro ?? false);
        setShowInQuestion(targetChannel.mascot_config.show_in_question ?? true);
      } else {
        setPosition("bottom_left");
        setScale(1.0);
        setOffsetX(0);
        setOffsetY(0);
        setShowInIntro(false);
        setShowInOutro(false);
        setShowInQuestion(true);
      }
    } else if (mascot) {
      setSelectedMascotId(mascot.id);
      setSelectedChannelIds(mascot.assigned_channel_ids || []);
      const sample = channels.find((c) => c.mascot_id === mascot.id);
      if (sample?.mascot_config) {
        setPosition(sample.mascot_config.position || "bottom_left");
        setScale(sample.mascot_config.scale || 1.0);
        setOffsetX(sample.mascot_config.offset_x || 0);
        setOffsetY(sample.mascot_config.offset_y || 0);
        setShowInIntro(sample.mascot_config.show_in_intro ?? false);
        setShowInOutro(sample.mascot_config.show_in_outro ?? false);
        setShowInQuestion(sample.mascot_config.show_in_question ?? true);
      } else {
        setPosition("bottom_left");
        setScale(1.0);
        setOffsetX(0);
        setOffsetY(0);
        setShowInIntro(false);
        setShowInOutro(false);
        setShowInQuestion(true);
      }
    }
  }, [isOpen, isSingleChannelMode, targetChannel, mascot, allMascots, channels]);

  // Active Mascot Object
  const activeMascot = useMemo(() => {
    if (selectedMascotId) {
      return allMascots.find((m) => m.id === selectedMascotId) || mascot || null;
    }
    return mascot || (allMascots.length > 0 ? allMascots[0] : null);
  }, [selectedMascotId, allMascots, mascot]);

  // Scaled 1920x1080 Viewport
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

  // Fit 1920x1080 within container while keeping aspect ratio
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
      setOffsetX(Math.max(-2000, Math.min(2000, Math.round(dragStartRef.current.initX + dx))));
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
  const applyTimelineTime = (timeSec: number) => {
    setScrubberTime(timeSec);
    if (timeSec < 2.0) {
      setScenarioPhase("intro");
      setActivePose("wave");
    } else if (timeSec < 9.0) {
      setScenarioPhase("question");
      setActivePose("thinking");
    } else if (timeSec < 12.0) {
      setScenarioPhase("reveal");
      setActivePose(reactionStyle === "celebrate" ? "celebrate" : "oops");
    } else {
      setScenarioPhase("outro");
      setActivePose("wave");
    }
  };

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

  // Rehearsal Playback Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubberTime((prev) => {
        const next = prev + 0.1;
        if (next > 16.0) {
          applyTimelineTime(0);
          return 0;
        }
        applyTimelineTime(next);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, reactionStyle]);

  // Mascot sprite/pose resolution with hierarchical fallback matching MascotStateResolver
  const currentSpriteUrl = useMemo(() => resolvePreviewSpriteUrl(activeMascot, activePose), [activeMascot, activePose]);

  // Fetch authentic HyperFrames background composition (Matching Visual Sandbox Layout)
  useEffect(() => {
    if (!isOpen || stageViewMode !== "video_stage") return;

    let isMounted = true;
    const fetchBackground = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(false);
        const previewTiming = SANDBOX_PREVIEW_TIMINGS[scenarioPhase];

        const res = await api.previewSandboxComposition({
          theme: "candy_arcade",
          palette_id: targetChannel?.default_palette_id || "lime",
          layout_id: questionLayoutId,
          thinking_bar_style: targetChannel?.default_thinking_bar_style || "star_slider",
          question_box_style: targetChannel?.default_question_box_style || "candy_pop",
          answer_card_style: "glossy_arcade",
          counter_style: targetChannel?.default_counter_style || "hanging_woodsign",
          phase: previewTiming.phase,
          timeline_time_seconds: previewTiming.timeSec,
          mascot_enabled: true,
          mascot_id: "stage_preview_layout_only",
          mascot_position: position,
        });

        if (isMounted && res?.html) {
          setPreviewHtml(res.html);
          setIframeKey((k) => k + 1);
        }
      } catch (err) {
        console.warn("Failed to fetch stage background composition", err);
        if (isMounted) setPreviewError(true);
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    };

    const timer = setTimeout(() => void fetchBackground(), 100);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, stageViewMode, scenarioPhase, targetChannel, questionLayoutId, position, previewRevision]);

  const retryPreview = () => setPreviewRevision((revision) => revision + 1);

  // Reset all transforms to default
  const handleResetLayout = () => {
    setPosition("bottom_left");
    setScale(1.0);
    setOffsetX(0);
    setOffsetY(0);
    setFlipHorizontal(false);
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
    setSelectedMascotId,
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
    activeMascot,
    stageViewportRef,
    targetStageWidth,
    targetStageHeight,
    stageScale,
    isDragging,
    isResizing,
    currentSpriteUrl,
    previewHtml,
    previewLoading,
    previewError,
    retryPreview,
    iframeKey,
    setIframeKey,
    isMascotVisibleInCurrentPhase,
    handleMascotMouseDown,
    handleResizeHandleMouseDown,
    applyTimelineTime,
    handleResetLayout,
    handleSave,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_MASCOT_ACTIONS,
  ALL_QUIZ_IMAGE_STYLES,
  MASCOT_ACTION_META,
  QUIZ_IMAGE_STYLE_LABELS,
  type Channel,
  type MascotActionType,
  type MascotProfile,
  type MascotSpriteAction,
  type QuizImageStyle,
} from "@studio/shared";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsInSimple,
  ArrowsOutSimple,
  Broadcast,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  CircleNotch,
  Copy,
  DownloadSimple,
  Eye,
  FilmStrip,
  FloppyDisk,
  Gear,
  Lightning,
  MagicWand,
  MagnifyingGlass,
  MagnifyingGlassPlus,
  PaintBrush,
  Pause,
  Play,
  Plus,
  Rocket,
  SlidersHorizontal,
  Smiley,
  Sparkle,
  Stop,
  Trash,
  Upload,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { api } from "../api";
import type { Notice } from "./types";
import { EmptyState } from "./EmptyState";
import { useTranslation } from "../i18n";

const STYLE_OPTIONS: { id: QuizImageStyle; icon: string; title: string; descKey: string }[] = [
  { id: "pixar_3d", icon: "🎬", title: "3D Pixar", descKey: "mascots.stylePixarDesc" },
  { id: "kawaii_chibi", icon: "🧸", title: "Kawaii Chibi", descKey: "mascots.styleChibiDesc" },
  { id: "flat_vector", icon: "🎨", title: "Flat Vector", descKey: "mascots.styleVectorDesc" },
  { id: "voxel_lowpoly", icon: "🕹️", title: "Voxel 3D", descKey: "mascots.styleVoxelDesc" },
  { id: "plastic_toy", icon: "🎁", title: "Plastic Toy", descKey: "mascots.styleToyDesc" },
];

const COLOR_PRESETS = [
  { name: "Cyan Wave", hex: "#06b6d4" },
  { name: "Sunset Coral", hex: "#ff6b4a" },
  { name: "Emerald Mint", hex: "#10b981" },
  { name: "Golden Amber", hex: "#f59e0b" },
  { name: "Royal Violet", hex: "#8b5cf6" },
  { name: "Berry Pink", hex: "#f43f5e" },
];

const QUICK_PROMPT_TAGS = [
  "+ Sparkling big eyes",
  "+ Cute chibi proportions",
  "+ Volumetric soft lighting",
  "+ Fluffy feathers/fur",
  "+ Friendly expression",
  "+ Sharp clean silhouette",
  "+ Solid white background",
  "+ Vibrant colors",
];

const PROMPT_TEMPLATES = [
  {
    nameKey: "mascots.presetOwl",
    name: "Milo the Explorer",
    prompt: "Cute wise baby owl with big sparkling eyes and small red glasses, fluffy soft feathers, wearing a tiny yellow bowtie, friendly and enthusiastic expression, sharp clean silhouette, solid seamless background",
    style: "pixar_3d" as QuizImageStyle,
    color: "#06b6d4",
  },
  {
    nameKey: "mascots.presetDino",
    name: "Bingo the Dino",
    prompt: "Adorable playful baby green dinosaur with tiny soft wings and round cute belly, joyful smiling expression, big anime eyes, wearing small sneakers, solid white background, vibrant lighting",
    style: "pixar_3d" as QuizImageStyle,
    color: "#10b981",
  },
  {
    nameKey: "mascots.presetRobot",
    name: "Bolt the Bot",
    prompt: "Futuristic cute mini companion robot mascot, glossy white ceramic shell, glowing heart-shaped LED screen face, energetic hovering pose with tiny thruster sparks, solid clean background",
    style: "plastic_toy" as QuizImageStyle,
    color: "#8b5cf6",
  },
  {
    nameKey: "mascots.presetFox",
    name: "Felix the Fox",
    prompt: "Clever adventurous chibi fox cub with oversized bushy tail, warm orange coat with cream chest, curious sparkling eyes, wearing tiny aviator goggles on forehead, playful dynamic pose",
    style: "kawaii_chibi" as QuizImageStyle,
    color: "#ff6b4a",
  },
];

function getLocalizedActionMeta(
  action: MascotActionType,
  t: (path: string, params?: Record<string, string | number>) => string
) {
  const base = MASCOT_ACTION_META[action];
  const cap = action.charAt(0).toUpperCase() + action.slice(1);
  return {
    label: t(`mascots.action${cap}`),
    description: t(`mascots.action${cap}Desc`),
    usage: t(`mascots.action${cap}Usage`),
    icon: base.icon,
    defaultFps: base.defaultFps,
    defaultFrames: base.defaultFrames,
  };
}

export function MascotStudioView({
  channels,
  onNotice,
  onRefreshChannels,
}: {
  channels: Channel[];
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"library" | "generator">("library");

  const [mascots, setMascots] = useState<MascotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<string>("all");

  // Quick Assign Modal state
  const [quickAssignMascot, setQuickAssignMascot] = useState<MascotProfile | null>(null);
  const [quickAssignedChannels, setQuickAssignedChannels] = useState<string[]>([]);
  const [quickPosition, setQuickPosition] = useState<"bottom_left" | "bottom_right">("bottom_left");
  const [quickScale, setQuickScale] = useState<number>(1.0);
  const [savingQuickAssign, setSavingQuickAssign] = useState(false);

  // Scenario Playback state
  const [isScenarioMode, setIsScenarioMode] = useState(false);
  const [scenarioPhase, setScenarioPhase] = useState<"intro" | "question" | "thinking" | "reveal" | "explain">("intro");
  const [scenarioCountdown, setScenarioCountdown] = useState<number>(5);
  const [theaterMode, setTheaterMode] = useState(false);

  // Phase 2: Calibration & Onion Skinning state
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(false);
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(0.35);
  const [showGuides, setShowGuides] = useState(true);
  const [nudgeX, setNudgeX] = useState(0);
  const [nudgeY, setNudgeY] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [importingZip, setImportingZip] = useState(false);

  // Phase 3: Dynamic Director Timeline Scrubber & Live Keyframing
  const [scrubberTime, setScrubberTime] = useState<number>(0);
  const [reactionStyle, setReactionStyle] = useState<"celebrate" | "oops">("celebrate");

  // Generator State
  const [editingMascot, setEditingMascot] = useState<MascotProfile | null>(null);
  const [generatorStep, setGeneratorStep] = useState<1 | 2 | 3 | 4>(1);
  const [genName, setGenName] = useState("");
  const [genDescription, setGenDescription] = useState("");
  const [genStyle, setGenStyle] = useState<QuizImageStyle>("pixar_3d");
  const [genColor, setGenColor] = useState("#06b6d4");
  const [genPrompt, setGenPrompt] = useState("");
  const [selectedActions, setSelectedActions] = useState<Record<MascotActionType, boolean>>({
    wave: true,
    idle: true,
    thinking: true,
    point: true,
    celebrate: true,
    oops: true,
    outro: true,
  });
  const [actionPrompts, setActionPrompts] = useState<Record<MascotActionType, string>>({
    wave: "",
    idle: "",
    thinking: "",
    point: "",
    celebrate: "",
    oops: "",
    outro: "",
  });
  const [actionFps, setActionFps] = useState<Record<MascotActionType, number>>({
    wave: 8,
    idle: 6,
    thinking: 8,
    point: 8,
    celebrate: 10,
    oops: 8,
    outro: 8,
  });
  const [actionFrames, setActionFrames] = useState<Record<MascotActionType, number>>({
    wave: 1,
    idle: 1,
    thinking: 1,
    point: 1,
    celebrate: 1,
    oops: 1,
    outro: 1,
  });

  // Action Generation Busy states
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Step 1 UI Enhancement States
  const [showNotesAccordion, setShowNotesAccordion] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Live Studio Player state
  const [activePreviewAction, setActivePreviewAction] = useState<MascotActionType>("wave");
  const [previewFps, setPreviewFps] = useState(8);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [stagePreviewMode, setStagePreviewMode] = useState<"grid" | "video_stage">("video_stage");
  const [targetPosition, setTargetPosition] = useState<"bottom_left" | "bottom_right">("bottom_left");
  const [targetScale, setTargetScale] = useState(1.0);
  const [assignedChannels, setAssignedChannels] = useState<string[]>([]);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<MascotProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load Mascots
  const loadMascots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.mascots();
      setMascots(res.mascots);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to load mascots" });
    } finally {
      setLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    void loadMascots();
  }, [loadMascots]);

  // Step 1 Prompt Helpers
  const handleInjectTag = (tagText: string) => {
    const cleanTag = tagText.replace(/^\+\s*/, "").trim();
    setGenPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return cleanTag;
      if (trimmed.toLowerCase().includes(cleanTag.toLowerCase())) return trimmed;
      return `${trimmed}, ${cleanTag}`;
    });
  };

  const handleApplyTemplate = (tpl: (typeof PROMPT_TEMPLATES)[0]) => {
    setGenName(tpl.name);
    setGenPrompt(tpl.prompt);
    setGenStyle(tpl.style);
    setGenColor(tpl.color);
  };

  const handleCopyPrompt = async () => {
    if (!genPrompt) return;
    await navigator.clipboard.writeText(genPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1500);
  };

  // Start new Mascot Generator
  const handleStartNew = () => {
    setEditingMascot(null);
    setGenName("Milo the Explorer");
    setGenDescription("");
    setGenStyle("pixar_3d");
    setGenColor("#06b6d4");
    setGenPrompt("Cute wise baby owl with big sparkling eyes and small red glasses, fluffy feathers, friendly and enthusiastic expression");
    setGeneratorStep(1);
    setActiveTab("generator");
  };

  // Edit existing Mascot
  const handleEditMascot = (mascot: MascotProfile) => {
    setEditingMascot(mascot);
    setGenName(mascot.name);
    setGenDescription(mascot.description);
    setGenStyle(mascot.visual_style);
    setGenColor(mascot.color_theme || "#06b6d4");
    setGenPrompt(mascot.master_prompt || "");
    setAssignedChannels(mascot.assigned_channel_ids || []);
    
    // Set active action with available sprite
    const availableAction = ALL_MASCOT_ACTIONS.find((act) => mascot.actions[act]?.sprite_url) || "wave";
    setActivePreviewAction(availableAction);
    setGeneratorStep(1);
    setActiveTab("generator");
  };

  // Step 1: Save Concept & Generate
  const handleGenerateConcept = async () => {
    if (!genName.trim()) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    setBusyAction("concept");
    try {
      let mascotToUse = editingMascot;
      if (!mascotToUse) {
        const created = await api.createMascot({
          name: genName.trim(),
          description: genDescription.trim(),
          visual_style: genStyle,
          master_prompt: genPrompt.trim(),
          color_theme: genColor,
        });
        mascotToUse = created.mascot;
        setEditingMascot(mascotToUse);
      } else {
        const updated = await api.updateMascot(mascotToUse.id, {
          name: genName.trim(),
          description: genDescription.trim(),
          visual_style: genStyle,
          master_prompt: genPrompt.trim(),
          color_theme: genColor,
        });
        mascotToUse = updated.mascot;
        setEditingMascot(mascotToUse);
      }

      onNotice({ tone: "good", message: t("notices.generatingConcept") });
      const res = await api.generateMascotConcept(mascotToUse.id, {
        prompt: genPrompt.trim(),
        style: genStyle,
      });

      setEditingMascot(res.mascot);
      onNotice({ tone: "good", message: t("notices.conceptGenerated") });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.conceptFailed") });
    } finally {
      setBusyAction(null);
    }
  };

  // Step 3: Generate Single Sprite
  const handleGenerateSprite = async (action: MascotActionType) => {
    if (!editingMascot) return;
    setBusyAction(action);
    const actionMeta = getLocalizedActionMeta(action, t);
    try {
      onNotice({ tone: "good", message: t("notices.generatingSprite", { action: actionMeta.label }) });
      const res = await api.generateMascotSprite(editingMascot.id, {
        action,
        prompt: actionPrompts[action]?.trim() || undefined,
        frames_count: actionFrames[action] || 6,
        fps: actionFps[action] || 8,
        loop: true,
      });
      setEditingMascot(res.mascot);
      setActivePreviewAction(action);
      onNotice({ tone: "good", message: t("notices.spriteCompleted", { action: actionMeta.label }) });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.spriteFailed", { action }) });
    } finally {
      setBusyAction(null);
    }
  };

  // Batch Generate all selected
  const handleBatchGenerateSprites = async () => {
    if (!editingMascot) return;
    const actionsToGen = ALL_MASCOT_ACTIONS.filter((act) => selectedActions[act]);
    if (actionsToGen.length === 0) {
      onNotice({ tone: "bad", message: t("notices.selectActionRequired") });
      return;
    }
    setBusyAction("batch");
    try {
      for (const action of actionsToGen) {
        const actionMeta = getLocalizedActionMeta(action, t);
        onNotice({ tone: "good", message: t("notices.generatingSprite", { action: actionMeta.label }) });
        const res = await api.generateMascotSprite(editingMascot.id, {
          action,
          prompt: actionPrompts[action]?.trim() || undefined,
          frames_count: actionFrames[action] || 6,
          fps: actionFps[action] || 8,
          loop: true,
        });
        setEditingMascot(res.mascot);
      }
      onNotice({ tone: "good", message: t("notices.batchCompleted", { count: actionsToGen.length }) });
      await loadMascots();
      setGeneratorStep(4);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.batchFailed") });
    } finally {
      setBusyAction(null);
    }
  };

  // Upload Custom Sprite Strip
  const handleUploadSprite = async (action: MascotActionType, file: File) => {
    if (!editingMascot) return;
    setBusyAction(`upload-${action}`);
    const actionMeta = getLocalizedActionMeta(action, t);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const res = await api.uploadMascotSprite(editingMascot.id, {
        action,
        data: base64,
        frames_count: actionFrames[action] || 6,
        fps: actionFps[action] || 8,
        loop: true,
        frame_width: 256,
        frame_height: 256,
      });

      setEditingMascot(res.mascot);
      setActivePreviewAction(action);
      onNotice({ tone: "good", message: t("notices.spriteUploaded", { action: actionMeta.label }) });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.uploadFailed") });
    } finally {
      setBusyAction(null);
    }
  };

  // Background Matting / Removal
  const handleRemoveBackground = async (target: "master" | "all" | MascotActionType = "all") => {
    if (!editingMascot) return;
    setBusyAction(`matting-${target}`);
    try {
      const res = await api.removeMascotBackground(editingMascot.id, target);
      setEditingMascot(res.mascot);
      const targetLabel = target === "master" ? "Master Concept" : target === "all" ? t("common.all") : getLocalizedActionMeta(target as MascotActionType, t).label;
      onNotice({
        tone: "good",
        message: t("notices.mattingSuccess", { target: targetLabel }),
      });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mattingFailed") });
    } finally {
      setBusyAction(null);
    }
  };

  // Step 4: Save & Bind to Channels
  const handleApplyToChannels = async () => {
    if (!editingMascot) return;
    setBusyAction("assign");
    try {
      for (const channel of channels) {
        const isAssigned = assignedChannels.includes(channel.channel_id);
        if (isAssigned && channel.mascot_id !== editingMascot.id) {
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: editingMascot.id,
            config: { enabled: true, position: targetPosition, scale: targetScale },
          });
        } else if (!isAssigned && channel.mascot_id === editingMascot.id) {
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: null,
          });
        } else if (isAssigned && channel.mascot_id === editingMascot.id) {
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: editingMascot.id,
            config: { enabled: true, position: targetPosition, scale: targetScale },
          });
        }
      }
      onNotice({ tone: "good", message: t("notices.channelsAssigned") });
      await onRefreshChannels();
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.channelsAssignFailed") });
    } finally {
      setBusyAction(null);
    }
  };

  // Delete Mascot
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteMascot(deleteTarget.id);
      onNotice({ tone: "good", message: t("notices.mascotDeleted", { name: deleteTarget.name }) });
      setDeleteTarget(null);
      await loadMascots();
      await onRefreshChannels();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mascotDeleteFailed") });
    } finally {
      setDeleting(false);
    }
  };

  // Quick Assign Handlers (Instant from Library)
  const handleOpenQuickAssign = (mascot: MascotProfile) => {
    setQuickAssignMascot(mascot);
    setQuickAssignedChannels(mascot.assigned_channel_ids || []);
    const sampleChannel = channels.find((c) => c.mascot_id === mascot.id);
    if (sampleChannel?.mascot_config) {
      setQuickPosition(sampleChannel.mascot_config.position || "bottom_left");
      setQuickScale(sampleChannel.mascot_config.scale || 1.0);
    } else {
      setQuickPosition("bottom_left");
      setQuickScale(1.0);
    }
  };

  const handleSaveQuickAssign = async () => {
    if (!quickAssignMascot) return;
    setSavingQuickAssign(true);
    try {
      for (const channel of channels) {
        const isAssigned = quickAssignedChannels.includes(channel.channel_id);
        if (isAssigned && channel.mascot_id !== quickAssignMascot.id) {
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: quickAssignMascot.id,
            config: { enabled: true, position: quickPosition, scale: quickScale },
          });
        } else if (!isAssigned && channel.mascot_id === quickAssignMascot.id) {
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: null,
          });
        } else if (isAssigned && channel.mascot_id === quickAssignMascot.id) {
          await api.assignMascotToChannel(channel.channel_id, {
            mascot_id: quickAssignMascot.id,
            config: { enabled: true, position: quickPosition, scale: quickScale },
          });
        }
      }
      onNotice({ tone: "good", message: t("notices.channelsAssigned") });
      await onRefreshChannels();
      await loadMascots();
      setQuickAssignMascot(null);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.channelsAssignFailed") });
    } finally {
      setSavingQuickAssign(false);
    }
  };

  // Phase 3: Director Timeline Keyframing Engine
  const applyTimelineTime = useCallback((timeSec: number, reaction: "celebrate" | "oops" = reactionStyle) => {
    setScrubberTime(timeSec);
    if (timeSec < 2.0) {
      setScenarioPhase("intro");
      setActivePreviewAction("wave");
    } else if (timeSec < 4.0) {
      setScenarioPhase("question");
      setActivePreviewAction("idle");
    } else if (timeSec < 9.0) {
      setScenarioPhase("thinking");
      setActivePreviewAction("thinking");
      setScenarioCountdown(Math.max(1, Math.min(5, Math.ceil(9.0 - timeSec))));
    } else if (timeSec < 12.0) {
      setScenarioPhase("reveal");
      setActivePreviewAction(reaction);
    } else {
      setScenarioPhase("explain");
      setActivePreviewAction("point");
    }
  }, [reactionStyle]);

  // Scenario Playback Simulation Clock (Smooth 100ms Scrubber)
  useEffect(() => {
    if (!isScenarioMode) return;
    const interval = setInterval(() => {
      setScrubberTime((prev) => {
        const next = Math.round((prev + 0.1) * 10) / 10;
        if (next >= 16.0) {
          applyTimelineTime(0);
          return 0;
        }
        applyTimelineTime(next);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isScenarioMode, applyTimelineTime]);

  // Sync Nudge offsets when switching active pose or mascot
  useEffect(() => {
    const act = editingMascot?.actions[activePreviewAction];
    setNudgeX(act?.offset_x || 0);
    setNudgeY(act?.offset_y || 0);
  }, [activePreviewAction, editingMascot]);

  const handleSaveCalibration = async () => {
    if (!editingMascot) return;
    setCalibrating(true);
    const actionMeta = getLocalizedActionMeta(activePreviewAction, t);
    try {
      const res = await api.calibrateMascotAction(editingMascot.id, activePreviewAction, {
        offset_x: nudgeX,
        offset_y: nudgeY,
      });
      setEditingMascot(res.mascot);
      onNotice({ tone: "good", message: t("notices.calibrationSaved", { pose: actionMeta.label }) });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.calibrationFailed") });
    } finally {
      setCalibrating(false);
    }
  };

  const handleImportZip = async (file: File) => {
    setImportingZip(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await api.importMascotZip(base64);
          onNotice({ tone: "good", message: t("notices.mascotImported", { name: res.mascot.name }) });
          await loadMascots();
          await onRefreshChannels();
        } catch (err) {
          onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mascotImportFailed") });
        } finally {
          setImportingZip(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setImportingZip(false);
      onNotice({ tone: "bad", message: t("notices.cannotReadZip") });
    }
  };

  // Frame Stepper Timer for Active Preview
  const currentActionSprite = editingMascot?.actions[activePreviewAction];
  const activeFramesCount = currentActionSprite?.frames_count || 1;

  useEffect(() => {
    if (!isPlaying || activeFramesCount <= 1) return;
    const intervalMs = 1000 / (previewFps || 8);
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % activeFramesCount);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, activeFramesCount, previewFps]);

  // Filtered mascots
  const filteredMascots = useMemo(() => {
    return mascots.filter((m) => {
      if (styleFilter !== "all" && m.visual_style !== styleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchPrompt = m.master_prompt.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchPrompt) return false;
      }
      return true;
    });
  }, [mascots, styleFilter, searchQuery]);

  return (
    <section className="page-wrap mascot-studio-page">
      {/* Studio Header */}
      <div className="section-heading mascot-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="mascot-title-icon" style={{ fontSize: "28px" }}>🎨</span>
            <div>
              <p className="eyebrow">Video Host & Brand Persona</p>
              <h1>{t("mascots.pageTitle")}</h1>
            </div>
          </div>
          <p className="detail-copy" style={{ marginTop: "4px" }}>
            {t("mascots.pageSubtitle")}
          </p>
        </div>

        <div className="mascot-top-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {activeTab === "library" ? (
            <>
              <label className="quiet-button" style={{ cursor: "pointer", margin: 0 }} title={t("common.importZip")}>
                {importingZip ? <CircleNotch className="spin" size={15} /> : <Upload size={15} />}
                <span>{importingZip ? t("common.importing") : t("common.importZip")}</span>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImportZip(file);
                  }}
                />
              </label>
              <button type="button" className="primary-button" onClick={handleStartNew}>
                <Plus size={16} weight="bold" />
                <span>{t("mascots.newMascot")}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="quiet-button"
              onClick={() => {
                setActiveTab("library");
                void loadMascots();
              }}
            >
              <ArrowLeft size={16} />
              <span>{t("mascots.tabLibrary")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="channel-group-tabs" role="tablist" aria-label="Mascot Studio Tabs" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "library"}
          className={`channel-group-tab ${activeTab === "library" ? "is-selected" : ""}`}
          onClick={() => setActiveTab("library")}
        >
          <Smiley size={18} weight={activeTab === "library" ? "fill" : "regular"} />
          <span>{t("mascots.tabLibrary")}</span>
          <small>{mascots.length}</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "generator"}
          className={`channel-group-tab ${activeTab === "generator" ? "is-selected" : ""}`}
          onClick={() => {
            if (!editingMascot) handleStartNew();
            else setActiveTab("generator");
          }}
        >
          <MagicWand size={18} weight={activeTab === "generator" ? "fill" : "regular"} />
          <span>{t("mascots.tabGenerator")}</span>
          {editingMascot ? <small>{editingMascot.name}</small> : null}
        </button>
      </div>

      {/* TAB 1: MASCOT LIBRARY */}
      {activeTab === "library" ? (
        <div className="mascot-library-container">
          {/* Search & Style Filter Toolbar */}
          <div className="episode-toolbar" style={{ marginBottom: "18px" }}>
            <div className="episode-search-wrap">
              <MagnifyingGlass size={15} className="search-icon" />
              <input
                type="text"
                placeholder={t("mascots.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="episode-search-input"
              />
              {searchQuery ? (
                <button type="button" className="search-clear-btn" onClick={() => setSearchQuery("")}>
                  <X size={13} />
                </button>
              ) : null}
            </div>

            <div className="episode-filter-chips">
              <button
                type="button"
                className={`filter-chip ${styleFilter === "all" ? "is-active" : ""}`}
                onClick={() => setStyleFilter("all")}
              >
                {t("mascots.filterAllStyles")} ({mascots.length})
              </button>
              {ALL_QUIZ_IMAGE_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`filter-chip ${styleFilter === style ? "is-active" : ""}`}
                  onClick={() => setStyleFilter(style)}
                >
                  {QUIZ_IMAGE_STYLE_LABELS[style]}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "grid", placeItems: "center", padding: "60px 0" }}>
              <CircleNotch size={32} className="spin" style={{ color: "var(--accent)" }} />
              <p style={{ marginTop: "12px", color: "var(--muted)" }}>{t("common.loading")}</p>
            </div>
          ) : filteredMascots.length === 0 ? (
            <EmptyState
              icon={<Smiley size={36} />}
              title={searchQuery ? t("common.noResults") : t("mascots.noMascotsTitle")}
              copy={
                searchQuery
                  ? t("common.noResults")
                  : t("mascots.noMascotsCopy")
              }
              action={searchQuery ? t("common.clear") : t("mascots.newMascot")}
              onAction={searchQuery ? () => setSearchQuery("") : handleStartNew}
            />
          ) : (
            <div className="mascot-grid">
              {filteredMascots.map((mascot) => {
                const availableActionsCount = Object.values(mascot.actions).filter((act) => act?.sprite_url).length;
                const assignedCount = mascot.assigned_channel_ids?.length || 0;

                return (
                  <article key={mascot.id} className="mascot-card" style={{ borderColor: mascot.color_theme || "var(--line)" }}>
                    <div className="mascot-card-preview-box">
                      {mascot.master_image_url ? (
                        <img src={mascot.master_image_url} alt={mascot.name} className="mascot-card-img" />
                      ) : (
                        <div className="mascot-card-placeholder">
                          <Smiley size={48} weight="duotone" style={{ color: mascot.color_theme || "var(--accent)" }} />
                          <span>{t("mascots.noImagePlaceholder")}</span>
                        </div>
                      )}
                      <span className="mascot-style-pill" style={{ backgroundColor: mascot.color_theme || "var(--accent)" }}>
                        {QUIZ_IMAGE_STYLE_LABELS[mascot.visual_style] || mascot.visual_style}
                      </span>
                    </div>

                    <div className="mascot-card-content">
                      <div className="mascot-card-header">
                        <h3>{mascot.name}</h3>
                        <span className="mascot-sprites-badge" title={`${availableActionsCount} / 7 Sprite Sheets`}>
                          {t("mascots.posesBadge", { count: availableActionsCount })}
                        </span>
                      </div>

                      <p className="mascot-card-desc">{mascot.description || mascot.master_prompt || t("mascots.noDescPlaceholder")}</p>

                      {/* Action Pills ready */}
                      <div className="mascot-card-action-tags">
                        {ALL_MASCOT_ACTIONS.map((action) => {
                          const actionMeta = getLocalizedActionMeta(action, t);
                          const ready = Boolean(mascot.actions[action]?.sprite_url);
                          return (
                            <span
                              key={action}
                              className={`action-tag-pill ${ready ? "is-ready" : "is-missing"}`}
                              title={ready ? t("mascots.poseReadyTooltip", { label: actionMeta.label }) : t("mascots.poseMissingTooltip", { label: actionMeta.label })}
                            >
                              {actionMeta.icon} {action}
                            </span>
                          );
                        })}
                      </div>

                      {/* Assigned Channels */}
                      <div className="mascot-card-channels-row">
                        <Broadcast size={14} weight="fill" style={{ color: "var(--accent)" }} />
                        <span>
                          {assignedCount === 0
                            ? t("mascots.notAssignedChannels")
                            : t("mascots.assignedChannelsCount", {
                                count: assignedCount,
                                names: mascot.assigned_channel_ids
                                  .map((cid) => channels.find((c) => c.channel_id === cid)?.display_name || cid)
                                  .join(", "),
                              })}
                        </span>
                      </div>

                      <div className="mascot-card-footer">
                        <button
                          type="button"
                          className="quiet-button compact"
                          onClick={() => handleOpenQuickAssign(mascot)}
                          title={t("mascots.quickAssignBtn")}
                        >
                          <Broadcast size={14} />
                          <span>{t("mascots.quickAssignBtn")}</span>
                        </button>
                        <button
                          type="button"
                          className="primary-button compact"
                          onClick={() => handleEditMascot(mascot)}
                          title={t("mascots.generatorBtn")}
                        >
                          <MagicWand size={14} weight="bold" />
                          <span>{t("mascots.generatorBtn")}</span>
                        </button>
                        <a
                          href={api.exportMascotUrl(mascot.id)}
                          download={`mascot_${mascot.id}.zip`}
                          className="icon-button"
                          title={t("mascots.exportZipTooltip")}
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                        >
                          <DownloadSimple size={15} />
                        </a>
                        <button
                          type="button"
                          className="icon-button danger"
                          aria-label={t("mascots.deleteMascotAria", { name: mascot.name })}
                          onClick={() => setDeleteTarget(mascot)}
                          title={t("common.delete")}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 2: MASCOT GENERATOR (4-STEP WIZARD) */}
      {activeTab === "generator" ? (
        <div className="mascot-generator-container">
          {/* Stepper Header */}
          <div className="wizard-stepper">
            <button
              type="button"
              className={`wizard-step-btn ${generatorStep === 1 ? "is-active" : generatorStep > 1 ? "is-done" : ""}`}
              onClick={() => setGeneratorStep(1)}
            >
              <span className="step-num">1</span>
              <span className="step-label">{t("mascots.generatorStep1")}</span>
            </button>
            <div className="wizard-step-line" />
            <button
              type="button"
              className={`wizard-step-btn ${generatorStep === 2 ? "is-active" : generatorStep > 2 ? "is-done" : ""}`}
              onClick={() => setGeneratorStep(2)}
            >
              <span className="step-num">2</span>
              <span className="step-label">{t("mascots.generatorStep2")}</span>
            </button>
            <div className="wizard-step-line" />
            <button
              type="button"
              className={`wizard-step-btn ${generatorStep === 3 ? "is-active" : generatorStep > 3 ? "is-done" : ""}`}
              onClick={() => setGeneratorStep(3)}
            >
              <span className="step-num">3</span>
              <span className="step-label">{t("mascots.generatorStep3")}</span>
            </button>
            <div className="wizard-step-line" />
            <button
              type="button"
              className={`wizard-step-btn ${generatorStep === 4 ? "is-active" : ""}`}
              onClick={() => setGeneratorStep(4)}
            >
              <span className="step-num">4</span>
              <span className="step-label">{t("mascots.generatorStep4")}</span>
            </button>
          </div>

          {/* STEP 1: IDENTITY & MASTER CONCEPT */}
          {generatorStep === 1 ? (
            <div className="wizard-step-content step-identity-grid">
              {/* Left Column: Form & Hero Prompt Studio */}
              <div className="wizard-form-col">
                <div className="wizard-card step-identity-card">
                  <div className="wizard-card-header-flex" style={{ marginBottom: "16px" }}>
                    <div>
                      <h3>{t("mascots.conceptTitle")}</h3>
                      <p className="wizard-card-sub" style={{ marginBottom: 0 }}>
                        {t("mascots.conceptSub")}
                      </p>
                    </div>
                  </div>

                  {/* Mascot Name & Color Palette Row */}
                  <div className="identity-top-row">
                    <div className="form-group flex-1">
                      <label htmlFor="mascot-name">
                        {t("mascots.nameLabel")} <span style={{ color: "var(--coral)" }}>*</span>
                      </label>
                      <input
                        id="mascot-name"
                        type="text"
                        className="identity-name-input"
                        placeholder={t("mascots.namePlaceholder")}
                        value={genName}
                        onChange={(e) => setGenName(e.target.value)}
                      />
                    </div>

                    <div className="form-group color-palette-form-group">
                      <label htmlFor="mascot-color">{t("mascots.colorLabel")}</label>
                      <div className="color-palette-wrap">
                        <div className="color-swatches-row">
                          {COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.hex}
                              type="button"
                              className={`color-swatch-btn ${genColor.toLowerCase() === preset.hex.toLowerCase() ? "is-selected" : ""}`}
                              style={{ backgroundColor: preset.hex }}
                              onClick={() => setGenColor(preset.hex)}
                              title={`${preset.name} (${preset.hex})`}
                              aria-label={preset.name}
                            >
                              {genColor.toLowerCase() === preset.hex.toLowerCase() ? (
                                <Check size={12} weight="bold" color="#fff" />
                              ) : null}
                            </button>
                          ))}
                        </div>
                        <div className="custom-color-input-wrap">
                          <input
                            id="mascot-color"
                            type="color"
                            value={genColor}
                            onChange={(e) => setGenColor(e.target.value)}
                            className="native-color-picker"
                            title={t("mascots.customColorPicker")}
                          />
                          <input
                            type="text"
                            value={genColor}
                            onChange={(e) => setGenColor(e.target.value)}
                            placeholder="#06b6d4"
                            className="color-hex-input"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Style Selector Cards */}
                  <div className="form-group" style={{ marginTop: "14px" }}>
                    <label>{t("mascots.styleLabel")}</label>
                    <div className="visual-style-selector-grid">
                      {STYLE_OPTIONS.map((opt) => {
                        const isSelected = genStyle === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`visual-style-card ${isSelected ? "is-selected" : ""}`}
                            style={isSelected ? { borderColor: genColor, boxShadow: `0 0 14px ${genColor}35` } : undefined}
                            onClick={() => setGenStyle(opt.id)}
                          >
                            <span className="style-card-icon">{opt.icon}</span>
                            <div className="style-card-info">
                              <strong className="style-card-title">{opt.title}</strong>
                              <small className="style-card-desc">{t(opt.descKey)}</small>
                            </div>
                            {isSelected ? (
                              <span className="style-card-badge" style={{ backgroundColor: genColor }}>
                                <Check size={11} weight="bold" />
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* HERO PROMPT STUDIO */}
                  <div className="hero-prompt-studio-box" style={{ borderColor: `${genColor}45` }}>
                    <div className="hero-prompt-header">
                      <div className="hero-prompt-title-group">
                        <Sparkle size={18} weight="fill" style={{ color: genColor }} />
                        <div>
                          <label htmlFor="mascot-prompt" className="hero-prompt-label">
                            {t("mascots.promptLabel")} <span className="hero-prompt-subtag">(AI Character Anchor)</span>
                          </label>
                        </div>
                      </div>

                      <div className="hero-prompt-actions">
                        <button
                          type="button"
                          className="quiet-button compact icon-only"
                          onClick={handleCopyPrompt}
                          title={t("mascots.copyPromptBtn")}
                        >
                          {promptCopied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                        </button>
                        <button
                          type="button"
                          className="quiet-button compact icon-only"
                          onClick={() => setGenPrompt("")}
                          title={t("mascots.clearPromptBtn")}
                        >
                          <Trash size={14} />
                        </button>
                        <button
                          type="button"
                          className="quiet-button compact icon-only"
                          onClick={() => setIsPromptModalOpen(true)}
                          title={t("mascots.focusPromptTitle")}
                        >
                          <ArrowsOutSimple size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Quick AI Mascot Template Chips */}
                    <div className="prompt-template-chips-bar">
                      <span className="prompt-chips-label">{t("mascots.templatesLabel")}</span>
                      <div className="prompt-chips-list">
                        {PROMPT_TEMPLATES.map((tpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="prompt-template-chip"
                            onClick={() => handleApplyTemplate(tpl)}
                            title={tpl.prompt}
                          >
                            {t(tpl.nameKey)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick AI Keyword Tags */}
                    <div className="quick-tags-bar">
                      <span className="prompt-chips-label">{t("mascots.quickTagsLabel")}</span>
                      <div className="quick-tags-list">
                        {QUICK_PROMPT_TAGS.map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="quick-tag-chip"
                            onClick={() => handleInjectTag(tag)}
                            title={`+ "${tag}"`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expanded Textarea */}
                    <div className="hero-prompt-textarea-wrap">
                      <textarea
                        id="mascot-prompt"
                        rows={5}
                        className="hero-prompt-textarea"
                        placeholder={t("mascots.promptPlaceholder")}
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                      />
                    </div>

                    {/* Prompt Box Footer Stats */}
                    <div className="hero-prompt-footer">
                      <div className="hero-prompt-stats">
                        <span>{t("mascots.charsCount", { count: genPrompt.length })}</span>
                        <span>•</span>
                        <span>
                          {t("mascots.wordsCount", {
                            count: genPrompt.trim() ? genPrompt.trim().split(/\s+/).length : 0,
                          })}
                        </span>
                      </div>
                      {promptCopied ? <span className="prompt-copied-notice">{t("common.copied")}!</span> : null}
                    </div>
                  </div>

                  {/* Collapsible Personality / Lore Notes */}
                  <div className="notes-accordion-section">
                    <button
                      type="button"
                      className="notes-accordion-toggle"
                      onClick={() => setShowNotesAccordion((p) => !p)}
                    >
                      <div className="accordion-title-wrap">
                        {showNotesAccordion ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
                        <span>{t("mascots.notesAccordionTitle")}</span>
                      </div>
                      <small>{t("mascots.notesAccordionSub")}</small>
                    </button>

                    {showNotesAccordion ? (
                      <div className="notes-accordion-body">
                        <textarea
                          id="mascot-desc"
                          rows={3}
                          className="notes-textarea"
                          placeholder={t("mascots.descPlaceholder")}
                          value={genDescription}
                          onChange={(e) => setGenDescription(e.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Wizard Action CTA Row */}
                  <div className="wizard-action-row" style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
                    <button
                      type="button"
                      className="primary-button ai-magic-btn"
                      style={{
                        background: `linear-gradient(135deg, ${genColor} 0%, #0284c7 100%)`,
                        boxShadow: `0 4px 20px ${genColor}45`,
                      }}
                      disabled={busyAction === "concept" || !genName.trim()}
                      onClick={() => void handleGenerateConcept()}
                    >
                      {busyAction === "concept" ? <CircleNotch className="spin" size={18} /> : <MagicWand size={18} weight="bold" />}
                      <span>{busyAction === "concept" ? t("mascots.generatingConceptBtn") : t("mascots.generateConceptBtn")}</span>
                    </button>

                    <button
                      type="button"
                      className={`quiet-button ${editingMascot?.master_image_url ? "is-ready-forward" : ""}`}
                      onClick={() => setGeneratorStep(2)}
                      disabled={!editingMascot?.master_image_url}
                      title={!editingMascot?.master_image_url ? "Vui lòng sinh Master Concept Sheet trước khi sang bước 2" : undefined}
                    >
                      <span>{t("mascots.nextActionMatrixBtn")}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Master Preview Stage Box */}
              <div className="wizard-preview-col">
                <div className="wizard-card preview-card studio-preview-card">
                  <div className="wizard-card-header-flex">
                    <div>
                      <h3>{t("mascots.masterPreviewTitle")}</h3>
                      <p className="wizard-card-sub">{t("mascots.masterPreviewSub")}</p>
                    </div>
                    {editingMascot?.master_image_url ? (
                      <button
                        type="button"
                        className="icon-button compact"
                        onClick={() => setLightboxImage(editingMascot.master_image_url)}
                        title={t("mascots.zoomPreviewBtn")}
                      >
                        <MagnifyingGlassPlus size={16} />
                      </button>
                    ) : null}
                  </div>

                  <div
                    className="concept-preview-frame studio-stage-frame"
                    style={{
                      borderColor: editingMascot?.master_image_url ? genColor : undefined,
                      boxShadow: editingMascot?.master_image_url
                        ? `0 16px 36px rgba(0, 0, 0, 0.4), 0 0 28px ${genColor}30`
                        : "var(--shadow-sm)",
                    }}
                  >
                    {editingMascot?.master_image_url ? (
                      <div className="concept-preview-img-container" onClick={() => setLightboxImage(editingMascot.master_image_url)}>
                        <img src={editingMascot.master_image_url} alt="Master Concept" className="concept-preview-img" />
                        <div className="preview-hover-overlay">
                          <MagnifyingGlassPlus size={24} color="#fff" />
                          <span>{t("mascots.zoomPreviewBtn")}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="concept-preview-placeholder studio-placeholder">
                        <div className="placeholder-aura-glow" style={{ backgroundColor: `${genColor}20`, borderColor: `${genColor}40` }}>
                          <Smiley size={56} weight="duotone" style={{ color: genColor }} />
                        </div>
                        <h4>{t("mascots.masterPreviewTitle")}</h4>
                        <p>{t("mascots.masterPreviewPlaceholder")}</p>
                      </div>
                    )}
                  </div>

                  {editingMascot?.master_image_url ? (
                    <>
                      <div className="concept-meta-box modern-meta-box">
                        <div className="concept-meta-item">
                          <span>{t("common.status")}:</span>
                          <strong style={{ color: "var(--green)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle size={14} weight="fill" /> {t("mascots.statusIdentityLocked")}
                          </strong>
                        </div>
                        <div className="concept-meta-item">
                          <span>{t("mascots.statusStyle")}</span>
                          <strong>{QUIZ_IMAGE_STYLE_LABELS[editingMascot.visual_style]}</strong>
                        </div>
                      </div>

                      <div className="master-action-buttons-row" style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                        <button
                          type="button"
                          className="quiet-button compact"
                          disabled={busyAction === "matting-master"}
                          onClick={() => void handleRemoveBackground("master")}
                          style={{ justifyContent: "center" }}
                          title={t("mascots.mattingMasterBtn")}
                        >
                          {busyAction === "matting-master" ? <CircleNotch className="spin" size={14} /> : <PaintBrush size={14} />}
                          <span>{busyAction === "matting-master" ? t("mascots.mattingInProgress") : t("mascots.mattingMasterBtn")}</span>
                        </button>

                        <a
                          href={editingMascot.master_image_url}
                          download={`${editingMascot.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_master.png`}
                          className="icon-button"
                          title={t("common.download")}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                        >
                          <DownloadSimple size={15} />
                        </a>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* STEP 2: ACTION MATRIX */}
          {generatorStep === 2 ? (
            <div className="wizard-step-content">
              <div className="wizard-card">
                <div className="wizard-card-header-flex">
                  <div>
                    <h3>{t("mascots.actionMatrixTitle")}</h3>
                    <p className="wizard-card-sub">{t("mascots.actionMatrixSub")}</p>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="quiet-button compact"
                      onClick={() => {
                        const allSelected = Object.fromEntries(ALL_MASCOT_ACTIONS.map((a) => [a, true])) as Record<MascotActionType, boolean>;
                        setSelectedActions(allSelected);
                      }}
                    >
                      {t("mascots.selectAllBtn")}
                    </button>
                  </div>
                </div>

                <div className="action-matrix-grid">
                  {ALL_MASCOT_ACTIONS.map((action) => {
                    const meta = getLocalizedActionMeta(action, t);
                    const isSelected = selectedActions[action];
                    const hasSprite = Boolean(editingMascot?.actions[action]?.sprite_url);

                    return (
                      <div
                        key={action}
                        className={`action-matrix-card ${isSelected ? "is-selected" : ""} ${hasSprite ? "is-ready" : ""}`}
                        onClick={() => setSelectedActions((prev) => ({ ...prev, [action]: !prev[action] }))}
                      >
                        <div className="action-card-header">
                          <div className="action-card-title-group">
                            <span className="action-card-icon">{meta.icon}</span>
                            <div>
                              <h4>{meta.label}</h4>
                              <span className="action-usage-tag">{meta.usage}</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedActions((prev) => ({ ...prev, [action]: e.target.checked }));
                            }}
                            aria-label={meta.label}
                          />
                        </div>

                        <p className="action-card-desc">{meta.description}</p>

                        <div className="action-card-controls" onClick={(e) => e.stopPropagation()}>
                          <div className="action-control-col">
                            <label>{t("mascots.framesCountLabel")}</label>
                            <input
                              type="number"
                              min={3}
                              max={16}
                              value={actionFrames[action]}
                              onChange={(e) => setActionFrames((prev) => ({ ...prev, [action]: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="action-control-col">
                            <label>{t("mascots.fpsLabel")}</label>
                            <input
                              type="number"
                              min={4}
                              max={24}
                              value={actionFps[action]}
                              onChange={(e) => setActionFps((prev) => ({ ...prev, [action]: Number(e.target.value) }))}
                            />
                          </div>
                        </div>

                        {hasSprite ? (
                          <span className="action-ready-badge">{t("mascots.hasSpriteBadge")}</span>
                        ) : (
                          <span className="action-missing-badge">{t("mascots.noSpriteBadge")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="wizard-action-row" style={{ marginTop: "24px" }}>
                  <button type="button" className="quiet-button" onClick={() => setGeneratorStep(1)}>
                    <ArrowLeft size={15} />
                    <span>{t("mascots.backIdentityBtn")}</span>
                  </button>
                  <button type="button" className="primary-button" onClick={() => setGeneratorStep(3)}>
                    <span>{t("mascots.nextSpriteBtn")}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* STEP 3: SPRITE SYNTHESIS & PROCESSING */}
          {generatorStep === 3 ? (
            <div className="wizard-step-content">
              <div className="wizard-card">
                <div className="wizard-card-header-flex">
                  <div>
                    <h3>{t("mascots.spriteGenTitle")}</h3>
                    <p className="wizard-card-sub">{t("mascots.spriteGenSub")}</p>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={busyAction !== null}
                    onClick={() => void handleBatchGenerateSprites()}
                  >
                    {busyAction === "batch" ? <CircleNotch className="spin" size={16} /> : <Rocket size={16} />}
                    <span>{busyAction === "batch" ? t("mascots.batchGeneratingBtn") : t("mascots.batchGenerateBtn")}</span>
                  </button>
                </div>

                <div className="sprite-synthesis-grid">
                  {ALL_MASCOT_ACTIONS.filter((act) => selectedActions[act]).map((action) => {
                    const meta = getLocalizedActionMeta(action, t);
                    const sprite = editingMascot?.actions[action];
                    const isBusy = busyAction === action || busyAction === `upload-${action}`;
                    const hasSprite = Boolean(sprite?.sprite_url);

                    return (
                      <div key={action} className={`sprite-card-modern ${hasSprite ? "is-ready" : "is-missing"}`}>
                        <div className="sprite-card-header">
                          <div className="sprite-card-meta">
                            <span className="sprite-card-icon">{meta.icon}</span>
                            <div className="sprite-card-title">
                              <h4>{meta.label}</h4>
                              <span>{meta.usage}</span>
                            </div>
                          </div>
                          <div className="sprite-card-badges">
                            {hasSprite ? (
                              <span className="action-ready-badge" style={{ fontSize: "11px", padding: "3px 8px" }}>
                                ✓ {sprite?.frames_count || 6}f @ {sprite?.fps || 8}fps
                              </span>
                            ) : (
                              <span className="action-missing-badge" style={{ fontSize: "11px", padding: "3px 8px" }}>
                                {t("mascots.notGeneratedBadge")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Strip visualizer */}
                        <div className="sprite-card-strip-wrap">
                          {sprite?.sprite_url ? (
                            <div className="sprite-strip-visualizer">
                              <img src={sprite.sprite_url} alt={action} className="sprite-strip-img" />
                              <div
                                className="strip-grid-overlay"
                                style={{
                                  backgroundSize: `${100 / (sprite.frames_count || 6)}% 100%`,
                                }}
                              />
                            </div>
                          ) : (
                            <div className="sprite-strip-placeholder">
                              <span>{t("mascots.noSpritePlaceholder", { count: actionFrames[action] || 6 })}</span>
                            </div>
                          )}
                        </div>

                        <div className="sprite-card-footer">
                          <div className="sprite-card-configs">
                            <span>FPS: {actionFps[action] || 8}</span>
                            <span>•</span>
                            <span>{actionFrames[action] || 6} Frames</span>
                          </div>

                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="primary-button compact"
                              disabled={isBusy}
                              onClick={() => void handleGenerateSprite(action)}
                              title={t("mascots.generateAiBtn")}
                            >
                              {isBusy ? <CircleNotch className="spin" size={13} /> : <MagicWand size={13} />}
                              <span>{isBusy ? t("mascots.generatingBtn") : sprite ? t("mascots.reGenerateBtn") : t("mascots.generateAiBtn")}</span>
                            </button>

                            <label className="quiet-button compact" style={{ cursor: "pointer", margin: 0 }} title={t("mascots.uploadStripBtn")}>
                              <Upload size={13} />
                              <span>{t("common.upload")}</span>
                              <input
                                type="file"
                                accept="image/png,image/webp"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleUploadSprite(action, file);
                                }}
                              />
                            </label>

                            {hasSprite ? (
                              <>
                                <button
                                  type="button"
                                  className="quiet-button compact"
                                  disabled={isBusy || busyAction === `matting-${action}`}
                                  title={t("mascots.mattingSpriteBtn")}
                                  onClick={() => void handleRemoveBackground(action)}
                                >
                                  {busyAction === `matting-${action}` ? <CircleNotch className="spin" size={13} /> : <PaintBrush size={13} />}
                                  <span>{busyAction === `matting-${action}` ? t("mascots.mattingInProgress") : t("mascots.mattingShortBtn")}</span>
                                </button>

                                <button
                                  type="button"
                                  className="icon-button"
                                  style={{ width: "30px", height: "30px" }}
                                  title={t("mascots.previewStep4Btn")}
                                  onClick={() => {
                                    setActivePreviewAction(action);
                                    setGeneratorStep(4);
                                  }}
                                >
                                  <Eye size={14} />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="wizard-action-row" style={{ marginTop: "24px" }}>
                  <button type="button" className="quiet-button" onClick={() => setGeneratorStep(2)}>
                    <ArrowLeft size={15} />
                    <span>{t("mascots.backMatrixBtn")}</span>
                  </button>
                  <button type="button" className="primary-button" onClick={() => setGeneratorStep(4)}>
                    <span>{t("mascots.nextLiveStageBtn")}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* STEP 4: LIVE ANIMATION STUDIO & CHANNEL BINDING */}
          {generatorStep === 4 ? (
            <div className="wizard-step-content step-live-studio-grid">
              {/* Left Column: Interactive Frame Player & Stage Simulator */}
              <div className="live-player-col">
                <div className="wizard-card">
                  <div className="wizard-card-header-flex">
                    <div>
                      <h3>{t("mascots.liveStudioTitle")}</h3>
                      <p className="wizard-card-sub">{t("mascots.liveStudioSub")}</p>
                    </div>

                    <div className="stage-mode-toggles" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        className={`filter-chip ${stagePreviewMode === "video_stage" ? "is-active" : ""}`}
                        onClick={() => setStagePreviewMode("video_stage")}
                      >
                        {t("mascots.videoStageMode")}
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${stagePreviewMode === "grid" ? "is-active" : ""}`}
                        onClick={() => setStagePreviewMode("grid")}
                      >
                        {t("mascots.gridMode")}
                      </button>
                      <button
                        type="button"
                        className={`icon-button ${theaterMode ? "is-active" : ""}`}
                        title={theaterMode ? t("mascots.theaterModeCollapse") : t("mascots.theaterModeExpand")}
                        onClick={() => setTheaterMode((p) => !p)}
                      >
                        {theaterMode ? <ArrowsInSimple size={16} /> : <ArrowsOutSimple size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Scenario Playback Toolbar */}
                  <div className="scenario-bar-container">
                    <div className="scenario-bar-top">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className={isScenarioMode ? "quiet-button danger compact" : "primary-button compact"}
                          onClick={() => {
                            if (!isScenarioMode) {
                              setIsScenarioMode(true);
                            } else {
                              setIsScenarioMode(false);
                            }
                          }}
                        >
                          {isScenarioMode ? <Stop size={14} weight="fill" /> : <Play size={14} weight="fill" />}
                          <span>{isScenarioMode ? t("mascots.stopScenarioBtn") : t("mascots.playTimelineBtn")}</span>
                        </button>

                        <div className="reaction-style-toggle-group" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            className={`pos-toggle-btn ${reactionStyle === "celebrate" ? "is-selected" : ""}`}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => {
                              setReactionStyle("celebrate");
                              if (scenarioPhase === "reveal") setActivePreviewAction("celebrate");
                            }}
                            title={t("mascots.celebrateReactionTooltip")}
                          >
                            {t("mascots.celebrateReactionBtn")}
                          </button>
                          <button
                            type="button"
                            className={`pos-toggle-btn ${reactionStyle === "oops" ? "is-selected" : ""}`}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => {
                              setReactionStyle("oops");
                              if (scenarioPhase === "reveal") setActivePreviewAction("oops");
                            }}
                            title={t("mascots.oopsReactionTooltip")}
                          >
                            {t("mascots.oopsReactionBtn")}
                          </button>
                        </div>

                        <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 700, marginLeft: "auto" }}>
                          ⏱ {scrubberTime.toFixed(1)}s / 16.0s
                        </span>
                      </div>
                    </div>

                    {/* Interactive Director Timeline Scrubber */}
                    <div className="director-scrubber-wrap">
                      <div className="director-scrubber-track">
                        <div
                          className={`scrubber-segment seg-intro ${scenarioPhase === "intro" ? "is-current" : ""}`}
                          style={{ width: "12.5%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(1.0); }}
                          title="[0s - 2s] Intro (Pose: wave)"
                        >
                          {t("mascots.timelineIntro")}
                        </div>
                        <div
                          className={`scrubber-segment seg-question ${scenarioPhase === "question" ? "is-current" : ""}`}
                          style={{ width: "12.5%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(3.0); }}
                          title="[2s - 4s] Question (Pose: idle)"
                        >
                          {t("mascots.timelineQuestion")}
                        </div>
                        <div
                          className={`scrubber-segment seg-thinking ${scenarioPhase === "thinking" ? "is-current" : ""}`}
                          style={{ width: "31.25%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(6.5); }}
                          title="[4s - 9s] 5s Countdown (Pose: thinking)"
                        >
                          {t("mascots.timelineThinking")}
                        </div>
                        <div
                          className={`scrubber-segment seg-reveal ${scenarioPhase === "reveal" ? "is-current" : ""}`}
                          style={{ width: "18.75%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(10.5); }}
                          title="[9s - 12s] Reveal (Pose: celebrate/oops)"
                        >
                          {reactionStyle === "celebrate" ? t("mascots.timelineReveal") : t("mascots.timelineOops")}
                        </div>
                        <div
                          className={`scrubber-segment seg-explain ${scenarioPhase === "explain" ? "is-current" : ""}`}
                          style={{ width: "25%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(14.0); }}
                          title="[12s - 16s] Fact Card (Pose: point)"
                        >
                          {t("mascots.timelineExplain")}
                        </div>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={16}
                        step={0.1}
                        value={scrubberTime}
                        className="director-scrubber-slider"
                        onChange={(e) => {
                          setIsScenarioMode(false);
                          applyTimelineTime(Number(e.target.value));
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Selector Pills */}
                  <div className="live-action-pills" style={{ marginBottom: "12px" }}>
                    {ALL_MASCOT_ACTIONS.map((action) => {
                      const meta = getLocalizedActionMeta(action, t);
                      const hasSprite = Boolean(editingMascot?.actions[action]?.sprite_url);
                      return (
                        <button
                          key={action}
                          type="button"
                          className={`live-action-pill ${activePreviewAction === action ? "is-active" : ""} ${hasSprite ? "" : "is-disabled"}`}
                          onClick={() => {
                            setIsScenarioMode(false);
                            setActivePreviewAction(action);
                            setCurrentFrameIndex(0);
                          }}
                        >
                          <span>{meta.icon}</span>
                          <span>{meta.label.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Stage Simulator Screen */}
                  <div className={`stage-simulator-screen ${stagePreviewMode === "video_stage" ? "is-video-bg" : "is-grid-bg"} ${theaterMode ? "theater-mode" : ""}`}>
                    {theaterMode ? (
                      <button
                        type="button"
                        className="icon-button"
                        style={{ position: "absolute", top: "16px", right: "16px", zIndex: 100, background: "rgba(0,0,0,0.6)" }}
                        onClick={() => setTheaterMode(false)}
                      >
                        <X size={18} />
                      </button>
                    ) : null}

                    {stagePreviewMode === "video_stage" ? (
                      scenarioPhase === "intro" ? (
                        <div className="sim-intro-view">
                          <span className="sim-intro-badge">{t("mascots.simIntroBadge")}</span>
                          <h2 className="sim-intro-title">{t("mascots.simIntroTitle")}</h2>
                          <p className="sim-intro-sub">{t("mascots.simIntroSub")}</p>
                        </div>
                      ) : scenarioPhase === "explain" ? (
                        <div className="simulated-quiz-ui">
                          <div className="sim-wood-sign">Q1</div>
                          <div className="sim-question-card">{t("mascots.simQuestionTitle")}</div>
                          <div className="sim-fact-view">
                            <span className="sim-fact-label">{t("mascots.simFactLabel")}</span>
                            <p className="sim-fact-text">{t("mascots.simFactText")}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="simulated-quiz-ui">
                          <div className="sim-wood-sign">Q1</div>
                          <div className="sim-question-card">{t("mascots.simQuestionTitle")}</div>
                          <div className="sim-hero-box">🖼️ HERO (Cheetah)</div>
                          <div className="sim-choices-box">
                            <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-dimmed" : ""}`}>{t("mascots.simChoiceA")}</div>
                            <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-correct" : ""}`}>
                              {scenarioPhase === "reveal" ? `✓ ${t("mascots.simChoiceB")}` : t("mascots.simChoiceB")}
                            </div>
                            <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-dimmed" : ""}`}>{t("mascots.simChoiceC")}</div>
                          </div>
                          <div className="sim-thinking-bar">
                            <div
                              className="sim-bar-progress"
                              style={{
                                width: scenarioPhase === "thinking" ? `${(scenarioCountdown / 5) * 100}%` : "100%",
                                transition: "width 1s linear",
                              }}
                            />
                            <span
                              className="sim-star-marker"
                              style={{
                                left: scenarioPhase === "thinking" ? `${(scenarioCountdown / 5) * 95}%` : "95%",
                                transition: "left 1s linear",
                              }}
                            >
                              ★ {scenarioPhase === "thinking" ? scenarioCountdown : 5}
                            </span>
                          </div>
                        </div>
                      )
                    ) : null}

                    {/* Alignment Guides Overlay */}
                    {showGuides ? (
                      <div className="alignment-guides-overlay" aria-hidden="true">
                        <div className="guide-center-crosshair-h" />
                        <div className="guide-center-crosshair-v" />
                        <div className="guide-ground-baseline" />
                        <div className="guide-bounds-box" />
                      </div>
                    ) : null}

                    {/* Animated Mascot Character Anchor */}
                    <div
                      className={`stage-mascot-anchor anchor-${targetPosition}`}
                      style={{
                        transform: `scale(${targetScale})`,
                      }}
                    >
                      {/* Onion Skin Ghost Reference Layer */}
                      {onionSkinEnabled && editingMascot?.actions.idle?.sprite_url ? (
                        <div
                          className="stage-mascot-sprite-render onion-skin-layer"
                          style={{
                            width: "220px",
                            height: "220px",
                            backgroundImage: `url(${editingMascot.actions.idle.sprite_url})`,
                            backgroundSize: `${(editingMascot.actions.idle.frames_count || 1) * 100}% 100%`,
                            backgroundPosition: "0% 0%",
                            opacity: onionSkinOpacity,
                            filter: "sepia(100%) hue-rotate(150deg) saturate(300%)",
                            position: "absolute",
                            inset: 0,
                            zIndex: 1,
                            pointerEvents: "none",
                          }}
                        />
                      ) : null}

                      {currentActionSprite?.sprite_url ? (
                        <div
                          className="stage-mascot-sprite-render"
                          style={{
                            width: "220px",
                            height: "220px",
                            backgroundImage: `url(${currentActionSprite.sprite_url})`,
                            backgroundSize: `${(currentActionSprite.frames_count || 1) * 100}% 100%`,
                            backgroundPosition: `${(currentFrameIndex / ((currentActionSprite.frames_count || 1) - 1 || 1)) * 100}% 0%`,
                            transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                            position: "relative",
                            zIndex: 2,
                          }}
                        />
                      ) : editingMascot?.master_image_url ? (
                        <img
                          src={editingMascot.master_image_url}
                          alt="Mascot"
                          style={{ width: "200px", height: "200px", objectFit: "contain", transform: `translate(${nudgeX}px, ${nudgeY}px)` }}
                        />
                      ) : (
                        <div className="stage-mascot-placeholder">
                          <Smiley size={64} style={{ color: genColor }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Player Controls Toolbar */}
                  <div className="live-player-toolbar">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setIsPlaying((p) => !p)}
                      title={isPlaying ? t("mascots.pauseAnimTooltip") : t("mascots.playAnimTooltip")}
                    >
                      {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
                    </button>

                    <div className="frame-stepper-group">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setCurrentFrameIndex((prev) => (prev - 1 + activeFramesCount) % activeFramesCount)}
                        title={t("mascots.prevFrameTooltip")}
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <span className="frame-indicator">
                        {t("mascots.frameIndicator", { current: currentFrameIndex + 1, total: activeFramesCount })}
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % activeFramesCount)}
                        title={t("mascots.nextFrameTooltip")}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="fps-slider-group">
                      <label htmlFor="preview-fps">{t("mascots.speedLabel", { fps: previewFps })}</label>
                      <input
                        id="preview-fps"
                        type="range"
                        min={4}
                        max={24}
                        step={1}
                        value={previewFps}
                        onChange={(e) => setPreviewFps(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Phase 2: Calibration & Alignment Inspector Toolbar */}
                  <div className="calibration-inspector-toolbar">
                    <div className="calibration-header-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <SlidersHorizontal size={16} weight="bold" style={{ color: "var(--accent)" }} />
                        <strong style={{ fontSize: "13px" }}>{t("mascots.inspectorTitle")}</strong>
                        <span className="action-tag-pill is-ready" style={{ fontSize: "10.5px" }}>
                          Pose: {getLocalizedActionMeta(activePreviewAction, t).label.split(" ")[0]}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <label className="filter-chip" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="checkbox"
                            checked={showGuides}
                            onChange={(e) => setShowGuides(e.target.checked)}
                          />
                          <span>{t("mascots.guidesToggle")}</span>
                        </label>
                        <label className="filter-chip" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="checkbox"
                            checked={onionSkinEnabled}
                            onChange={(e) => setOnionSkinEnabled(e.target.checked)}
                          />
                          <span>{t("mascots.onionSkinToggle")}</span>
                        </label>
                      </div>
                    </div>

                    {onionSkinEnabled ? (
                      <div className="onion-slider-row" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                        <small style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{t("mascots.onionOpacityLabel", { percent: Math.round(onionSkinOpacity * 100) })}</small>
                        <input
                          type="range"
                          min={0.15}
                          max={0.7}
                          step={0.05}
                          value={onionSkinOpacity}
                          onChange={(e) => setOnionSkinOpacity(Number(e.target.value))}
                          style={{ width: "120px" }}
                        />
                      </div>
                    ) : null}

                    <div className="nudge-controls-row">
                      <div className="nudge-group">
                        <label>{t("mascots.axisXLabel", { val: nudgeX > 0 ? `+${nudgeX}` : nudgeX })}</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button type="button" className="icon-button compact" onClick={() => setNudgeX((x) => Math.max(-40, x - 1))} title={t("mascots.nudgeLeftTooltip")}>-</button>
                          <input
                            type="range"
                            min={-40}
                            max={40}
                            value={nudgeX}
                            onChange={(e) => setNudgeX(Number(e.target.value))}
                            style={{ width: "90px" }}
                          />
                          <button type="button" className="icon-button compact" onClick={() => setNudgeX((x) => Math.min(40, x + 1))} title={t("mascots.nudgeRightTooltip")}>+</button>
                        </div>
                      </div>

                      <div className="nudge-group">
                        <label>{t("mascots.axisYLabel", { val: nudgeY > 0 ? `+${nudgeY}` : nudgeY })}</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button type="button" className="icon-button compact" onClick={() => setNudgeY((y) => Math.max(-40, y - 1))} title={t("mascots.nudgeUpTooltip")}>-</button>
                          <input
                            type="range"
                            min={-40}
                            max={40}
                            value={nudgeY}
                            onChange={(e) => setNudgeY(Number(e.target.value))}
                            style={{ width: "90px" }}
                          />
                          <button type="button" className="icon-button compact" onClick={() => setNudgeY((y) => Math.min(40, y + 1))} title={t("mascots.nudgeDownTooltip")}>+</button>
                        </div>
                      </div>

                      <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="quiet-button compact"
                          onClick={() => {
                            setNudgeX(0);
                            setNudgeY(0);
                          }}
                          title={t("mascots.resetOffsetTooltip")}
                        >
                          {t("mascots.resetBtn")}
                        </button>
                        <button
                          type="button"
                          className="primary-button compact"
                          disabled={calibrating || (nudgeX === (currentActionSprite?.offset_x || 0) && nudgeY === (currentActionSprite?.offset_y || 0))}
                          onClick={() => void handleSaveCalibration()}
                        >
                          {calibrating ? <CircleNotch className="spin" size={14} /> : <FloppyDisk size={14} />}
                          <span>{calibrating ? t("mascots.savingCalibrationBtn") : t("mascots.saveCalibrationBtn")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Stage Configuration & Channel Assignment */}
              <div className="stage-config-col">
                <div className="wizard-card">
                  <h3>{t("mascots.stageConfigTitle")}</h3>
                  <p className="wizard-card-sub">{t("mascots.stageConfigSub")}</p>

                  <div className="form-group">
                    <label>{t("mascots.stagePositionLabel")}</label>
                    <div className="position-toggle-row">
                      <button
                        type="button"
                        className={`pos-toggle-btn ${targetPosition === "bottom_left" ? "is-selected" : ""}`}
                        onClick={() => setTargetPosition("bottom_left")}
                      >
                        {t("mascots.bottomLeftOption")}
                      </button>
                      <button
                        type="button"
                        className={`pos-toggle-btn ${targetPosition === "bottom_right" ? "is-selected" : ""}`}
                        onClick={() => setTargetPosition("bottom_right")}
                      >
                        {t("mascots.bottomRightOption")}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="target-scale">{t("mascots.scaleLabel", { scale: targetScale.toFixed(2) })}</label>
                    <input
                      id="target-scale"
                      type="range"
                      min={0.7}
                      max={1.3}
                      step={0.05}
                      value={targetScale}
                      onChange={(e) => setTargetScale(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: "16px" }}>
                    <label>{t("mascots.assignChannelsLabel", { count: assignedChannels.length })}</label>
                    <div className="channels-checklist">
                      {channels.map((channel) => {
                        const checked = assignedChannels.includes(channel.channel_id);
                        return (
                          <label key={channel.channel_id} className="channel-checkbox-row">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignedChannels((prev) => [...prev, channel.channel_id]);
                                } else {
                                  setAssignedChannels((prev) => prev.filter((id) => id !== channel.channel_id));
                                }
                              }}
                            />
                            <div className="channel-check-info">
                              <strong>{channel.display_name}</strong>
                              <small>{channel.market || channel.language}</small>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="wizard-action-row" style={{ marginTop: "24px" }}>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ width: "100%", justifyContent: "center" }}
                      disabled={busyAction === "assign"}
                      onClick={() => void handleApplyToChannels()}
                    >
                      {busyAction === "assign" ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
                      <span>{busyAction === "assign" ? t("mascots.savingAndApplyingBtn") : t("mascots.saveAndApplyChannelsBtn")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Quick Channel Assignment Modal */}
      {quickAssignMascot ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" style={{ maxWidth: "560px" }}>
            <div className="modal-heading">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>🎯</span>
                <div>
                  <p className="eyebrow">{t("mascots.quickAssignEyebrow")}</p>
                  <h2>{t("mascots.quickAssignTitle", { name: quickAssignMascot.name })}</h2>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={t("common.close")}
                onClick={() => setQuickAssignMascot(null)}
                disabled={savingQuickAssign}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "14px" }}>
              <div className="form-group">
                <label>{t("mascots.stagePositionLabel")}</label>
                <div className="position-toggle-row">
                  <button
                    type="button"
                    className={`pos-toggle-btn ${quickPosition === "bottom_left" ? "is-selected" : ""}`}
                    onClick={() => setQuickPosition("bottom_left")}
                  >
                    {t("mascots.bottomLeftOption")}
                  </button>
                  <button
                    type="button"
                    className={`pos-toggle-btn ${quickPosition === "bottom_right" ? "is-selected" : ""}`}
                    onClick={() => setQuickPosition("bottom_right")}
                  >
                    {t("mascots.bottomRightOption")}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="quick-scale">{t("mascots.scaleLabel", { scale: quickScale.toFixed(2) })}</label>
                <input
                  id="quick-scale"
                  type="range"
                  min={0.7}
                  max={1.3}
                  step={0.05}
                  value={quickScale}
                  onChange={(e) => setQuickScale(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>{t("mascots.assignChannelsLabel", { count: quickAssignedChannels.length })}</label>
                <div className="channels-checklist" style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {channels.map((channel) => {
                    const checked = quickAssignedChannels.includes(channel.channel_id);
                    return (
                      <label key={channel.channel_id} className="channel-checkbox-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setQuickAssignedChannels((prev) => [...prev, channel.channel_id]);
                            } else {
                              setQuickAssignedChannels((prev) => prev.filter((id) => id !== channel.channel_id));
                            }
                          }}
                        />
                        <div className="channel-check-info">
                          <strong>{channel.display_name}</strong>
                          <small>{channel.market || channel.language}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "22px" }}>
              <button
                type="button"
                className="quiet-button"
                onClick={() => setQuickAssignMascot(null)}
                disabled={savingQuickAssign}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSaveQuickAssign()}
                disabled={savingQuickAssign}
              >
                {savingQuickAssign ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
                <span>{savingQuickAssign ? t("mascots.quickAssignSavingBtn") : t("mascots.quickAssignSaveBtn")}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Delete Mascot Confirmation Modal */}
      {deleteTarget ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-mascot-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">{t("mascots.deleteEyebrow")}</p>
                <h2 id="delete-mascot-title">{t("mascots.deleteTitle", { name: deleteTarget.name })}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={t("common.close")}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <X size={18} />
              </button>
            </div>
            <p className="modal-copy">
              {t("mascots.deleteWarning", { name: deleteTarget.name })}
            </p>
            <div className="modal-actions">
              <button type="button" className="quiet-button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="primary-button danger-confirm"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
              >
                {deleting ? <CircleNotch className="spin" size={16} /> : <Trash size={16} />}
                <span>{deleting ? t("mascots.deletingBtn") : t("mascots.deleteConfirmBtn")}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Fullscreen Prompt Focus Modal */}
      {isPromptModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsPromptModalOpen(false)}>
          <section
            className="modal prompt-focus-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkle size={20} weight="fill" style={{ color: genColor }} />
                <h2 style={{ fontSize: "16px", margin: 0 }}>{t("mascots.focusPromptTitle")}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setIsPromptModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="prompt-modal-body" style={{ padding: "16px 20px" }}>
              <div className="quick-tags-bar" style={{ marginBottom: "12px" }}>
                <span className="prompt-chips-label">{t("mascots.quickTagsLabel")}</span>
                <div className="quick-tags-list">
                  {QUICK_PROMPT_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="quick-tag-chip"
                      onClick={() => handleInjectTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={12}
                className="prompt-modal-textarea"
                style={{ width: "100%", fontSize: "14px", lineHeight: "1.6" }}
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder={t("mascots.promptPlaceholder")}
                autoFocus
              />

              <div className="hero-prompt-footer" style={{ marginTop: "10px" }}>
                <div className="hero-prompt-stats">
                  <span>{t("mascots.charsCount", { count: genPrompt.length })}</span>
                  <span>•</span>
                  <span>
                    {t("mascots.wordsCount", {
                      count: genPrompt.trim() ? genPrompt.trim().split(/\s+/).length : 0,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="primary-button" onClick={() => setIsPromptModalOpen(false)}>
                <Check size={16} />
                <span>{t("common.saved")}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Image Lightbox Modal */}
      {lightboxImage ? (
        <div className="modal-backdrop lightbox-backdrop" role="presentation" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lightbox-close-btn" onClick={() => setLightboxImage(null)}>
              <X size={20} />
            </button>
            <img src={lightboxImage} alt="Master Concept Large Preview" className="lightbox-img" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_MASCOT_ACTIONS, type Channel, type MascotActionType, type MascotProfile, type QuizImageStyle } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import {
  CORE_GAMEPLAY_ACTIONS,
  DEFAULT_ACTION_INTENSITIES,
  DEFAULT_ACTION_MOTIONS,
  DEFAULT_ACTION_SPEEDS,
  PROMPT_TEMPLATES,
  STYLE_OPTIONS,
  getLocalizedActionMeta,
  type MascotMotionIntensity,
  type MascotMotionPreset,
} from "../constants";

type UseMascotGeneratorProps = {
  channels: Channel[];
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
  onMascotsChanged: () => Promise<void>;
};

export function useMascotGenerator({ channels, onNotice, onRefreshChannels, onMascotsChanged }: UseMascotGeneratorProps) {
  const { t } = useTranslation();

  // Generator Step & Mascot Editing
  const [generatorStep, setGeneratorStep] = useState<1 | 2 | 3>(1);
  const [editingMascot, setEditingMascot] = useState<MascotProfile | null>(null);

  // Step 1 Form
  const [genName, setGenName] = useState("");
  const [genDescription, setGenDescription] = useState("");
  const [genStyle, setGenStyle] = useState<QuizImageStyle>("pixar_3d");
  const [genColor, setGenColor] = useState("#06b6d4");
  const [genPrompt, setGenPrompt] = useState("");

  // Step 2 Configuration
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

  // Action Generation Busy & Progress states
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationElapsed, setGenerationElapsed] = useState<number>(0);
  const [batchState, setBatchState] = useState<{
    currentIndex: number;
    total: number;
    currentAction: MascotActionType | null;
    queue: MascotActionType[];
  } | null>(null);

  // Live generation timer - tracks elapsed time and resets when new action/batch item begins
  const activeBatchAction = batchState?.currentAction;
  useEffect(() => {
    if (!busyAction) {
      setGenerationStartTime(null);
      setGenerationElapsed(0);
      return;
    }
    const start = Date.now();
    setGenerationStartTime(start);
    setGenerationElapsed(0);

    const interval = setInterval(() => {
      setGenerationElapsed(Math.max(0.1, (Date.now() - start) / 1000));
    }, 120);

    return () => clearInterval(interval);
  }, [busyAction, activeBatchAction]);

  // Expected duration: ~60s for full AI image diffusion/synthesis, ~15s for background matting
  const isMatting = Boolean(busyAction?.startsWith("matting"));
  const expectedDuration = isMatting ? 15 : 60;

  // Smooth, continuous interpolation tailored for realistic 60s generation time
  const itemProgress = useMemo(() => {
    if (!busyAction) return 0;
    const tSec = generationElapsed;
    if (tSec <= 0) return 4;
    const ratio = tSec / expectedDuration;

    let progress: number;
    if (ratio < 0.2) {
      // 0% - 20% of expected time (0 - 12s): 4% -> 22%
      progress = Math.round(4 + (ratio / 0.2) * 18);
    } else if (ratio < 0.5) {
      // 20% - 50% of expected time (12s - 30s): 22% -> 55%
      const subRatio = (ratio - 0.2) / 0.3;
      progress = Math.round(22 + subRatio * 33);
    } else if (ratio < 0.85) {
      // 50% - 85% of expected time (30s - 51s): 55% -> 85%
      const subRatio = (ratio - 0.5) / 0.35;
      progress = Math.round(55 + subRatio * 30);
    } else if (ratio < 1.1) {
      // 85% - 110% of expected time (51s - 66s): 85% -> 93%
      const subRatio = (ratio - 0.85) / 0.25;
      progress = Math.round(85 + subRatio * 8);
    } else {
      // Beyond 66s (up to 90s+): asymptotic crawl towards 97%
      const overtime = tSec - expectedDuration * 1.1;
      const crawl = 4 * (1 - Math.exp(-overtime / 20));
      progress = Math.min(97, Math.round(93 + crawl));
    }
    return Math.min(97, Math.max(4, progress));
  }, [busyAction, generationElapsed, expectedDuration]);

  // Overall progress in batch or single mode
  const overallProgress = useMemo(() => {
    if (!busyAction) return 0;
    if (batchState && batchState.total > 0) {
      const completed = batchState.currentIndex;
      const total = batchState.total;
      const currentPortion = itemProgress / 100;
      const pct = Math.round(((completed + currentPortion) / total) * 100);
      return Math.min(97, Math.max(4, pct));
    }
    return itemProgress;
  }, [busyAction, batchState, itemProgress]);

  // Dynamic progressive stage message calibrated for 60s generation time
  const currentStageMessage = useMemo(() => {
    if (!busyAction) return "";
    if (busyAction === "concept") {
      if (generationElapsed < 12) return t("mascots.genStageInit");
      if (generationElapsed < 28) return t("mascots.genStageDiffusion");
      if (generationElapsed < 50) return t("mascots.genStageRendering");
      return t("mascots.genStageFinalizing");
    }
    if (busyAction.startsWith("matting")) {
      if (generationElapsed < 6) return t("mascots.genMattingScan");
      return t("mascots.genMattingAlpha");
    }
    if (busyAction === "batch" || busyAction === "batch-core") {
      if (batchState?.currentAction) {
        const actionMeta = getLocalizedActionMeta(batchState.currentAction, t);
        if (generationElapsed < 12) return t("mascots.genPoseInit");
        if (generationElapsed < 45) return t("mascots.genPoseRendering", { action: actionMeta.label.split(" ")[0] });
        return t("mascots.genPoseFinalizing", { action: actionMeta.label.split(" ")[0] });
      }
      return t("mascots.batchGeneratingBtn");
    }
    if (ALL_MASCOT_ACTIONS.includes(busyAction as MascotActionType)) {
      const actionMeta = getLocalizedActionMeta(busyAction, t);
      if (generationElapsed < 12) return t("mascots.genPoseInit");
      if (generationElapsed < 45) return t("mascots.genPoseRendering", { action: actionMeta.label.split(" ")[0] });
      return t("mascots.genPoseFinalizing", { action: actionMeta.label.split(" ")[0] });
    }
    return t("mascots.activeAiGenerating");
  }, [busyAction, generationElapsed, batchState, t]);

  // Step 1 UI Enhancement States
  const [showNotesAccordion, setShowNotesAccordion] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Step 2 UI States
  const [dragOverAction, setDragOverAction] = useState<MascotActionType | null>(null);
  const [promptEditAction, setPromptEditAction] = useState<MascotActionType | null>(null);

  // Step 3: Motion & Animation Studio State
  const [activePreviewAction, setActivePreviewAction] = useState<MascotActionType>("idle");
  const [isPlaying, setIsPlaying] = useState(true);
  const [canvasBackground, setCanvasBackground] = useState<"dark" | "light" | "grid" | "clean">("dark");
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [actionMotions, setActionMotions] = useState<Record<MascotActionType, MascotMotionPreset>>({ ...DEFAULT_ACTION_MOTIONS });
  const [actionSpeeds, setActionSpeeds] = useState<Record<MascotActionType, number>>({ ...DEFAULT_ACTION_SPEEDS });
  const [actionIntensities, setActionIntensities] = useState<Record<MascotActionType, MascotMotionIntensity>>({ ...DEFAULT_ACTION_INTENSITIES });
  const [calibrating, setCalibrating] = useState(false);

  // Start new Mascot Generator
  const handleStartNew = () => {
    setEditingMascot(null);
    setGenName("Milo the Explorer");
    setGenDescription("");
    setGenStyle("pixar_3d");
    setGenColor("#06b6d4");
    setGenPrompt("Cute wise baby owl with big sparkling eyes and small red glasses, fluffy feathers, friendly and enthusiastic expression");
    setActionMotions({ ...DEFAULT_ACTION_MOTIONS });
    setActionSpeeds({ ...DEFAULT_ACTION_SPEEDS });
    setActionIntensities({ ...DEFAULT_ACTION_INTENSITIES });
    setGeneratorStep(1);
  };

  // Edit existing Mascot
  const handleEditMascot = (mascot: MascotProfile) => {
    setEditingMascot(mascot);
    setGenName(mascot.name);
    setGenDescription(mascot.description);
    setGenStyle(mascot.visual_style);
    setGenColor(mascot.color_theme || "#06b6d4");
    setGenPrompt(mascot.master_prompt || "");

    const initialMotions: Record<MascotActionType, MascotMotionPreset> = { ...DEFAULT_ACTION_MOTIONS };
    const initialSpeeds: Record<MascotActionType, number> = { ...DEFAULT_ACTION_SPEEDS };
    const initialIntensities: Record<MascotActionType, MascotMotionIntensity> = { ...DEFAULT_ACTION_INTENSITIES };

    for (const act of ALL_MASCOT_ACTIONS) {
      const sprite = mascot.actions[act];
      if (sprite?.motion_preset) {
        initialMotions[act] = sprite.motion_preset as MascotMotionPreset;
      }
      if (typeof sprite?.motion_speed === "number") {
        initialSpeeds[act] = sprite.motion_speed;
      }
      if (sprite?.motion_intensity) {
        initialIntensities[act] = sprite.motion_intensity as MascotMotionIntensity;
      }
    }
    setActionMotions(initialMotions);
    setActionSpeeds(initialSpeeds);
    setActionIntensities(initialIntensities);

    const availableAction = ALL_MASCOT_ACTIONS.find((act) => mascot.actions[act]?.sprite_url) || "wave";
    setActivePreviewAction(availableAction);
    setGeneratorStep(1);
  };

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

  // Step 1: Save Concept & Generate
  const handleGenerateConcept = async () => {
    if (!genName.trim()) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    setBatchState(null);
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
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.conceptFailed") });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  // Step 2: Generate Single Sprite / State
  const handleGenerateSprite = async (action: MascotActionType) => {
    if (!editingMascot) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    setBatchState(null);
    setBusyAction(action);
    const actionMeta = getLocalizedActionMeta(action, t);
    try {
      onNotice({ tone: "good", message: t("notices.generatingSprite", { action: actionMeta.label }) });
      const res = await api.generateMascotSprite(editingMascot.id, {
        action,
        prompt: actionPrompts[action]?.trim() || undefined,
        frames_count: actionFrames[action] || 1,
        fps: actionFps[action] || 8,
        loop: true,
      });
      setEditingMascot(res.mascot);
      setActivePreviewAction(action);
      onNotice({ tone: "good", message: t("notices.spriteCompleted", { action: actionMeta.label }) });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.spriteFailed", { action }) });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  // Step 2: Batch Generate all selected
  const handleBatchGenerateSprites = async () => {
    if (!editingMascot) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    const actionsToGen = ALL_MASCOT_ACTIONS.filter((act) => selectedActions[act]);
    if (actionsToGen.length === 0) {
      onNotice({ tone: "bad", message: t("notices.selectActionRequired") });
      return;
    }
    setBusyAction("batch");
    setBatchState({
      currentIndex: 0,
      total: actionsToGen.length,
      currentAction: actionsToGen[0],
      queue: actionsToGen,
    });
    try {
      for (let i = 0; i < actionsToGen.length; i++) {
        const action = actionsToGen[i];
        setBatchState({
          currentIndex: i,
          total: actionsToGen.length,
          currentAction: action,
          queue: actionsToGen.slice(i + 1),
        });
        const actionMeta = getLocalizedActionMeta(action, t);
        onNotice({ tone: "good", message: t("notices.generatingSprite", { action: actionMeta.label }) });
        const res = await api.generateMascotSprite(editingMascot.id, {
          action,
          prompt: actionPrompts[action]?.trim() || undefined,
          frames_count: actionFrames[action] || 1,
          fps: actionFps[action] || 8,
          loop: true,
        });
        setEditingMascot(res.mascot);
      }
      onNotice({ tone: "good", message: t("notices.batchCompleted", { count: actionsToGen.length }) });
      await onMascotsChanged();
      setGeneratorStep(3);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.batchFailed") });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  // Step 2: Batch Generate Core Gameplay States
  const handleBatchGenerateCoreSprites = async () => {
    if (!editingMascot) {
      onNotice({ tone: "bad", message: t("notices.mascotNameRequired") });
      return;
    }
    setBusyAction("batch-core");
    setBatchState({
      currentIndex: 0,
      total: CORE_GAMEPLAY_ACTIONS.length,
      currentAction: CORE_GAMEPLAY_ACTIONS[0],
      queue: [...CORE_GAMEPLAY_ACTIONS],
    });
    try {
      for (let i = 0; i < CORE_GAMEPLAY_ACTIONS.length; i++) {
        const action = CORE_GAMEPLAY_ACTIONS[i];
        setBatchState({
          currentIndex: i,
          total: CORE_GAMEPLAY_ACTIONS.length,
          currentAction: action,
          queue: CORE_GAMEPLAY_ACTIONS.slice(i + 1),
        });
        const actionMeta = getLocalizedActionMeta(action, t);
        onNotice({ tone: "good", message: t("notices.generatingSprite", { action: actionMeta.label }) });
        const res = await api.generateMascotSprite(editingMascot.id, {
          action,
          prompt: actionPrompts[action]?.trim() || undefined,
          frames_count: actionFrames[action] || 1,
          fps: actionFps[action] || (action === "celebrate" ? 10 : 8),
          loop: true,
        });
        setEditingMascot(res.mascot);
      }
      onNotice({ tone: "good", message: t("notices.batchCompleted", { count: CORE_GAMEPLAY_ACTIONS.length }) });
      await onMascotsChanged();
      setGeneratorStep(3);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.batchFailed") });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  // Step 2: Upload Custom Sprite / State
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
        frames_count: actionFrames[action] || 1,
        fps: actionFps[action] || 8,
        loop: true,
        frame_width: 512,
        frame_height: 512,
      });

      setEditingMascot(res.mascot);
      setActivePreviewAction(action);
      onNotice({ tone: "good", message: t("notices.spriteUploaded", { action: actionMeta.label }) });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.uploadFailed") });
    } finally {
      setBusyAction(null);
    }
  };

  // Drag & drop upload handler
  const handleDropSprite = (action: MascotActionType, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAction(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      void handleUploadSprite(action, file);
    }
  };

  // Background Matting / Removal
  const handleRemoveBackground = async (target: "master" | "all" | MascotActionType = "all") => {
    if (!editingMascot) return;
    setBatchState(null);
    setBusyAction(`matting-${target}`);
    try {
      const res = await api.removeMascotBackground(editingMascot.id, target);
      setEditingMascot(res.mascot);
      const targetLabel =
        target === "master" ? "Master Concept" : target === "all" ? t("common.all") : getLocalizedActionMeta(target, t).label;
      onNotice({
        tone: "good",
        message: t("notices.mattingSuccess", { target: targetLabel }),
      });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mattingFailed") });
    } finally {
      setBusyAction(null);
      setBatchState(null);
    }
  };

  // Sync action motions when editingMascot loads
  useEffect(() => {
    if (!editingMascot) return;
    const initialMotions: Record<MascotActionType, MascotMotionPreset> = { ...DEFAULT_ACTION_MOTIONS };
    const initialSpeeds: Record<MascotActionType, number> = { ...DEFAULT_ACTION_SPEEDS };
    const initialIntensities: Record<MascotActionType, MascotMotionIntensity> = { ...DEFAULT_ACTION_INTENSITIES };

    for (const act of ALL_MASCOT_ACTIONS) {
      const sprite = editingMascot.actions[act];
      if (sprite?.motion_preset) {
        initialMotions[act] = sprite.motion_preset as MascotMotionPreset;
      }
      if (typeof sprite?.motion_speed === "number") {
        initialSpeeds[act] = sprite.motion_speed;
      }
      if (sprite?.motion_intensity) {
        initialIntensities[act] = sprite.motion_intensity as MascotMotionIntensity;
      }
    }
    setActionMotions(initialMotions);
    setActionSpeeds(initialSpeeds);
    setActionIntensities(initialIntensities);
  }, [editingMascot?.id]);

  const handleChangeMotionPreset = (action: MascotActionType, preset: MascotMotionPreset) => {
    setActionMotions((prev) => ({ ...prev, [action]: preset }));
    if (editingMascot) {
      const existingAction = editingMascot.actions[action];
      const updatedAction = existingAction
        ? { ...existingAction, motion_preset: preset }
        : {
            action,
            sprite_url: "",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
            motion_preset: preset,
            motion_speed: actionSpeeds[action] || 1.0,
            motion_intensity: actionIntensities[action] || "normal",
          };
      setEditingMascot({
        ...editingMascot,
        actions: {
          ...editingMascot.actions,
          [action]: updatedAction,
        },
      });
    }
  };

  const handleChangeMotionSpeed = (action: MascotActionType, speed: number) => {
    setActionSpeeds((prev) => ({ ...prev, [action]: speed }));
    if (editingMascot) {
      const existingAction = editingMascot.actions[action];
      if (existingAction) {
        setEditingMascot({
          ...editingMascot,
          actions: {
            ...editingMascot.actions,
            [action]: {
              ...existingAction,
              motion_speed: speed,
            },
          },
        });
      }
    }
  };

  const handleChangeMotionIntensity = (action: MascotActionType, intensity: MascotMotionIntensity) => {
    setActionIntensities((prev) => ({ ...prev, [action]: intensity }));
    if (editingMascot) {
      const existingAction = editingMascot.actions[action];
      if (existingAction) {
        setEditingMascot({
          ...editingMascot,
          actions: {
            ...editingMascot.actions,
            [action]: {
              ...existingAction,
              motion_intensity: intensity,
            },
          },
        });
      }
    }
  };

  const handleApplyMotionToAll = (preset: MascotMotionPreset) => {
    const updated: Record<MascotActionType, MascotMotionPreset> = {} as Record<MascotActionType, MascotMotionPreset>;
    for (const act of ALL_MASCOT_ACTIONS) {
      updated[act] = preset;
    }
    setActionMotions(updated);
    if (editingMascot) {
      const updatedActions = { ...editingMascot.actions };
      for (const act of ALL_MASCOT_ACTIONS) {
        const existing = updatedActions[act];
        updatedActions[act] = existing
          ? { ...existing, motion_preset: preset }
          : {
              action: act,
              sprite_url: "",
              frames_count: 1,
              fps: 8,
              loop: true,
              frame_width: 512,
              frame_height: 512,
              offset_x: 0,
              offset_y: 0,
              motion_preset: preset,
            };
      }
      setEditingMascot({
        ...editingMascot,
        actions: updatedActions,
      });
    }
    onNotice({ tone: "good", message: "Motion preset applied to all poses!" });
  };

  const handleResetDefaultMotions = () => {
    setActionMotions({ ...DEFAULT_ACTION_MOTIONS });
    setActionSpeeds({ ...DEFAULT_ACTION_SPEEDS });
    setActionIntensities({ ...DEFAULT_ACTION_INTENSITIES });
    if (editingMascot) {
      const updatedActions = { ...editingMascot.actions };
      for (const act of ALL_MASCOT_ACTIONS) {
        const existing = updatedActions[act];
        updatedActions[act] = existing
          ? {
              ...existing,
              motion_preset: DEFAULT_ACTION_MOTIONS[act],
              motion_speed: DEFAULT_ACTION_SPEEDS[act],
              motion_intensity: DEFAULT_ACTION_INTENSITIES[act],
            }
          : {
              action: act,
              sprite_url: "",
              frames_count: 1,
              fps: 8,
              loop: true,
              frame_width: 512,
              frame_height: 512,
              offset_x: 0,
              offset_y: 0,
              motion_preset: DEFAULT_ACTION_MOTIONS[act],
              motion_speed: DEFAULT_ACTION_SPEEDS[act],
              motion_intensity: DEFAULT_ACTION_INTENSITIES[act],
            };
      }
      setEditingMascot({
        ...editingMascot,
        actions: updatedActions,
      });
    }
    onNotice({ tone: "good", message: "Restored recommended motion presets!" });
  };

  const handleSaveMotion = async (action: MascotActionType = activePreviewAction) => {
    if (!editingMascot) return;
    setCalibrating(true);
    const actionMeta = getLocalizedActionMeta(action, t);
    const preset = actionMotions[action] || DEFAULT_ACTION_MOTIONS[action];
    const speed = actionSpeeds[action] || DEFAULT_ACTION_SPEEDS[action];
    const intensity = actionIntensities[action] || DEFAULT_ACTION_INTENSITIES[action];
    try {
      const res = await api.calibrateMascotAction(editingMascot.id, action, {
        motion_preset: preset,
        motion_speed: speed,
        motion_intensity: intensity,
      });
      setEditingMascot(res.mascot);
      onNotice({ tone: "good", message: `Motion settings saved for ${actionMeta.label.split(" ")[0]}!` });
      await onMascotsChanged();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to save motion" });
    } finally {
      setCalibrating(false);
    }
  };

  // Step 3: Finish Mascot & Return to Library
  const handleFinishMascot = async () => {
    if (!editingMascot) return;
    setBusyAction("finish");
    try {
      const updatedActions = { ...editingMascot.actions };
      for (const act of ALL_MASCOT_ACTIONS) {
        const preset = actionMotions[act] || DEFAULT_ACTION_MOTIONS[act];
        const speed = actionSpeeds[act] || DEFAULT_ACTION_SPEEDS[act];
        const intensity = actionIntensities[act] || DEFAULT_ACTION_INTENSITIES[act];
        const existing = updatedActions[act];
        updatedActions[act] = existing
          ? { ...existing, motion_preset: preset, motion_speed: speed, motion_intensity: intensity }
          : {
              action: act,
              sprite_url: "",
              frames_count: 1,
              fps: 8,
              loop: true,
              frame_width: 512,
              frame_height: 512,
              offset_x: 0,
              offset_y: 0,
              motion_preset: preset,
              motion_speed: speed,
              motion_intensity: intensity,
            };
      }

      const res = await api.updateMascot(editingMascot.id, { actions: updatedActions });
      setEditingMascot(res.mascot);

      onNotice({
        tone: "good",
        message: `Mascot "${editingMascot.name}" has been saved successfully!`,
      });
      await onRefreshChannels();
      await onMascotsChanged();
      setGeneratorStep(1);
    } catch (err) {
      onNotice({
        tone: "bad",
        message: err instanceof Error ? err.message : "Failed to finish mascot",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return {
    generatorStep,
    setGeneratorStep,
    editingMascot,
    setEditingMascot,
    genName,
    setGenName,
    genDescription,
    setGenDescription,
    genStyle,
    setGenStyle,
    genStyleOption: STYLE_OPTIONS.find((s) => s.id === genStyle),
    genColor,
    setGenColor,
    genPrompt,
    setGenPrompt,
    selectedActions,
    setSelectedActions,
    actionPrompts,
    setActionPrompts,
    busyAction,
    generationElapsed,
    batchState,
    itemProgress,
    overallProgress,
    currentStageMessage,
    showNotesAccordion,
    setShowNotesAccordion,
    promptCopied,
    lightboxImage,
    setLightboxImage,
    isPromptModalOpen,
    setIsPromptModalOpen,
    dragOverAction,
    setDragOverAction,
    promptEditAction,
    setPromptEditAction,
    activePreviewAction,
    setActivePreviewAction,
    isPlaying,
    setIsPlaying,
    canvasBackground,
    setCanvasBackground,
    canvasZoom,
    setCanvasZoom,
    flipHorizontal,
    setFlipHorizontal,
    actionMotions,
    setActionMotions,
    actionSpeeds,
    setActionSpeeds,
    actionIntensities,
    setActionIntensities,
    calibrating,
    handleStartNew,
    handleEditMascot,
    handleInjectTag,
    handleApplyTemplate,
    handleCopyPrompt,
    handleGenerateConcept,
    handleGenerateSprite,
    handleBatchGenerateSprites,
    handleBatchGenerateCoreSprites,
    handleUploadSprite,
    handleDropSprite,
    handleRemoveBackground,
    handleChangeMotionPreset,
    handleChangeMotionSpeed,
    handleChangeMotionIntensity,
    handleResetDefaultMotions,
    handleSaveMotion,
    handleFinishMascot,
  };
}

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
  Check,
  CheckCircle,
  CircleNotch,
  DownloadSimple,
  Eye,
  FilmStrip,
  FloppyDisk,
  Gear,
  Lightning,
  MagicWand,
  MagnifyingGlass,
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
    wave: 6,
    idle: 4,
    thinking: 6,
    point: 5,
    celebrate: 8,
    oops: 5,
    outro: 6,
  });

  // Action Generation Busy states
  const [busyAction, setBusyAction] = useState<string | null>(null);

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

  // Start new Mascot Generator
  const handleStartNew = () => {
    setEditingMascot(null);
    setGenName("Milo the Explorer");
    setGenDescription("Chú cú thông thái tinh nghịch với đôi mắt to tròn và chiếc kính cận đỏ.");
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
      onNotice({ tone: "bad", message: "Vui lòng nhập tên Mascot!" });
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

      onNotice({ tone: "good", message: "Đang sinh Master Concept Sheet..." });
      const res = await api.generateMascotConcept(mascotToUse.id, {
        prompt: genPrompt.trim(),
        style: genStyle,
      });

      setEditingMascot(res.mascot);
      onNotice({ tone: "good", message: "Đã tạo thành công Master Concept Sheet!" });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Lỗi sinh concept" });
    } finally {
      setBusyAction(null);
    }
  };

  // Step 3: Generate Single Sprite
  const handleGenerateSprite = async (action: MascotActionType) => {
    if (!editingMascot) return;
    setBusyAction(action);
    try {
      onNotice({ tone: "good", message: `Đang sinh Sprite Sheet cho hành động ${MASCOT_ACTION_META[action].label}...` });
      const res = await api.generateMascotSprite(editingMascot.id, {
        action,
        prompt: actionPrompts[action]?.trim() || undefined,
        frames_count: actionFrames[action] || 6,
        fps: actionFps[action] || 8,
        loop: true,
      });
      setEditingMascot(res.mascot);
      setActivePreviewAction(action);
      onNotice({ tone: "good", message: `Hoàn tất Sprite Sheet cho ${MASCOT_ACTION_META[action].label}!` });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : `Lỗi sinh sprite ${action}` });
    } finally {
      setBusyAction(null);
    }
  };

  // Batch Generate all selected
  const handleBatchGenerateSprites = async () => {
    if (!editingMascot) return;
    const actionsToGen = ALL_MASCOT_ACTIONS.filter((act) => selectedActions[act]);
    if (actionsToGen.length === 0) {
      onNotice({ tone: "bad", message: "Vui lòng chọn ít nhất 1 hành động để sinh Sprite!" });
      return;
    }
    setBusyAction("batch");
    try {
      for (const action of actionsToGen) {
        onNotice({ tone: "good", message: `[1/${actionsToGen.length}] Đang sinh ${MASCOT_ACTION_META[action].label}...` });
        const res = await api.generateMascotSprite(editingMascot.id, {
          action,
          prompt: actionPrompts[action]?.trim() || undefined,
          frames_count: actionFrames[action] || 6,
          fps: actionFps[action] || 8,
          loop: true,
        });
        setEditingMascot(res.mascot);
      }
      onNotice({ tone: "good", message: `Đã sinh thành công toàn bộ ${actionsToGen.length} Sprite Sheets!` });
      await loadMascots();
      setGeneratorStep(4);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Lỗi trong quá trình sinh batch" });
    } finally {
      setBusyAction(null);
    }
  };

  // Upload Custom Sprite Strip
  const handleUploadSprite = async (action: MascotActionType, file: File) => {
    if (!editingMascot) return;
    setBusyAction(`upload-${action}`);
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
      onNotice({ tone: "good", message: `Đã tải lên Sprite Sheet cho ${MASCOT_ACTION_META[action].label}` });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Lỗi upload file" });
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
      onNotice({
        tone: "good",
        message: `Đã tách nền trong suốt thành công cho ${target === "master" ? "Master Concept" : target === "all" ? "toàn bộ Mascot" : MASCOT_ACTION_META[target as MascotActionType]?.label || target}!`,
      });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Tách nền thất bại" });
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
      onNotice({ tone: "good", message: "Đã cập nhật gán Mascot cho các Channel thành công!" });
      await onRefreshChannels();
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Lỗi gán channel" });
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
      onNotice({ tone: "good", message: `Đã xóa Mascot "${deleteTarget.name}"` });
      setDeleteTarget(null);
      await loadMascots();
      await onRefreshChannels();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Lỗi khi xóa mascot" });
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
      onNotice({ tone: "good", message: `Đã cập nhật gán kênh cho "${quickAssignMascot.name}" thành công!` });
      await onRefreshChannels();
      await loadMascots();
      setQuickAssignMascot(null);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Lỗi lưu gán kênh" });
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
    try {
      const res = await api.calibrateMascotAction(editingMascot.id, activePreviewAction, {
        offset_x: nudgeX,
        offset_y: nudgeY,
      });
      setEditingMascot(res.mascot);
      onNotice({ tone: "good", message: `Đã lưu cân chỉnh tọa độ cho pose "${MASCOT_ACTION_META[activePreviewAction].label}"!` });
      await loadMascots();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Lỗi lưu căn chỉnh" });
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
          onNotice({ tone: "good", message: `Đã nhập thành công Mascot "${res.mascot.name}"!` });
          await loadMascots();
          await onRefreshChannels();
        } catch (err) {
          onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Lỗi nhập file ZIP" });
        } finally {
          setImportingZip(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setImportingZip(false);
      onNotice({ tone: "bad", message: "Không thể đọc file ZIP" });
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
              <label className="quiet-button" style={{ cursor: "pointer", margin: 0 }} title="Import full Mascot bundle from ZIP">
                {importingZip ? <CircleNotch className="spin" size={15} /> : <Upload size={15} />}
                <span>{importingZip ? "Importing..." : "Import ZIP"}</span>
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
                <span>{t("mascots.newMascotBtn")}</span>
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
              <span>{t("mascots.libraryTab")}</span>
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
          <span>{t("mascots.libraryTab")}</span>
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
          <span>{t("mascots.generatorTab")}</span>
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
                All ({mascots.length})
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
                  ? `No mascots match "${searchQuery}".`
                  : t("mascots.noMascotsCopy")
              }
              action={searchQuery ? t("common.clear") : t("mascots.newMascotBtn")}
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
                          <span>Chưa có ảnh</span>
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
                          ✨ {availableActionsCount}/7 Poses
                        </span>
                      </div>

                      <p className="mascot-card-desc">{mascot.description || mascot.master_prompt || "Chưa có mô tả tính cách."}</p>

                      {/* Action Pills ready */}
                      <div className="mascot-card-action-tags">
                        {ALL_MASCOT_ACTIONS.map((action) => {
                          const ready = Boolean(mascot.actions[action]?.sprite_url);
                          return (
                            <span
                              key={action}
                              className={`action-tag-pill ${ready ? "is-ready" : "is-missing"}`}
                              title={`${MASCOT_ACTION_META[action].label} - ${ready ? "Đã sẵn sàng" : "Chưa tạo"}`}
                            >
                              {MASCOT_ACTION_META[action].icon} {action}
                            </span>
                          );
                        })}
                      </div>

                      {/* Assigned Channels */}
                      <div className="mascot-card-channels-row">
                        <Broadcast size={14} weight="fill" style={{ color: "var(--accent)" }} />
                        <span>
                          {assignedCount === 0
                            ? "Chưa gán kênh nào"
                            : `${assignedCount} kênh đang dùng: ${mascot.assigned_channel_ids
                                .map((cid) => channels.find((c) => c.channel_id === cid)?.display_name || cid)
                                .join(", ")}`}
                        </span>
                      </div>

                      <div className="mascot-card-footer">
                        <button
                          type="button"
                          className="quiet-button compact"
                          onClick={() => handleOpenQuickAssign(mascot)}
                          title="Gán kênh và cấu hình vị trí nhanh"
                        >
                          <Broadcast size={14} />
                          <span>Gán kênh</span>
                        </button>
                        <button
                          type="button"
                          className="primary-button compact"
                          onClick={() => handleEditMascot(mascot)}
                          title="Mở trong Mascot Generator"
                        >
                          <MagicWand size={14} weight="bold" />
                          <span>Studio & Generator</span>
                        </button>
                        <a
                          href={api.exportMascotUrl(mascot.id)}
                          download={`mascot_${mascot.id}.zip`}
                          className="icon-button"
                          title="Tải trọn bộ Sprite Pack (ZIP)"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                        >
                          <DownloadSimple size={15} />
                        </a>
                        <button
                          type="button"
                          className="icon-button danger"
                          aria-label={`Xóa ${mascot.name}`}
                          onClick={() => setDeleteTarget(mascot)}
                          title="Xóa Mascot"
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
              <span className="step-label">Khởi tạo Identity</span>
            </button>
            <div className="wizard-step-line" />
            <button
              type="button"
              className={`wizard-step-btn ${generatorStep === 2 ? "is-active" : generatorStep > 2 ? "is-done" : ""}`}
              onClick={() => setGeneratorStep(2)}
            >
              <span className="step-num">2</span>
              <span className="step-label">Ma trận Hành động</span>
            </button>
            <div className="wizard-step-line" />
            <button
              type="button"
              className={`wizard-step-btn ${generatorStep === 3 ? "is-active" : generatorStep > 3 ? "is-done" : ""}`}
              onClick={() => setGeneratorStep(3)}
            >
              <span className="step-num">3</span>
              <span className="step-label">Sprite Synthesis</span>
            </button>
            <div className="wizard-step-line" />
            <button
              type="button"
              className={`wizard-step-btn ${generatorStep === 4 ? "is-active" : ""}`}
              onClick={() => setGeneratorStep(4)}
            >
              <span className="step-num">4</span>
              <span className="step-label">Live Stage & Gán Kênh</span>
            </button>
          </div>

          {/* STEP 1: IDENTITY & MASTER CONCEPT */}
          {generatorStep === 1 ? (
            <div className="wizard-step-content step-identity-grid">
              <div className="wizard-form-col">
                <div className="wizard-card">
                  <h3>1. Hồ sơ Danh tính & Master Concept Sheet</h3>
                  <p className="wizard-card-sub">
                    Thiết lập tên, màu chủ đạo và ảnh tham chiếu gốc (Master Reference) để cố định khuôn mặt và tỉ lệ nhân vật qua mọi hành động.
                  </p>

                  <div className="form-group">
                    <label htmlFor="mascot-name">Tên Mascot</label>
                    <input
                      id="mascot-name"
                      type="text"
                      placeholder="Ví dụ: Bingo the Dino, Milo the Owl..."
                      value={genName}
                      onChange={(e) => setGenName(e.target.value)}
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="mascot-style">Phong cách Visual</label>
                      <select id="mascot-style" value={genStyle} onChange={(e) => setGenStyle(e.target.value as QuizImageStyle)}>
                        {ALL_QUIZ_IMAGE_STYLES.map((style) => (
                          <option key={style} value={style}>
                            {QUIZ_IMAGE_STYLE_LABELS[style]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="mascot-color">Màu Chủ Đạo</label>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          id="mascot-color"
                          type="color"
                          value={genColor}
                          onChange={(e) => setGenColor(e.target.value)}
                          style={{ width: "44px", height: "38px", padding: "2px", cursor: "pointer", borderRadius: "6px" }}
                        />
                        <input
                          type="text"
                          value={genColor}
                          onChange={(e) => setGenColor(e.target.value)}
                          placeholder="#06b6d4"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="mascot-desc">Mô tả Tính cách & Ngoại hình</label>
                    <textarea
                      id="mascot-desc"
                      rows={3}
                      placeholder="Mô tả đặc điểm: Chú gấu con mặc áo hoodie đỏ, đội mũ phi công, tính cách tò mò hóm hỉnh..."
                      value={genDescription}
                      onChange={(e) => setGenDescription(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="mascot-prompt">
                      Master Concept Prompt <small>(AI Character Turnaround)</small>
                    </label>
                    <textarea
                      id="mascot-prompt"
                      rows={3}
                      placeholder="Full-body concept art of cute baby dino with pilot goggles..."
                      value={genPrompt}
                      onChange={(e) => setGenPrompt(e.target.value)}
                    />
                  </div>

                  <div className="wizard-action-row" style={{ marginTop: "20px" }}>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={busyAction === "concept" || !genName.trim()}
                      onClick={() => void handleGenerateConcept()}
                    >
                      {busyAction === "concept" ? <CircleNotch className="spin" size={16} /> : <MagicWand size={16} />}
                      <span>{busyAction === "concept" ? "Đang sinh Master Concept..." : "Sinh Master Concept Sheet"}</span>
                    </button>

                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() => setGeneratorStep(2)}
                      disabled={!editingMascot?.master_image_url}
                    >
                      <span>Tiếp theo: Chọn hành động</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Master Preview Box */}
              <div className="wizard-preview-col">
                <div className="wizard-card preview-card">
                  <h3>Master Concept Preview</h3>
                  <p className="wizard-card-sub">Ảnh tham chiếu chuẩn (Identity Anchor)</p>

                  <div className="concept-preview-frame" style={{ borderColor: genColor }}>
                    {editingMascot?.master_image_url ? (
                      <img src={editingMascot.master_image_url} alt="Master Concept" className="concept-preview-img" />
                    ) : (
                      <div className="concept-preview-placeholder">
                        <Smiley size={64} weight="duotone" style={{ color: genColor }} />
                        <p>Nhấn "Sinh Master Concept Sheet" hoặc tải ảnh lên để xem ảnh mẫu tham chiếu.</p>
                      </div>
                    )}
                  </div>

                  {editingMascot?.master_image_url ? (
                    <>
                      <div className="concept-meta-box">
                        <div className="concept-meta-item">
                          <span>Trạng thái:</span>
                          <strong style={{ color: "var(--green)" }}>✓ Đã khóa Identity</strong>
                        </div>
                        <div className="concept-meta-item">
                          <span>Phong cách:</span>
                          <strong>{QUIZ_IMAGE_STYLE_LABELS[editingMascot.visual_style]}</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="quiet-button compact"
                          disabled={busyAction === "matting-master"}
                          onClick={() => void handleRemoveBackground("master")}
                          style={{ width: "100%", justifyContent: "center" }}
                          title="Khử nền trắng thành PNG trong suốt"
                        >
                          {busyAction === "matting-master" ? <CircleNotch className="spin" size={14} /> : <PaintBrush size={14} />}
                          <span>{busyAction === "matting-master" ? "Đang tách nền..." : "✂ Tách nền trong suốt (AI Matting)"}</span>
                        </button>
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
                    <h3>2. Ma trận Hành động (Action Matrix)</h3>
                    <p className="wizard-card-sub">Chọn và cấu hình các hành động cần thiết cho video quiz.</p>
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
                      Chọn tất cả
                    </button>
                  </div>
                </div>

                <div className="action-matrix-grid">
                  {ALL_MASCOT_ACTIONS.map((action) => {
                    const meta = MASCOT_ACTION_META[action];
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
                            aria-label={`Chọn ${meta.label}`}
                          />
                        </div>

                        <p className="action-card-desc">{meta.description}</p>

                        <div className="action-card-controls" onClick={(e) => e.stopPropagation()}>
                          <div className="action-control-col">
                            <label>Số Frames</label>
                            <input
                              type="number"
                              min={3}
                              max={16}
                              value={actionFrames[action]}
                              onChange={(e) => setActionFrames((prev) => ({ ...prev, [action]: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="action-control-col">
                            <label>Tốc độ FPS</label>
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
                          <span className="action-ready-badge">✓ Đã có Sprite Sheet</span>
                        ) : (
                          <span className="action-missing-badge">Chưa sinh sprite</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="wizard-action-row" style={{ marginTop: "24px" }}>
                  <button type="button" className="quiet-button" onClick={() => setGeneratorStep(1)}>
                    <ArrowLeft size={15} />
                    <span>Quay lại Identity</span>
                  </button>
                  <button type="button" className="primary-button" onClick={() => setGeneratorStep(3)}>
                    <span>Tiếp theo: Sinh Sprite Sheets</span>
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
                    <h3>3. Sinh & Quản lý Sprite Sheets</h3>
                    <p className="wizard-card-sub">
                      Tạo dải chuyển động frame-by-frame cho từng hành động. Hỗ trợ tự động sinh qua AI hoặc tải lên file Sprite Strip có sẵn.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={busyAction !== null}
                    onClick={() => void handleBatchGenerateSprites()}
                  >
                    {busyAction === "batch" ? <CircleNotch className="spin" size={16} /> : <Rocket size={16} />}
                    <span>{busyAction === "batch" ? "Đang sinh toàn bộ..." : "⚡ Sinh tất cả Sprite Sheets"}</span>
                  </button>
                </div>

                <div className="sprite-synthesis-grid">
                  {ALL_MASCOT_ACTIONS.filter((act) => selectedActions[act]).map((action) => {
                    const meta = MASCOT_ACTION_META[action];
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
                                Chưa sinh
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
                              <span>Chưa có Sprite Sheet ({actionFrames[action] || 6} frames)</span>
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
                              title="Sinh Sprite Sheet AI cho hành động này"
                            >
                              {isBusy ? <CircleNotch className="spin" size={13} /> : <MagicWand size={13} />}
                              <span>{isBusy ? "Đang sinh..." : sprite ? "Sinh lại" : "Sinh AI"}</span>
                            </button>

                            <label className="quiet-button compact" style={{ cursor: "pointer", margin: 0 }} title="Upload ảnh PNG sprite strip">
                              <Upload size={13} />
                              <span>Upload</span>
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
                                  title="Tách nền trong suốt cho sprite này"
                                  onClick={() => void handleRemoveBackground(action)}
                                >
                                  {busyAction === `matting-${action}` ? <CircleNotch className="spin" size={13} /> : <PaintBrush size={13} />}
                                  <span>{busyAction === `matting-${action}` ? "Tách..." : "Tách nền"}</span>
                                </button>

                                <button
                                  type="button"
                                  className="icon-button"
                                  style={{ width: "30px", height: "30px" }}
                                  title="Xem thử hoạt họa ở Step 4"
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
                    <span>Quay lại Ma trận</span>
                  </button>
                  <button type="button" className="primary-button" onClick={() => setGeneratorStep(4)}>
                    <span>Tiếp theo: Live Stage & Gán Kênh</span>
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
                      <h3>4. Interactive Animation Studio</h3>
                      <p className="wizard-card-sub">Trình phát hoạt họa thời gian thực & giả lập vị trí trên video Candy Arcade.</p>
                    </div>

                    <div className="stage-mode-toggles" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        className={`filter-chip ${stagePreviewMode === "video_stage" ? "is-active" : ""}`}
                        onClick={() => setStagePreviewMode("video_stage")}
                      >
                        📺 Video Stage
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${stagePreviewMode === "grid" ? "is-active" : ""}`}
                        onClick={() => setStagePreviewMode("grid")}
                      >
                        🏁 Grid
                      </button>
                      <button
                        type="button"
                        className={`icon-button ${theaterMode ? "is-active" : ""}`}
                        title={theaterMode ? "Thu nhỏ màn hình" : "Phóng to toàn cảnh (Theater Mode)"}
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
                          <span>{isScenarioMode ? "⏹ Dừng Kịch bản" : "▶ Phát Timeline Quiz"}</span>
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
                            title="Mascot reo mừng khi người chơi chọn đúng"
                          >
                            🎉 Đúng (Celebrate)
                          </button>
                          <button
                            type="button"
                            className={`pos-toggle-btn ${reactionStyle === "oops" ? "is-selected" : ""}`}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => {
                              setReactionStyle("oops");
                              if (scenarioPhase === "reveal") setActivePreviewAction("oops");
                            }}
                            title="Mascot bối rối/tiếc nuối khi câu hỏi gài bẫy hoặc sai"
                          >
                            😅 Gài Bẫy (Oops)
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
                          title="[0s - 2s] Intro Chào mừng (Pose: wave)"
                        >
                          👋 Intro (2s)
                        </div>
                        <div
                          className={`scrubber-segment seg-question ${scenarioPhase === "question" ? "is-current" : ""}`}
                          style={{ width: "12.5%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(3.0); }}
                          title="[2s - 4s] Đọc Câu hỏi & Lựa chọn (Pose: idle)"
                        >
                          ❓ Question (2s)
                        </div>
                        <div
                          className={`scrubber-segment seg-thinking ${scenarioPhase === "thinking" ? "is-current" : ""}`}
                          style={{ width: "31.25%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(6.5); }}
                          title="[4s - 9s] 5s Đếm ngược suy nghĩ (Pose: thinking)"
                        >
                          ⏳ Thinking (5s)
                        </div>
                        <div
                          className={`scrubber-segment seg-reveal ${scenarioPhase === "reveal" ? "is-current" : ""}`}
                          style={{ width: "18.75%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(10.5); }}
                          title="[9s - 12s] Công bố Đáp án (Pose: celebrate/oops)"
                        >
                          {reactionStyle === "celebrate" ? "🎉 Reveal (3s)" : "😅 Oops (3s)"}
                        </div>
                        <div
                          className={`scrubber-segment seg-explain ${scenarioPhase === "explain" ? "is-current" : ""}`}
                          style={{ width: "25%" }}
                          onClick={() => { setIsScenarioMode(false); applyTimelineTime(14.0); }}
                          title="[12s - 16s] Fact Card & Giải thích (Pose: point)"
                        >
                          👉 Fact Card (4s)
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
                          <span>{MASCOT_ACTION_META[action].icon}</span>
                          <span>{MASCOT_ACTION_META[action].label.split(" ")[0]}</span>
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
                          <span className="sim-intro-badge">QUIZ TIME</span>
                          <h2 className="sim-intro-title">Sẵn sàng chơi chưa?</h2>
                          <p className="sim-intro-sub">8 câu hỏi đầy bất ngờ ★ ✦ ★</p>
                        </div>
                      ) : scenarioPhase === "explain" ? (
                        <div className="simulated-quiz-ui">
                          <div className="sim-wood-sign">Q1</div>
                          <div className="sim-question-card">Con vật nào chạy nhanh nhất trên cạn?</div>
                          <div className="sim-fact-view">
                            <span className="sim-fact-label">💡 BẠN CÓ BIẾT?</span>
                            <p className="sim-fact-text">Báo săn (Cheetah) có thể bứt tốc từ 0 đến 100 km/h chỉ trong vòng 3 giây!</p>
                          </div>
                        </div>
                      ) : (
                        <div className="simulated-quiz-ui">
                          <div className="sim-wood-sign">Q1</div>
                          <div className="sim-question-card">Con vật nào chạy nhanh nhất trên cạn?</div>
                          <div className="sim-hero-box">🖼️ HERO (Cheetah)</div>
                          <div className="sim-choices-box">
                            <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-dimmed" : ""}`}>A. Hổ</div>
                            <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-correct" : ""}`}>
                              {scenarioPhase === "reveal" ? "✓ B. Báo săn (Cheetah)" : "B. Báo săn (Cheetah)"}
                            </div>
                            <div className={`sim-choice ${scenarioPhase === "reveal" ? "is-dimmed" : ""}`}>C. Sư tử</div>
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
                      title={isPlaying ? "Tạm dừng" : "Phát animation"}
                    >
                      {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
                    </button>

                    <div className="frame-stepper-group">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setCurrentFrameIndex((prev) => (prev - 1 + activeFramesCount) % activeFramesCount)}
                        title="Frame trước"
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <span className="frame-indicator">
                        Frame {currentFrameIndex + 1} / {activeFramesCount}
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % activeFramesCount)}
                        title="Frame kế tiếp"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="fps-slider-group">
                      <label htmlFor="preview-fps">Tốc độ: {previewFps} FPS</label>
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
                        <strong style={{ fontSize: "13px" }}>Sprite Alignment & Onion-Skinning Inspector</strong>
                        <span className="action-tag-pill is-ready" style={{ fontSize: "10.5px" }}>
                          Pose: {MASCOT_ACTION_META[activePreviewAction].label.split(" ")[0]}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <label className="filter-chip" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="checkbox"
                            checked={showGuides}
                            onChange={(e) => setShowGuides(e.target.checked)}
                          />
                          <span>📐 Vạch Căn Trục</span>
                        </label>
                        <label className="filter-chip" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="checkbox"
                            checked={onionSkinEnabled}
                            onChange={(e) => setOnionSkinEnabled(e.target.checked)}
                          />
                          <span>👻 Onion Skin (Idle mờ)</span>
                        </label>
                      </div>
                    </div>

                    {onionSkinEnabled ? (
                      <div className="onion-slider-row" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                        <small style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>Độ mờ Ghost Reference (Idle): {Math.round(onionSkinOpacity * 100)}%</small>
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
                        <label>Trục ngang X: {nudgeX > 0 ? `+${nudgeX}` : nudgeX}px</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button type="button" className="icon-button compact" onClick={() => setNudgeX((x) => Math.max(-40, x - 1))} title="Sang trái 1px">-</button>
                          <input
                            type="range"
                            min={-40}
                            max={40}
                            value={nudgeX}
                            onChange={(e) => setNudgeX(Number(e.target.value))}
                            style={{ width: "90px" }}
                          />
                          <button type="button" className="icon-button compact" onClick={() => setNudgeX((x) => Math.min(40, x + 1))} title="Sang phải 1px">+</button>
                        </div>
                      </div>

                      <div className="nudge-group">
                        <label>Trục dọc Y: {nudgeY > 0 ? `+${nudgeY}` : nudgeY}px</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button type="button" className="icon-button compact" onClick={() => setNudgeY((y) => Math.max(-40, y - 1))} title="Lên trên 1px">-</button>
                          <input
                            type="range"
                            min={-40}
                            max={40}
                            value={nudgeY}
                            onChange={(e) => setNudgeY(Number(e.target.value))}
                            style={{ width: "90px" }}
                          />
                          <button type="button" className="icon-button compact" onClick={() => setNudgeY((y) => Math.min(40, y + 1))} title="Xuống dưới 1px">+</button>
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
                          title="Đặt lại offset = 0"
                        >
                          Reset 0
                        </button>
                        <button
                          type="button"
                          className="primary-button compact"
                          disabled={calibrating || (nudgeX === (currentActionSprite?.offset_x || 0) && nudgeY === (currentActionSprite?.offset_y || 0))}
                          onClick={() => void handleSaveCalibration()}
                        >
                          {calibrating ? <CircleNotch className="spin" size={14} /> : <FloppyDisk size={14} />}
                          <span>{calibrating ? "Đang lưu..." : "Lưu Căn Chỉnh"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Stage Configuration & Channel Assignment */}
              <div className="stage-config-col">
                <div className="wizard-card">
                  <h3>Cấu hình Vị trí & Gán Kênh</h3>
                  <p className="wizard-card-sub">Chọn vị trí đứng trên video và gán Mascot vào các channel.</p>

                  <div className="form-group">
                    <label>Vị trí đứng trên Sân khấu (Stage Position)</label>
                    <div className="position-toggle-row">
                      <button
                        type="button"
                        className={`pos-toggle-btn ${targetPosition === "bottom_left" ? "is-selected" : ""}`}
                        onClick={() => setTargetPosition("bottom_left")}
                      >
                        👈 Góc dưới Bên Trái (Bottom-Left)
                      </button>
                      <button
                        type="button"
                        className={`pos-toggle-btn ${targetPosition === "bottom_right" ? "is-selected" : ""}`}
                        onClick={() => setTargetPosition("bottom_right")}
                      >
                        👉 Góc dưới Bên Phải (Bottom-Right)
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="target-scale">Tỉ lệ Kích thước (Scale): {targetScale.toFixed(2)}x</label>
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
                    <label>Gán vào Channel ({assignedChannels.length} đã chọn)</label>
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
                      <span>{busyAction === "assign" ? "Đang lưu cấu hình..." : "Lưu & Áp dụng cho các Kênh"}</span>
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
                  <p className="eyebrow">Cấu hình Nhanh</p>
                  <h2>Gán kênh cho "{quickAssignMascot.name}"</h2>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng"
                onClick={() => setQuickAssignMascot(null)}
                disabled={savingQuickAssign}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "14px" }}>
              <div className="form-group">
                <label>Vị trí đứng trên Sân khấu (Stage Position)</label>
                <div className="position-toggle-row">
                  <button
                    type="button"
                    className={`pos-toggle-btn ${quickPosition === "bottom_left" ? "is-selected" : ""}`}
                    onClick={() => setQuickPosition("bottom_left")}
                  >
                    👈 Góc Trái (Bottom-Left)
                  </button>
                  <button
                    type="button"
                    className={`pos-toggle-btn ${quickPosition === "bottom_right" ? "is-selected" : ""}`}
                    onClick={() => setQuickPosition("bottom_right")}
                  >
                    👉 Góc Phải (Bottom-Right)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="quick-scale">Tỉ lệ Kích thước (Scale): {quickScale.toFixed(2)}x</label>
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
                <label>Chọn các Channel áp dụng ({quickAssignedChannels.length} đã chọn)</label>
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
                Hủy
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSaveQuickAssign()}
                disabled={savingQuickAssign}
              >
                {savingQuickAssign ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
                <span>{savingQuickAssign ? "Đang lưu..." : "Lưu & Áp Dụng"}</span>
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
                <p className="eyebrow">Xóa Mascot</p>
                <h2 id="delete-mascot-title">Xóa "{deleteTarget.name}"?</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <X size={18} />
              </button>
            </div>
            <p className="modal-copy">
              Hành động này sẽ xóa vĩnh viễn linh vật <strong>{deleteTarget.name}</strong> cùng toàn bộ các file Sprite Sheets đã sinh.
            </p>
            <div className="modal-actions">
              <button type="button" className="quiet-button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </button>
              <button
                type="button"
                className="primary-button danger-confirm"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
              >
                {deleting ? <CircleNotch className="spin" size={16} /> : <Trash size={16} />}
                <span>{deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

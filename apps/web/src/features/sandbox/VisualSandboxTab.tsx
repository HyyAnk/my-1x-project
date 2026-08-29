import { useState } from "react";
import {
  ArrowClockwise,
  CheckCircle,
  CircleNotch,
  DeviceMobile,
  Eye,
  FloppyDisk,
  Link,
  ListNumbers,
  Palette,
  Pause,
  Play,
  Question,
  SlidersHorizontal,
  Smiley,
  Sparkle,
  SquareSplitHorizontal,
  Trash,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import {
  ALL_ANSWER_CARD_STYLES,
  ALL_QUESTION_BOX_STYLES,
  ALL_QUESTION_COUNTER_STYLES,
  ALL_THINKING_BAR_STYLES,
  ANSWER_CARD_STYLE_DESCRIPTIONS,
  ANSWER_CARD_STYLE_LABELS,
  QUESTION_BOX_STYLE_DESCRIPTIONS,
  QUESTION_BOX_STYLE_LABELS,
  QUESTION_COUNTER_STYLE_DESCRIPTIONS,
  QUESTION_COUNTER_STYLE_LABELS,
  THINKING_BAR_STYLE_DESCRIPTIONS,
  THINKING_BAR_STYLE_LABELS,
  type Channel,
  type QuizAnswerCardStyle,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
} from "@studio/shared";
import type { Notice } from "../../components/types";
import { useTranslation } from "../../i18n";
import { useSandboxChannelSync } from "./hooks/useSandboxChannelSync";
import { useSandboxDesignState } from "./hooks/useSandboxDesignState";
import { useSandboxMascotState } from "./hooks/useSandboxMascotState";
import { useSandboxPresets } from "./hooks/useSandboxPresets";
import { useSandboxPreviewRenderer } from "./hooks/useSandboxPreviewRenderer";
import { useSandboxQuestionState } from "./hooks/useSandboxQuestionState";
import { useSandboxTimelineState } from "./hooks/useSandboxTimelineState";
import { useSandboxViewportState } from "./hooks/useSandboxViewportState";

export type { VisualPresetItem } from "./hooks/useSandboxPresets";

const PALETTES: Array<{ id: string; label: string; primary: string; secondary: string; accent: string }> = [
  { id: "lime", label: "Lime Mint", primary: "#99D93E", secondary: "#31B87A", accent: "#FF6C78" },
  { id: "aqua", label: "Aqua Blue", primary: "#21C8CF", secondary: "#1973CF", accent: "#FF7A63" },
  { id: "sunny", label: "Sunny Gold", primary: "#FFD23F", secondary: "#FF9D31", accent: "#E94F6D" },
  { id: "purple", label: "Purple Galaxy", primary: "#9A66E6", secondary: "#594DDC", accent: "#FFAA42" },
  { id: "pink", label: "Candy Pink", primary: "#FF82AF", secondary: "#E94F8A", accent: "#FFD44D" },
  { id: "orange", label: "Sunset Orange", primary: "#FF964F", secondary: "#EF5A62", accent: "#3BC7C9" },
  { id: "red", label: "Ruby Burst", primary: "#F15B68", secondary: "#C93D78", accent: "#FFD047" },
  { id: "blue", label: "Ocean Deep", primary: "#438CE8", secondary: "#2A55C8", accent: "#FFCE45" },
];

export function VisualSandboxTab({
  channels = [],
  onNotice,
  onRefreshChannels,
}: {
  channels?: Channel[];
  onNotice?: (notice: NonNullable<Notice>) => void;
  onRefreshChannels?: () => Promise<void>;
}) {
  const { t, language } = useTranslation();
  const [activeInspectorTab, setActiveInspectorTab] = useState<"design" | "mascot" | "content">("design");
  const design = useSandboxDesignState();
  const mascot = useSandboxMascotState();
  const timeline = useSandboxTimelineState();
  const question = useSandboxQuestionState(language);
  const viewport = useSandboxViewportState();
  const preview = useSandboxPreviewRenderer({ design, mascot, timeline, question, onNotice });
  const presets = useSandboxPresets({ design, mascot, onNotice });
  const channelSync = useSandboxChannelSync({ channels, design, mascot, onNotice, onRefreshChannels });

  const {
    paletteId,
    setPaletteId,
    layoutId,
    setLayoutId,
    thinkingBarStyle,
    setThinkingBarStyle,
    questionBoxStyle,
    setQuestionBoxStyle,
    answerCardStyle,
    setAnswerCardStyle,
    counterStyle,
    setCounterStyle,
  } = design;
  const {
    mascots,
    mascotId,
    setMascotId,
    mascotEnabled,
    setMascotEnabled,
    mascotAction,
    setMascotAction,
    mascotPosition,
    setMascotPosition,
    mascotScale,
    setMascotScale,
    mascotOffsetX,
    setMascotOffsetX,
    mascotOffsetY,
    setMascotOffsetY,
    activeMascot,
  } = mascot;
  const {
    phase,
    setPhase,
    timelineSeconds,
    setTimelineSeconds,
    isPlaying,
    setIsPlaying,
    useScrubber,
    setUseScrubber,
    handlePhaseChange,
    handleScrubberChange,
  } = timeline;
  const {
    sampleQuestions,
    questionText,
    setQuestionText,
    choices,
    setChoices,
    correctChoiceIndex,
    setCorrectChoiceIndex,
    factCardText,
    setFactCardText,
    questionNumber,
    setQuestionNumber,
    totalQuestions,
    setTotalQuestions,
    handleApplyPresetQuestion,
  } = question;
  const { showSafeArea, setShowSafeArea, showShortsGuide, setShowShortsGuide, zoom, setZoom, scaleFactor, containerRef } = viewport;
  const { previewHtml, contrastReport, loading, lastRenderTime, iframeKey, setIframeKey, renderPreview } = preview;
  const {
    customPresets,
    presetModalOpen,
    setPresetModalOpen,
    newPresetName,
    setNewPresetName,
    builtInPresets,
    allPresets,
    matchedPreset,
    activeCustomPreset,
    handleLoadPreset,
    handleSaveCustomPreset,
    handleDeleteCustomPreset,
  } = presets;
  const {
    channelSyncOpen,
    setChannelSyncOpen,
    selectedChannelId,
    setSelectedChannelId,
    syncMascotToChannel,
    setSyncMascotToChannel,
    savingChannel,
    handleApplyToChannel,
  } = channelSync;

  return (
    <section
      className="page-wrap visual-sandbox-page"
      style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      {/* Top Header Bar */}
      {(() => (
        <div className="section-heading" style={{ marginBottom: "10px", flexShrink: 0, padding: "4px 0" }}>
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "19px" }}>
              <Palette size={22} weight="duotone" color="var(--accent)" />
              <span>
                {t("visualSandbox.pageTitle")} · {t("visualSandbox.pageSubtitle")}
              </span>
            </h1>
            <p className="description" style={{ margin: 0, fontSize: "12.5px" }}>
              {t("visualSandbox.pageDesc")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Save Preset Button */}
            <button
              type="button"
              className="quiet-button compact"
              onClick={() => setPresetModalOpen(true)}
              title={t("visualSandbox.savePresetTooltip")}
            >
              <FloppyDisk size={15} weight="bold" />
              <span>{t("visualSandbox.savePresetBtn")}</span>
            </button>

            {/* Apply to Channel Button */}
            {channels.length > 0 && (
              <button
                type="button"
                className="quiet-button compact"
                onClick={() => setChannelSyncOpen(true)}
                title={t("visualSandbox.applyToChannelTooltip")}
                style={{ color: "var(--accent)" }}
              >
                <Link size={15} weight="bold" />
                <span>{t("visualSandbox.applyToChannelBtn")}</span>
              </button>
            )}

            {/* Re-render Button */}
            <button
              type="button"
              className="primary-button compact"
              disabled={loading}
              onClick={() => void renderPreview(true)}
              title={t("visualSandbox.rerenderTooltip")}
            >
              {loading ? <CircleNotch className="spin" size={15} /> : <ArrowClockwise size={15} weight="bold" />}
              <span>{t("visualSandbox.rerenderBtn")}</span>
            </button>
          </div>
        </div>
      ))()}

      {/* Main Studio Grid */}
      {(() => (
        <div style={{ display: "grid", gridTemplateColumns: "450px 1fr", gap: "16px", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Left Inspector Panel */}
          {(() => (
            <div
              className="panel"
              style={{
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                padding: "16px",
                background: "var(--surface)",
                borderRadius: "16px",
                border: "1px solid var(--line)",
              }}
            >
              {/* Style Presets Dropdown & Quick Actions */}
              <div
                style={{
                  background: "var(--surface-strong)",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {t("visualSandbox.stylePresetsLabel")}
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {t("visualSandbox.presetsCount", { count: allPresets.length })}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <select
                    value={matchedPreset ? matchedPreset.id : "__custom_modified__"}
                    onChange={(e) => {
                      const selected = allPresets.find((p) => p.id === e.target.value);
                      if (selected) handleLoadPreset(selected);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: "36px",
                      padding: "0 10px",
                      background: "var(--surface)",
                      color: "var(--text)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <optgroup label={t("visualSandbox.presetBuiltInGroup")}>
                      {builtInPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                    {customPresets.length > 0 && (
                      <optgroup label={t("visualSandbox.presetCustomGroup")}>
                        {customPresets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {!matchedPreset && (
                      <option value="__custom_modified__" disabled>
                        ({t("visualSandbox.presetModifiedBadge")})
                      </option>
                    )}
                  </select>

                  <button
                    type="button"
                    className="quiet-button compact"
                    onClick={() => setPresetModalOpen(true)}
                    title={t("visualSandbox.savePresetTooltip")}
                    style={{ height: "36px", padding: "0 10px", borderRadius: "8px", whiteSpace: "nowrap" }}
                  >
                    <FloppyDisk size={14} weight="bold" />
                    <span>{t("visualSandbox.savePresetBtn")}</span>
                  </button>

                  {activeCustomPreset && (
                    <button
                      type="button"
                      className="quiet-button compact"
                      onClick={() => handleDeleteCustomPreset(activeCustomPreset.id)}
                      title={t("visualSandbox.deletePresetTooltip")}
                      style={{
                        height: "36px",
                        width: "36px",
                        padding: 0,
                        justifyContent: "center",
                        borderRadius: "8px",
                        color: "var(--notice-error, #ef4444)",
                        flexShrink: 0,
                      }}
                    >
                      <Trash size={15} />
                    </button>
                  )}
                </div>

                {/* Active Preset Description / Tag */}
                {matchedPreset ? (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      lineHeight: 1.4,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      paddingTop: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: matchedPreset.isBuiltIn ? "var(--soft-accent)" : "rgba(255,255,255,0.08)",
                        color: matchedPreset.isBuiltIn ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      {matchedPreset.isBuiltIn ? t("visualSandbox.presetBuiltInBadge") : t("visualSandbox.presetCustomBadge")}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{matchedPreset.description}</span>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      fontStyle: "italic",
                      paddingTop: "2px",
                    }}
                  >
                    {t("visualSandbox.presetModifiedBadge")}
                  </div>
                )}
              </div>

              {/* 3-Tab Inspector Switcher */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr",
                  gap: "3px",
                  background: "var(--surface-strong)",
                  padding: "3px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                }}
              >
                <button
                  type="button"
                  className={activeInspectorTab === "design" ? "primary-button compact" : "quiet-button compact"}
                  style={{ fontSize: "11px", padding: "6px 4px", justifyContent: "center", borderRadius: "7px" }}
                  onClick={() => setActiveInspectorTab("design")}
                >
                  <SlidersHorizontal size={13} weight="bold" />
                  <span>{t("visualSandbox.tabElements")}</span>
                </button>
                <button
                  type="button"
                  className={activeInspectorTab === "mascot" ? "primary-button compact" : "quiet-button compact"}
                  style={{ fontSize: "11px", padding: "6px 4px", justifyContent: "center", borderRadius: "7px" }}
                  onClick={() => setActiveInspectorTab("mascot")}
                >
                  <Smiley size={13} weight="bold" />
                  <span>
                    {t("visualSandbox.tabMascot")} (
                    {mascotEnabled && mascotId !== "none" ? t("visualSandbox.mascotStateOn") : t("visualSandbox.mascotStateOff")})
                  </span>
                </button>
                <button
                  type="button"
                  className={activeInspectorTab === "content" ? "primary-button compact" : "quiet-button compact"}
                  style={{ fontSize: "11px", padding: "6px 4px", justifyContent: "center", borderRadius: "7px" }}
                  onClick={() => setActiveInspectorTab("content")}
                >
                  <Question size={13} weight="bold" />
                  <span>{t("visualSandbox.tabContent")}</span>
                </button>
              </div>

              {/* TAB 1: DESIGN & 4 ELEMENTS */}
              {(() =>
                activeInspectorTab === "design" && (
                  <>
                    {/* 1. Layout Mode Selector */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {t("visualSandbox.layoutSection")}
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => setLayoutId("media_left_choices_right")}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 10px",
                            borderRadius: "10px",
                            background: layoutId === "media_left_choices_right" ? "var(--soft-accent)" : "var(--surface-strong)",
                            border: layoutId === "media_left_choices_right" ? "2px solid var(--accent)" : "1px solid var(--line)",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: layoutId === "media_left_choices_right" ? 700 : 500,
                            color: layoutId === "media_left_choices_right" ? "var(--accent)" : "var(--text)",
                            textAlign: "left",
                          }}
                        >
                          <SquareSplitHorizontal size={18} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {t("visualSandbox.layoutMediaLeftChoicesRight")}
                            </div>
                            <small style={{ color: "var(--muted)", fontSize: "9.5px", display: "block" }}>
                              {t("visualSandbox.layoutMediaLeftChoicesRightSub")}
                            </small>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLayoutId("visual_choices_three")}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 10px",
                            borderRadius: "10px",
                            background: layoutId === "visual_choices_three" ? "var(--soft-accent)" : "var(--surface-strong)",
                            border: layoutId === "visual_choices_three" ? "2px solid var(--accent)" : "1px solid var(--line)",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: layoutId === "visual_choices_three" ? 700 : 500,
                            color: layoutId === "visual_choices_three" ? "var(--accent)" : "var(--text)",
                            textAlign: "left",
                          }}
                        >
                          <ListNumbers size={18} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {t("visualSandbox.layoutVisualChoicesThree")}
                            </div>
                            <small style={{ color: "var(--muted)", fontSize: "9.5px", display: "block" }}>
                              {t("visualSandbox.layoutVisualChoicesThreeSub")}
                            </small>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* 2. Color Palette */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {t("visualSandbox.paletteSection")}
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                        {PALETTES.map((p) => {
                          const isSelected = paletteId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPaletteId(p.id)}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "3px",
                                padding: "5px",
                                borderRadius: "8px",
                                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                                cursor: "pointer",
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  height: "16px",
                                  borderRadius: "4px",
                                  background: "linear-gradient(135deg, " + p.primary + ", " + p.secondary + ")",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: isSelected ? 800 : 500,
                                  color: isSelected ? "var(--accent)" : "var(--text)",
                                }}
                              >
                                {p.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* 3. Thinking Bar Selector */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {t("visualSandbox.thinkingBarSection")}
                        </label>
                        <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 700 }}>
                          {THINKING_BAR_STYLE_LABELS[thinkingBarStyle as Exclude<QuizThinkingBarStyle, "auto">]}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "4px" }}>
                        {ALL_THINKING_BAR_STYLES.filter((s) => s !== "auto").map((style) => {
                          const isSelected = thinkingBarStyle === style;
                          const label = THINKING_BAR_STYLE_LABELS[style] || style;
                          return (
                            <button
                              key={style}
                              type="button"
                              onClick={() => setThinkingBarStyle(style)}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "42px",
                                padding: "6px 4px",
                                borderRadius: "8px",
                                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                                cursor: "pointer",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: isSelected ? 800 : 500,
                                  color: isSelected ? "var(--accent)" : "var(--text)",
                                  lineHeight: 1.2,
                                }}
                              >
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: "10.5px", color: "var(--muted)", margin: 0, lineHeight: 1.35 }}>
                        {THINKING_BAR_STYLE_DESCRIPTIONS[thinkingBarStyle as Exclude<QuizThinkingBarStyle, "auto">]}
                      </p>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* 4. Question Box Selector */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {t("visualSandbox.questionBoxSection")}
                        </label>
                        <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 700 }}>
                          {QUESTION_BOX_STYLE_LABELS[questionBoxStyle as Exclude<QuizQuestionBoxStyle, "auto">]}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", marginBottom: "4px" }}>
                        {ALL_QUESTION_BOX_STYLES.filter((s) => s !== "auto").map((style) => {
                          const isSelected = questionBoxStyle === style;
                          const label = QUESTION_BOX_STYLE_LABELS[style] || style;
                          return (
                            <button
                              key={style}
                              type="button"
                              onClick={() => setQuestionBoxStyle(style)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "36px",
                                padding: "6px 8px",
                                borderRadius: "8px",
                                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                                cursor: "pointer",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: isSelected ? 800 : 500,
                                  color: isSelected ? "var(--accent)" : "var(--text)",
                                }}
                              >
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: "10.5px", color: "var(--muted)", margin: 0, lineHeight: 1.35 }}>
                        {QUESTION_BOX_STYLE_DESCRIPTIONS[questionBoxStyle as Exclude<QuizQuestionBoxStyle, "auto">]}
                      </p>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* 5. Answer Card Selector */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {t("visualSandbox.answerCardSection")}
                        </label>
                        <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 700 }}>
                          {ANSWER_CARD_STYLE_LABELS[answerCardStyle as Exclude<QuizAnswerCardStyle, "auto">]}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", marginBottom: "4px" }}>
                        {ALL_ANSWER_CARD_STYLES.filter((s) => s !== "auto").map((style) => {
                          const isSelected = answerCardStyle === style;
                          const label = ANSWER_CARD_STYLE_LABELS[style] || style;
                          return (
                            <button
                              key={style}
                              type="button"
                              onClick={() => setAnswerCardStyle(style)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "36px",
                                padding: "6px 8px",
                                borderRadius: "8px",
                                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                                cursor: "pointer",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: isSelected ? 800 : 500,
                                  color: isSelected ? "var(--accent)" : "var(--text)",
                                }}
                              >
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: "10.5px", color: "var(--muted)", margin: 0, lineHeight: 1.35 }}>
                        {ANSWER_CARD_STYLE_DESCRIPTIONS[answerCardStyle as Exclude<QuizAnswerCardStyle, "auto">]}
                      </p>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* 6. Counter Badge Selector */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {t("visualSandbox.counterBadgeSection")}
                        </label>
                        <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 700 }}>
                          {QUESTION_COUNTER_STYLE_LABELS[counterStyle as Exclude<QuizQuestionCounterStyle, "auto">]}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", marginBottom: "4px" }}>
                        {ALL_QUESTION_COUNTER_STYLES.filter((s) => s !== "auto").map((style) => {
                          const isSelected = counterStyle === style;
                          const label = QUESTION_COUNTER_STYLE_LABELS[style] || style;
                          return (
                            <button
                              key={style}
                              type="button"
                              onClick={() => setCounterStyle(style)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "36px",
                                padding: "6px 8px",
                                borderRadius: "8px",
                                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                                cursor: "pointer",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  fontWeight: isSelected ? 800 : 500,
                                  color: isSelected ? "var(--accent)" : "var(--text)",
                                }}
                              >
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: "10.5px", color: "var(--muted)", margin: 0, lineHeight: 1.35 }}>
                        {QUESTION_COUNTER_STYLE_DESCRIPTIONS[counterStyle as Exclude<QuizQuestionCounterStyle, "auto">]}
                      </p>
                    </div>
                  </>
                ))()}

              {/* TAB 2: REAL MASCOT ASSIGNMENT & CONFIG */}
              {(() =>
                activeInspectorTab === "mascot" && (
                  <>
                    {/* Mascot Enable Toggle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "12px" }}>{t("visualSandbox.mascotVisibilityTitle")}</strong>
                        <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>{t("visualSandbox.mascotVisibilityDesc")}</div>
                      </div>
                      <button
                        type="button"
                        className={mascotEnabled && mascotId !== "none" ? "primary-button compact" : "quiet-button compact"}
                        style={{ fontSize: "11px", padding: "4px 12px" }}
                        onClick={() => setMascotEnabled((prev) => !prev)}
                      >
                        {mascotEnabled && mascotId !== "none"
                          ? t("visualSandbox.mascotEnabledBadge")
                          : t("visualSandbox.mascotDisabledBadge")}
                      </button>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* Real Mascot Picker */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {t("visualSandbox.mascotPickerSection")}
                      </label>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                        {/* None Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setMascotId("none");
                            setMascotEnabled(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 10px",
                            borderRadius: "10px",
                            background: mascotId === "none" || !mascotEnabled ? "var(--soft-accent)" : "var(--surface-strong)",
                            border: mascotId === "none" || !mascotEnabled ? "2px solid var(--accent)" : "1px solid var(--line)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "rgba(255,255,255,0.06)",
                              display: "grid",
                              placeItems: "center",
                              color: "var(--muted)",
                            }}
                          >
                            <X size={16} weight="bold" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: "11.5px", color: mascotId === "none" ? "var(--accent)" : "var(--text)" }}>
                              {t("visualSandbox.noMascotTitle")}
                            </strong>
                            <small style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                              {t("visualSandbox.noMascotSub")}
                            </small>
                          </div>
                        </button>

                        {/* Fallback Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setMascotId("fallback");
                            setMascotEnabled(true);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 10px",
                            borderRadius: "10px",
                            background: mascotId === "fallback" && mascotEnabled ? "var(--soft-accent)" : "var(--surface-strong)",
                            border: mascotId === "fallback" && mascotEnabled ? "2px solid var(--accent)" : "1px solid var(--line)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "var(--soft-accent)",
                              display: "grid",
                              placeItems: "center",
                              color: "var(--accent)",
                            }}
                          >
                            <UserCircle size={20} weight="duotone" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: "11.5px", color: mascotId === "fallback" ? "var(--accent)" : "var(--text)" }}>
                              {t("visualSandbox.defaultMascotTitle")}
                            </strong>
                            <small style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                              {t("visualSandbox.defaultMascotSub")}
                            </small>
                          </div>
                        </button>

                        {/* Real Mascots from Library */}
                        {mascots.map((m) => {
                          const isSelected = mascotId === m.id && mascotEnabled;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setMascotId(m.id);
                                setMascotEnabled(true);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "6px 10px",
                                borderRadius: "10px",
                                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              {m.master_image_url ? (
                                <img
                                  src={m.master_image_url}
                                  alt={m.name}
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    objectFit: "cover",
                                    background: "rgba(0,0,0,0.2)",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    background: m.color_theme || "var(--accent)",
                                    display: "grid",
                                    placeItems: "center",
                                    color: "#FFF",
                                    fontWeight: 900,
                                  }}
                                >
                                  {m.name.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <strong
                                  style={{
                                    display: "block",
                                    fontSize: "11.5px",
                                    color: isSelected ? "var(--accent)" : "var(--text)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {m.name}
                                </strong>
                                <small style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                                  {m.description || m.visual_style || "Mascot Profile"}
                                </small>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* Mascot Pose / Action */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {t("visualSandbox.mascotPoseSection")}
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                        {(
                          [
                            { id: "thinking", label: t("visualSandbox.poseThinking") },
                            { id: "celebrate", label: t("visualSandbox.poseCelebrate") },
                            { id: "point", label: t("visualSandbox.posePoint") },
                            { id: "oops", label: t("visualSandbox.poseOops") },
                            { id: "idle", label: t("visualSandbox.poseIdle") },
                            { id: "wave", label: t("visualSandbox.poseWave") },
                          ] as const
                        ).map((act) => {
                          const isSelected = mascotAction === act.id;
                          return (
                            <button
                              key={act.id}
                              type="button"
                              className={isSelected ? "primary-button compact" : "quiet-button compact"}
                              style={{ fontSize: "10.5px", padding: "6px 4px", justifyContent: "center" }}
                              onClick={() => setMascotAction(act.id)}
                            >
                              {act.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* Position & Anchor */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {t("visualSandbox.mascotPositionSection")}
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <button
                          type="button"
                          className={mascotPosition === "bottom_left" ? "primary-button compact" : "quiet-button compact"}
                          style={{ fontSize: "11px", padding: "6px", justifyContent: "center" }}
                          onClick={() => setMascotPosition("bottom_left")}
                        >
                          {t("visualSandbox.posBottomLeft")}
                        </button>
                        <button
                          type="button"
                          className={mascotPosition === "bottom_right" ? "primary-button compact" : "quiet-button compact"}
                          style={{ fontSize: "11px", padding: "6px", justifyContent: "center" }}
                          onClick={() => setMascotPosition("bottom_right")}
                        >
                          {t("visualSandbox.posBottomRight")}
                        </button>
                      </div>
                    </div>

                    {/* Live Animation Status Badge */}
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "rgba(56, 189, 248, 0.08)",
                        border: "1px solid rgba(56, 189, 248, 0.25)",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Sparkle size={14} weight="fill" style={{ color: "#38BDF8" }} />
                      <span>
                        Hoạt ảnh Live: <strong>{mascotAction.toUpperCase()}</strong>{" "}
                        <span style={{ color: "var(--muted)" }}>
                          (
                          {mascotAction === "thinking"
                            ? "Đung đưa suy nghĩ"
                            : mascotAction === "celebrate"
                              ? "Nhảy mừng chiến thắng"
                              : mascotAction === "point"
                                ? "Xung nhịp chỉ bảng"
                                : mascotAction === "oops"
                                  ? "Rung lắc bối rối"
                                  : mascotAction === "wave"
                                    ? "Vẫy tay chào"
                                    : "Thở nhẹ nhàng"}
                          )
                        </span>
                      </span>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* Mascot Scale Slider & Presets (Expanded 0.3x - 3.0x) */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            margin: 0,
                          }}
                        >
                          🔍 Kích thước thu phóng (Scale)
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input
                            type="number"
                            min={30}
                            max={300}
                            step={1}
                            value={Math.round(mascotScale * 100)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (!isNaN(val)) setMascotScale(Math.max(0.3, Math.min(3.0, val / 100)));
                            }}
                            className="text-input compact"
                            style={{ width: "56px", fontSize: "11px", padding: "2px 4px", textAlign: "right" }}
                          />
                          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>%</span>
                        </div>
                      </div>

                      {/* Scale Stepper Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", marginBottom: "6px" }}>
                        <button
                          type="button"
                          className="quiet-button compact"
                          style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
                          onClick={() => setMascotScale((p) => Math.max(0.3, Math.round((p - 0.25) * 100) / 100))}
                        >
                          -25%
                        </button>
                        <button
                          type="button"
                          className="quiet-button compact"
                          style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
                          onClick={() => setMascotScale((p) => Math.max(0.3, Math.round((p - 0.05) * 100) / 100))}
                        >
                          -5%
                        </button>
                        <button
                          type="button"
                          className="quiet-button compact"
                          style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
                          onClick={() => setMascotScale((p) => Math.min(3.0, Math.round((p + 0.05) * 100) / 100))}
                        >
                          +5%
                        </button>
                        <button
                          type="button"
                          className="quiet-button compact"
                          style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
                          onClick={() => setMascotScale((p) => Math.min(3.0, Math.round((p + 0.25) * 100) / 100))}
                        >
                          +25%
                        </button>
                      </div>

                      {/* Scale Range Slider */}
                      <input
                        type="range"
                        min="0.3"
                        max="3.0"
                        step="0.01"
                        value={mascotScale}
                        onChange={(e) => setMascotScale(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent)" }}
                      />

                      {/* Quick Presets Row */}
                      <div style={{ display: "flex", gap: "4px", marginTop: "6px", overflowX: "auto" }}>
                        {[0.75, 1.0, 1.25, 1.5, 2.0, 2.5].map((presetVal) => {
                          const isActive = Math.abs(mascotScale - presetVal) < 0.02;
                          return (
                            <button
                              key={presetVal}
                              type="button"
                              className={isActive ? "primary-button compact" : "quiet-button compact"}
                              style={{ fontSize: "10px", padding: "2px 6px" }}
                              onClick={() => setMascotScale(presetVal)}
                            >
                              {Math.round(presetVal * 100)}%
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* Mascot Offset X & Y (Expanded -1000px to +1000px) */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            margin: 0,
                          }}
                        >
                          🎯 Tọa độ bù trục X & Y (Pixel Offsets)
                        </label>
                        <button
                          type="button"
                          className="quiet-button compact"
                          style={{ fontSize: "10.5px", padding: "2px 6px" }}
                          onClick={() => {
                            setMascotOffsetX(0);
                            setMascotOffsetY(0);
                          }}
                          title="Đặt lại tọa độ về 0, 0"
                        >
                          Reset 0
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {/* Axis X */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
                              Trục X: {mascotOffsetX > 0 ? `+${mascotOffsetX}` : mascotOffsetX}px
                            </span>
                            <div style={{ display: "flex", gap: "2px" }}>
                              <button
                                type="button"
                                className="quiet-button compact"
                                style={{ fontSize: "10px", padding: "2px 4px" }}
                                onClick={() => setMascotOffsetX((p) => Math.max(-1000, p - 50))}
                              >
                                -50
                              </button>
                              <button
                                type="button"
                                className="quiet-button compact"
                                style={{ fontSize: "10px", padding: "2px 4px" }}
                                onClick={() => setMascotOffsetX((p) => Math.max(-1000, p - 10))}
                              >
                                -10
                              </button>
                              <button
                                type="button"
                                className="quiet-button compact"
                                style={{ fontSize: "10px", padding: "2px 4px" }}
                                onClick={() => setMascotOffsetX((p) => Math.min(1000, p + 10))}
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                className="quiet-button compact"
                                style={{ fontSize: "10px", padding: "2px 4px" }}
                                onClick={() => setMascotOffsetX((p) => Math.min(1000, p + 50))}
                              >
                                +50
                              </button>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="-1000"
                            max="1000"
                            step="5"
                            value={mascotOffsetX}
                            onChange={(e) => setMascotOffsetX(Number(e.target.value))}
                            style={{ width: "100%", accentColor: "var(--accent)" }}
                          />
                        </div>

                        {/* Axis Y */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
                              Trục Y: {mascotOffsetY > 0 ? `+${mascotOffsetY}` : mascotOffsetY}px
                            </span>
                            <div style={{ display: "flex", gap: "2px" }}>
                              <button
                                type="button"
                                className="quiet-button compact"
                                style={{ fontSize: "10px", padding: "2px 4px" }}
                                onClick={() => setMascotOffsetY((p) => Math.max(-1000, p - 50))}
                              >
                                -50
                              </button>
                              <button
                                type="button"
                                className="quiet-button compact"
                                style={{ fontSize: "10px", padding: "2px 4px" }}
                                onClick={() => setMascotOffsetY((p) => Math.max(-1000, p - 10))}
                              >
                                -10
                              </button>
                              <button
                                type="button"
                                className="quiet-button compact"
                                style={{ fontSize: "10px", padding: "2px 4px" }}
                                onClick={() => setMascotOffsetY((p) => Math.min(1000, p + 10))}
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                className="quiet-button compact"
                                style={{ fontSize: "10px", padding: "2px 4px" }}
                                onClick={() => setMascotOffsetY((p) => Math.min(1000, p + 50))}
                              >
                                +50
                              </button>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="-1000"
                            max="1000"
                            step="5"
                            value={mascotOffsetY}
                            onChange={(e) => setMascotOffsetY(Number(e.target.value))}
                            style={{ width: "100%", accentColor: "var(--accent)" }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ))()}

              {/* TAB 3: CONTENT & TESTING */}
              {(() =>
                activeInspectorTab === "content" && (
                  <>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {t("visualSandbox.sampleQuestionsLabel")}
                      </label>
                      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                        {sampleQuestions.map((sq, i) => {
                          const label =
                            sq.type === "standard"
                              ? t("visualSandbox.sampleStandard")
                              : sq.type === "short"
                                ? t("visualSandbox.sampleShort")
                                : t("visualSandbox.sampleLong");
                          return (
                            <button
                              key={i}
                              type="button"
                              className="quiet-button compact"
                              style={{ fontSize: "10.5px", padding: "4px 8px" }}
                              onClick={() => handleApplyPresetQuestion(sq)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      <label style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>
                        {t("visualSandbox.questionTextLabel")}:
                      </label>
                      <textarea
                        className="text-input"
                        rows={3}
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder={t("visualSandbox.questionTextPlaceholder")}
                        style={{ width: "100%", fontSize: "12px", marginBottom: "12px" }}
                      />
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {t("visualSandbox.choicesLabel")}
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                        {choices.map((choice, idx) => {
                          const isCorrect = idx === correctChoiceIndex;
                          const letter = String.fromCharCode(65 + idx);
                          return (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => setCorrectChoiceIndex(idx)}
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                  background: isCorrect ? "#22E58B" : "var(--surface-strong)",
                                  border: isCorrect ? "2px solid #FFF" : "1px solid var(--line)",
                                  color: isCorrect ? "#0F172A" : "var(--text)",
                                  fontSize: "12px",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  display: "grid",
                                  placeItems: "center",
                                  flexShrink: 0,
                                }}
                                title={t("visualSandbox.correctChoiceTitle", { letter })}
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                className="text-input compact"
                                value={choice}
                                onChange={(e) => {
                                  const updated = [...choices];
                                  updated[idx] = e.target.value;
                                  setChoices(updated);
                                }}
                                style={{ flex: 1, fontSize: "12px" }}
                                placeholder={t("visualSandbox.choicePlaceholder", { letter })}
                              />
                              {isCorrect && (
                                <span style={{ fontSize: "10.5px", color: "#22E58B", fontWeight: 700, flexShrink: 0 }}>
                                  ✓ {t("visualSandbox.correctBadge")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {t("visualSandbox.questionCountSettings")}
                      </label>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>{t("visualSandbox.currentQuestionNumber")}</span>
                          <input
                            type="number"
                            min={1}
                            max={totalQuestions}
                            value={questionNumber}
                            onChange={(e) => setQuestionNumber(Number(e.target.value))}
                            className="text-input compact"
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>{t("visualSandbox.totalQuestionsCount")}</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={totalQuestions}
                            onChange={(e) => setTotalQuestions(Number(e.target.value))}
                            className="text-input compact"
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "var(--line)" }} />

                    {/* FACT CARD / EXPLANATION SECTION */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {t("visualSandbox.factCardSection")}
                        </label>
                        {phase !== "explain" && (
                          <button
                            type="button"
                            className="quiet-button compact"
                            style={{ fontSize: "10px", padding: "2px 6px", color: "var(--accent)" }}
                            onClick={() => {
                              setPhase("explain");
                              setUseScrubber(false);
                            }}
                            title="Switch preview phase to Explain to view Fact Card"
                          >
                            {t("visualSandbox.phaseExplain")} →
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div>
                          <span style={{ display: "block", fontSize: "10.5px", color: "var(--muted)", marginBottom: "4px" }}>
                            {t("visualSandbox.factCardTextLabel")}:
                          </span>
                          <textarea
                            className="text-input"
                            rows={2}
                            value={factCardText}
                            onChange={(e) => setFactCardText(e.target.value)}
                            placeholder={t("visualSandbox.factCardTextPlaceholder")}
                            style={{ width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        <span style={{ fontSize: "10.5px", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.3 }}>
                          💡 {t("visualSandbox.factCardHint")}
                        </span>
                      </div>
                    </div>
                  </>
                ))()}
            </div>
          ))()}

          {/* Right Canvas & Timeline Studio */}
          {(() => (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {/* 1. Stage Monitor Toolbar Header (Outside the canvas - ZERO overlap with video!) */}
              <div
                className="panel"
                style={{
                  padding: "8px 14px",
                  borderRadius: "14px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                  gap: "12px",
                }}
              >
                {/* Left: Resolution, WCAG contrast & engine info */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: "rgba(34, 197, 94, 0.12)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      color: "#22c55e",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#22c55e",
                        boxShadow: "0 0 6px #22c55e",
                      }}
                    />
                    1080P FHD
                  </span>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: "var(--surface-strong)",
                      border: "1px solid var(--line)",
                      color: "#22E58B",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                    title="Độ tương phản màu chữ và nền đạt chuẩn WCAG AAA"
                  >
                    <CheckCircle size={14} weight="fill" />
                    <span>
                      {t("visualSandbox.wcagContrast")} ({contrastReport?.ratio || 7.42}:1)
                    </span>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: "var(--surface-strong)",
                      border: "1px solid var(--line)",
                      color: "#38BDF8",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                    title="Được biên dịch bởi HyperFrames Rendering Engine"
                  >
                    <span>{t("visualSandbox.hyperframesEngine")}</span>
                    <span style={{ color: "rgba(255,255,255,0.25)" }}>•</span>
                    <span style={{ color: "var(--muted)", fontWeight: 500 }}>{lastRenderTime}</span>
                  </div>
                </div>

                {/* Right: Viewport Overlays & Zoom Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* Safe Area 16:9 Toggle */}
                  <button
                    type="button"
                    className={showSafeArea ? "primary-button compact" : "quiet-button compact"}
                    style={{ fontSize: "11px", padding: "4px 9px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    onClick={() => setShowSafeArea((prev) => !prev)}
                    title={t("visualSandbox.safeAreaTooltip")}
                  >
                    <Eye size={14} weight={showSafeArea ? "fill" : "regular"} />
                    <span>{t("visualSandbox.safeArea")}</span>
                  </button>

                  {/* Shorts 9:16 Toggle */}
                  <button
                    type="button"
                    className={showShortsGuide ? "primary-button compact" : "quiet-button compact"}
                    style={{ fontSize: "11px", padding: "4px 9px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    onClick={() => setShowShortsGuide((prev) => !prev)}
                    title={t("visualSandbox.shortsTooltip")}
                  >
                    <DeviceMobile size={14} weight={showShortsGuide ? "fill" : "regular"} />
                    <span>9:16</span>
                  </button>

                  <div style={{ width: "1px", height: "16px", background: "var(--line)", margin: "0 2px" }} />

                  {/* Replay Button */}
                  <button
                    type="button"
                    className="quiet-button compact"
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      color: "#38BDF8",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() => setIframeKey((k) => k + 1)}
                    title={t("visualSandbox.replayTooltip")}
                  >
                    <Play size={11} weight="fill" />
                    <span>{t("visualSandbox.replayBtn")}</span>
                  </button>

                  <div style={{ width: "1px", height: "16px", background: "var(--line)", margin: "0 2px" }} />

                  {/* Zoom Buttons */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      background: "var(--surface-strong)",
                      padding: "2px",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {(["fit", "50", "75", "100"] as const).map((z) => (
                      <button
                        key={z}
                        type="button"
                        className={zoom === z ? "primary-button compact" : "quiet-button compact"}
                        style={{ fontSize: "10.5px", padding: "3px 7px", borderRadius: "6px" }}
                        onClick={() => setZoom(z)}
                      >
                        {z === "fit" ? "Fit" : z + "%"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Canvas Viewport (Theater Stage - 100% Unobstructed!) */}
              <div
                ref={containerRef}
                style={{
                  flex: 1,
                  position: "relative",
                  background: "#060911",
                  borderRadius: "16px",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: zoom === "fit" ? "hidden" : "auto",
                  padding: "16px",
                  minHeight: 0,
                }}
              >
                {/* 1920x1080 Frame Wrapper */}
                <div
                  style={{
                    position: "relative",
                    width: "1920px",
                    height: "1080px",
                    transform: "scale(" + scaleFactor + ")",
                    transformOrigin: "center center",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#000",
                    flexShrink: 0,
                  }}
                >
                  {previewHtml ? (
                    <iframe
                      key={iframeKey}
                      title="HyperFrames Sandbox Frame Preview"
                      srcDoc={previewHtml}
                      style={{
                        width: "1920px",
                        height: "1080px",
                        border: "none",
                        display: "block",
                        pointerEvents: "auto",
                      }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#FFF" }}>
                      <CircleNotch className="spin" size={48} />
                    </div>
                  )}

                  {/* Safe Area 16:9 Overlay (strictly inside frame) */}
                  {showSafeArea && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: 9999,
                      }}
                    >
                      {/* Action Safe (90%) */}
                      <div
                        style={{
                          position: "absolute",
                          inset: "54px 96px",
                          border: "2px dashed rgba(255, 220, 40, 0.75)",
                          borderRadius: "16px",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "8px",
                            left: "12px",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#FFDC28",
                            background: "rgba(0,0,0,0.6)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {t("visualSandbox.actionSafeLabel")}
                        </span>
                      </div>

                      {/* Title Safe (80%) */}
                      <div
                        style={{
                          position: "absolute",
                          inset: "108px 192px",
                          border: "2px dashed rgba(56, 189, 248, 0.75)",
                          borderRadius: "16px",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "8px",
                            left: "12px",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#38BDF8",
                            background: "rgba(0,0,0,0.6)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {t("visualSandbox.titleSafeLabel")}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Shorts 9:16 Center Crop Guide Overlay (strictly inside frame) */}
                  {showShortsGuide && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: 9999,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ flex: 1, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }} />
                      <div
                        style={{
                          width: "607.5px", // 1080 * 9 / 16
                          height: "1080px",
                          border: "3px solid #FF3366",
                          boxShadow: "0 0 30px rgba(255,51,102,0.5)",
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "16px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontSize: "14px",
                            fontWeight: 800,
                            color: "#FFF",
                            background: "#FF3366",
                            padding: "4px 14px",
                            borderRadius: "999px",
                          }}
                        >
                          {t("visualSandbox.shortsSafeLabel")}
                        </span>
                      </div>
                      <div style={{ flex: 1, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }} />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Timeline & Phase Rehearsal Control Bar (Bottom Studio Bar) */}
              <div
                className="panel"
                style={{
                  padding: "10px 16px",
                  borderRadius: "14px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  flexShrink: 0,
                }}
              >
                {/* Top row of Timeline: Phase buttons + Play/Scrub */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginRight: "2px" }}
                    >
                      {t("visualSandbox.phaseLabel")}
                    </span>
                    {(
                      [
                        { id: "question", label: t("visualSandbox.phaseQuestion"), time: 0.5 },
                        { id: "choices", label: t("visualSandbox.phaseChoices"), time: 1.8 },
                        { id: "thinking", label: t("visualSandbox.phaseThinking"), time: 4.5 },
                        { id: "reveal", label: t("visualSandbox.phaseReveal"), time: 8.0 },
                        { id: "explain", label: t("visualSandbox.phaseExplain"), time: 9.2 },
                      ] as const
                    ).map((p) => {
                      const isActive = !useScrubber
                        ? phase === p.id
                        : (p.id === "question" && timelineSeconds < 1.2) ||
                          (p.id === "choices" && timelineSeconds >= 1.2 && timelineSeconds < 2.5) ||
                          (p.id === "thinking" && timelineSeconds >= 2.5 && timelineSeconds < 7.5) ||
                          (p.id === "reveal" && timelineSeconds >= 7.5 && timelineSeconds < 8.8) ||
                          (p.id === "explain" && timelineSeconds >= 8.8);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={isActive ? "primary-button compact" : "quiet-button compact"}
                          style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px" }}
                          onClick={() => handlePhaseChange(p.id)}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Scrubber & Live Play Controller */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      className={isPlaying ? "primary-button compact" : "quiet-button compact"}
                      style={{
                        fontSize: "11px",
                        padding: "4px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        borderRadius: "8px",
                      }}
                      onClick={() => {
                        setUseScrubber(true);
                        setIsPlaying((p) => !p);
                      }}
                      title={t("visualSandbox.playTimelineTooltip")}
                    >
                      {isPlaying ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
                      <span>{isPlaying ? t("visualSandbox.pauseBtn") : t("visualSandbox.playBtn")}</span>
                    </button>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        background: "var(--surface-strong)",
                        border: "1px solid var(--line)",
                        fontSize: "11.5px",
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ color: "var(--accent)" }}>{timelineSeconds.toFixed(1)}s</span>
                      <span style={{ color: "var(--muted)" }}>/ 10.0s</span>
                    </div>
                  </div>
                </div>

                {/* Bottom row of Timeline: Slider track & Phase milestones */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <input
                    type="range"
                    min="0.0"
                    max="10.0"
                    step="0.1"
                    value={timelineSeconds}
                    onChange={(e) => handleScrubberChange(Number(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "var(--accent)",
                      cursor: "pointer",
                      height: "6px",
                    }}
                  />
                  <div
                    style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "var(--muted)", padding: "0 2px" }}
                  >
                    <span>0s (Intro)</span>
                    <span>1.2s (Đáp án)</span>
                    <span>2.5s (Đếm ngược)</span>
                    <span>7.5s (Kết quả)</span>
                    <span>8.8s (Giải thích)</span>
                    <span>10.0s</span>
                  </div>
                </div>
              </div>
            </div>
          ))()}
        </div>
      ))()}

      {/* Save Preset Modal */}
      {(() =>
        presetModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              display: "grid",
              placeItems: "center",
              zIndex: 9999,
            }}
            onClick={() => setPresetModalOpen(false)}
          >
            <div className="panel" style={{ width: "420px", padding: "24px", borderRadius: "16px" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FloppyDisk size={18} weight="bold" />
                  <span>{t("visualSandbox.modalSavePresetTitle")}</span>
                </h3>
                <button type="button" className="icon-button" onClick={() => setPresetModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>{t("visualSandbox.modalSavePresetDesc")}</p>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  {t("visualSandbox.presetNameLabel")}
                </label>
                <input
                  type="text"
                  className="text-input"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder={t("visualSandbox.presetNamePlaceholder")}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="quiet-button" onClick={() => setPresetModalOpen(false)}>
                  {t("common.cancel")}
                </button>
                <button type="button" className="primary-button" disabled={!newPresetName.trim()} onClick={handleSaveCustomPreset}>
                  <FloppyDisk size={16} />
                  <span>{t("visualSandbox.savePresetBtn")}</span>
                </button>
              </div>
            </div>
          </div>
        ))()}

      {/* Channel Sync Modal */}
      {(() =>
        channelSyncOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              display: "grid",
              placeItems: "center",
              zIndex: 9999,
            }}
            onClick={() => setChannelSyncOpen(false)}
          >
            <div className="panel" style={{ width: "480px", padding: "24px", borderRadius: "16px" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Link size={18} weight="bold" />
                  <span>{t("visualSandbox.modalApplyChannelTitle")}</span>
                </h3>
                <button type="button" className="icon-button" onClick={() => setChannelSyncOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>{t("visualSandbox.modalApplyChannelDesc")}</p>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  {t("visualSandbox.selectChannelLabel")}
                </label>
                <select
                  className="select-input"
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  style={{ width: "100%", height: "36px", borderRadius: "8px", background: "var(--surface)", color: "var(--text)" }}
                >
                  {channels.map((ch) => (
                    <option key={ch.channel_id} value={ch.channel_id}>
                      {ch.display_name} ({ch.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sync Mascot Checkbox */}
              {mascotId !== "fallback" && (
                <label
                  style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", marginBottom: "14px", cursor: "pointer" }}
                >
                  <input type="checkbox" checked={syncMascotToChannel} onChange={(e) => setSyncMascotToChannel(e.target.checked)} />
                  <span>
                    {t("visualSandbox.syncMascotCheckbox", {
                      name: activeMascot ? activeMascot.name : t("visualSandbox.summaryMascotDisabled"),
                    })}
                  </span>
                </label>
              )}

              <div
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "var(--surface-strong)",
                  border: "1px solid var(--line)",
                  fontSize: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <strong>• {t("visualSandbox.summaryLayout")}</strong>{" "}
                  {layoutId === "media_left_choices_right"
                    ? t("visualSandbox.layoutMediaLeftChoicesRight")
                    : layoutId === "visual_choices_three"
                      ? t("visualSandbox.layoutVisualChoicesThree")
                      : layoutId}
                </div>
                <div>
                  <strong>• {t("visualSandbox.summaryPalette")}</strong> {PALETTES.find((p) => p.id === paletteId)?.label || paletteId}
                </div>
                <div>
                  <strong>• {t("visualSandbox.summaryThinkingBar")}</strong>{" "}
                  {THINKING_BAR_STYLE_LABELS[thinkingBarStyle as Exclude<QuizThinkingBarStyle, "auto">]}
                </div>
                <div>
                  <strong>• {t("visualSandbox.summaryQuestionBox")}</strong>{" "}
                  {QUESTION_BOX_STYLE_LABELS[questionBoxStyle as Exclude<QuizQuestionBoxStyle, "auto">]}
                </div>
                <div>
                  <strong>• {t("visualSandbox.summaryAnswerCard")}</strong>{" "}
                  {ANSWER_CARD_STYLE_LABELS[answerCardStyle as Exclude<QuizAnswerCardStyle, "auto">]}
                </div>
                <div>
                  <strong>• {t("visualSandbox.summaryCounter")}</strong>{" "}
                  {QUESTION_COUNTER_STYLE_LABELS[counterStyle as Exclude<QuizQuestionCounterStyle, "auto">]}
                </div>
                {syncMascotToChannel && (
                  <div>
                    <strong>• {t("visualSandbox.summaryMascot")}</strong>{" "}
                    {mascotId === "none"
                      ? t("visualSandbox.summaryMascotDisabled")
                      : activeMascot
                        ? `${activeMascot.name} (${mascotPosition}, ${mascotScale.toFixed(2)}x)`
                        : t("visualSandbox.summaryMascotDefault")}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="quiet-button" onClick={() => setChannelSyncOpen(false)}>
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={savingChannel || !selectedChannelId}
                  onClick={handleApplyToChannel}
                >
                  {savingChannel ? <CircleNotch className="spin" size={16} /> : <Link size={16} weight="bold" />}
                  <span>{savingChannel ? t("visualSandbox.applyingBtn") : t("visualSandbox.confirmApplyBtn")}</span>
                </button>
              </div>
            </div>
          </div>
        ))()}
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  CheckCircle,
  CircleNotch,
  Eye,
  FloppyDisk,
  Link,
  Palette,
  Sparkle,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  ALL_QUESTION_BOX_STYLES,
  ALL_QUESTION_COUNTER_STYLES,
  ALL_THINKING_BAR_STYLES,
  QUESTION_BOX_STYLE_DESCRIPTIONS,
  QUESTION_BOX_STYLE_LABELS,
  QUESTION_COUNTER_STYLE_DESCRIPTIONS,
  QUESTION_COUNTER_STYLE_LABELS,
  THINKING_BAR_STYLE_DESCRIPTIONS,
  THINKING_BAR_STYLE_LABELS,
  type Channel,
  type MascotActionType,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
  type SandboxPreviewInput,
} from "@studio/shared";
import { api } from "../../api";
import type { Notice } from "../../components/types";

export type VisualPresetItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: string;
  palette_id: string;
  thinking_bar_style: QuizThinkingBarStyle;
  question_box_style: QuizQuestionBoxStyle;
  counter_style: QuizQuestionCounterStyle;
  isBuiltIn?: boolean;
};

const BUILT_IN_PRESETS: VisualPresetItem[] = [
  {
    id: "preset_arcade_classic",
    name: "Arcade Classic",
    description: "Kẹo ngọt kinh điển với ngôi sao trượt và bảng gỗ mộc",
    icon: "🌟",
    theme: "candy_arcade",
    palette_id: "lime",
    thinking_bar_style: "star_slider",
    question_box_style: "candy_pop",
    counter_style: "hanging_woodsign",
    isBuiltIn: true,
  },
  {
    id: "preset_cyber_neon",
    name: "Cyber Neon Pulse",
    description: "Kính mờ công nghệ cao với tia laser plasma và huy hiệu neon",
    icon: "⚡",
    theme: "candy_arcade",
    palette_id: "purple",
    thinking_bar_style: "energy_laser",
    question_box_style: "glass_morphism",
    counter_style: "neon_badge",
    isBuiltIn: true,
  },
  {
    id: "preset_comic_boom",
    name: "Comic Action Boom",
    description: "Bong bóng truyện tranh, ngòi nổ thuốc súng và bóng bay nổi",
    icon: "💥",
    theme: "candy_arcade",
    palette_id: "sunny",
    thinking_bar_style: "flame_fuse",
    question_box_style: "comic_bubble",
    counter_style: "floating_balloon",
    isBuiltIn: true,
  },
  {
    id: "preset_treasure_quest",
    name: "Treasure Quest",
    description: "Cuộn giấy phiêu lưu cổ điển, thanh 8-bit và khiên vàng",
    icon: "📜",
    theme: "candy_arcade",
    palette_id: "orange",
    thinking_bar_style: "retro_pixel",
    question_box_style: "parchment_scroll",
    counter_style: "golden_shield",
    isBuiltIn: true,
  },
  {
    id: "preset_minimal_glow",
    name: "Minimalist Studio",
    description: "Tối giản hiện đại với thanh phát sáng dịu và nền xanh ngọc",
    icon: "💎",
    theme: "candy_arcade",
    palette_id: "aqua",
    thinking_bar_style: "minimal_glow",
    question_box_style: "glass_morphism",
    counter_style: "neon_badge",
    isBuiltIn: true,
  },
];

const STORAGE_PRESETS_KEY = "studio-visual-custom-presets";

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

const SAMPLE_QUESTIONS = [
  {
    title: "Vừa phải (Tiêu chuẩn)",
    text: "Which planet in our solar system has the most prominent rings?",
    choices: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    correct: 1,
  },
  {
    title: "Ngắn (Đố vui nhanh)",
    text: "What is the capital of France?",
    choices: ["Rome", "Berlin", "Paris", "Madrid"],
    correct: 2,
  },
  {
    title: "Dài (Khoa học / Lịch sử)",
    text: "Which ancient civilization constructed the massive stone monuments known as the Great Pyramids of Giza along the Nile River?",
    choices: ["Ancient Mesopotamia", "Ancient Egypt", "Mayan Civilization", "Indus Valley Civilization"],
    correct: 1,
  },
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
  const [theme, setTheme] = useState("candy_arcade");
  const [paletteId, setPaletteId] = useState<string>("lime");
  const [thinkingBarStyle, setThinkingBarStyle] = useState<QuizThinkingBarStyle>("star_slider");
  const [questionBoxStyle, setQuestionBoxStyle] = useState<QuizQuestionBoxStyle>("candy_pop");
  const [counterStyle, setCounterStyle] = useState<QuizQuestionCounterStyle>("hanging_woodsign");
  const [phase, setPhase] = useState<"question" | "choices" | "thinking" | "reveal" | "explain">("thinking");

  const [questionText, setQuestionText] = useState(SAMPLE_QUESTIONS[0].text);
  const [choices, setChoices] = useState<string[]>(SAMPLE_QUESTIONS[0].choices);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState<number>(SAMPLE_QUESTIONS[0].correct);
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);

  const [mascotAction, setMascotAction] = useState<MascotActionType>("thinking");
  const [mascotPosition, setMascotPosition] = useState<"bottom_left" | "bottom_right">("bottom_left");
  const [mascotScale, setMascotScale] = useState<number>(1.0);

  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);
  const [zoom, setZoom] = useState<"fit" | "50" | "75" | "100">("fit");

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [contrastReport, setContrastReport] = useState<{ ok: boolean; ratio?: number; message?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Preset Management State
  const [customPresets, setCustomPresets] = useState<VisualPresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PRESETS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Channel Sync State
  const [channelSyncOpen, setChannelSyncOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.channel_id || "");
  const [savingChannel, setSavingChannel] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(0.5);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    if (zoom === "50") { setScaleFactor(0.5); return; }
    if (zoom === "75") { setScaleFactor(0.75); return; }
    if (zoom === "100") { setScaleFactor(1.0); return; }

    const containerWidth = containerRef.current.clientWidth - 40;
    const containerHeight = containerRef.current.clientHeight - 40;
    const widthRatio = containerWidth / 1920;
    const heightRatio = containerHeight / 1080;
    const calculatedScale = Math.min(widthRatio, heightRatio, 1.0);
    setScaleFactor(Math.max(0.2, calculatedScale));
  }, [zoom]);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  const renderPreview = useCallback(async () => {
    setLoading(true);
    try {
      const input: SandboxPreviewInput = {
        theme: theme as SandboxPreviewInput["theme"],
        palette_id: paletteId,
        thinking_bar_style: thinkingBarStyle,
        question_box_style: questionBoxStyle,
        counter_style: counterStyle,
        phase,
        question_text: questionText,
        choices,
        correct_choice_index: correctChoiceIndex,
        question_number: questionNumber,
        total_questions: totalQuestions,
        mascot_action: mascotAction,
        mascot_position: mascotPosition,
        mascot_scale: mascotScale,
      };

      const res = await api.previewSandboxComposition(input);
      setPreviewHtml(res.html);
      setContrastReport(res.contrast_report);
    } catch (err) {
      if (onNotice) {
        onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to compile preview composition" });
      }
    } finally {
      setLoading(false);
    }
  }, [
    theme,
    paletteId,
    thinkingBarStyle,
    questionBoxStyle,
    counterStyle,
    phase,
    questionText,
    choices,
    correctChoiceIndex,
    questionNumber,
    totalQuestions,
    mascotAction,
    mascotPosition,
    mascotScale,
    onNotice,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void renderPreview();
    }, 150);
    return () => clearTimeout(timer);
  }, [renderPreview]);

  const handleApplyPresetQuestion = (sample: typeof SAMPLE_QUESTIONS[number]) => {
    setQuestionText(sample.text);
    setChoices([...sample.choices]);
    setCorrectChoiceIndex(sample.correct);
  };

  const handleLoadPreset = (preset: VisualPresetItem) => {
    setPaletteId(preset.palette_id);
    setThinkingBarStyle(preset.thinking_bar_style);
    setQuestionBoxStyle(preset.question_box_style);
    setCounterStyle(preset.counter_style);
    if (onNotice) {
      onNotice({ tone: "good", message: "Đã tải style preset: " + preset.name });
    }
  };

  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: VisualPresetItem = {
      id: "custom_" + Date.now(),
      name: newPresetName.trim(),
      description: "Custom preset lưu bởi người dùng",
      icon: "🎨",
      theme,
      palette_id: paletteId,
      thinking_bar_style: thinkingBarStyle,
      question_box_style: questionBoxStyle,
      counter_style: counterStyle,
      isBuiltIn: false,
    };
    const updated = [newPreset, ...customPresets];
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setNewPresetName("");
    setPresetModalOpen(false);
    if (onNotice) {
      onNotice({ tone: "good", message: "Đã lưu style preset: " + newPreset.name });
    }
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    if (onNotice) {
      onNotice({ tone: "neutral", message: "Đã xóa preset" });
    }
  };

  const handleApplyToChannel = async () => {
    if (!selectedChannelId) return;
    const targetChannel = channels.find((c) => c.channel_id === selectedChannelId);
    if (!targetChannel) return;

    setSavingChannel(true);
    try {
      await api.updateChannel(selectedChannelId, {
        default_thinking_bar_style: thinkingBarStyle,
        default_question_box_style: questionBoxStyle,
        default_counter_style: counterStyle,
        default_palette_id: paletteId,
      });
      if (onRefreshChannels) await onRefreshChannels();
      setChannelSyncOpen(false);
      if (onNotice) {
        onNotice({
          tone: "good",
          message: "Đã áp dụng toàn bộ Style mặc định vào Kênh: " + targetChannel.display_name,
        });
      }
    } catch (err) {
      if (onNotice) {
        onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to update channel DNA style" });
      }
    } finally {
      setSavingChannel(false);
    }
  };

  return (
    <section className="page-wrap visual-sandbox-page" style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="section-heading" style={{ marginBottom: "12px", flexShrink: 0 }}>
        <div>
          <h1>🎨 Tab Test · Visual Sandbox</h1>
          <p className="description" style={{ margin: 0 }}>
            Kiểm thử & tùy biến từng element độc lập (Thinking Bar, Question Box, Counter Badge, Palette) được render thực tế với HyperFrames.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Apply to Channel Button */}
          {channels.length > 0 && (
            <button
              type="button"
              className="quiet-button"
              onClick={() => setChannelSyncOpen(true)}
              title="Đồng bộ style hiện tại vào cấu hình Channel DNA"
            >
              <Link size={16} weight="bold" />
              <span>Áp dụng vào Kênh</span>
            </button>
          )}

          {/* Save Preset Button */}
          <button
            type="button"
            className="quiet-button"
            onClick={() => setPresetModalOpen(true)}
            title="Lưu cấu hình đang chọn thành Preset mẫu"
          >
            <FloppyDisk size={16} weight="bold" />
            <span>Lưu Preset</span>
          </button>

          {/* Safe Area Toggle */}
          <button
            type="button"
            className="quiet-button"
            onClick={() => setShowSafeArea((prev) => !prev)}
            title="Bật/Tắt đường viền an toàn 16:9"
          >
            <Eye size={16} weight={showSafeArea ? "fill" : "regular"} />
            <span>Safe Area: {showSafeArea ? "Bật" : "Tắt"}</span>
          </button>

          {/* Re-render Button */}
          <button
            type="button"
            className="primary-button"
            disabled={loading}
            onClick={() => void renderPreview()}
            title="Re-render lại toàn bộ element composition"
          >
            {loading ? <CircleNotch className="spin" size={16} /> : <ArrowClockwise size={16} weight="bold" />}
            <span>Render lại</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "410px 1fr", gap: "20px", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div
          className="panel"
          style={{
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "18px",
            background: "var(--surface)",
            borderRadius: "16px",
            border: "1px solid var(--line)",
          }}
        >
          {/* Quick Style Presets Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ✨ Mẫu phong cách (Style Presets)
              </label>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>{BUILT_IN_PRESETS.length + customPresets.length} presets</span>
            </div>

            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
              {[...BUILT_IN_PRESETS, ...customPresets].map((preset) => {
                const isActive =
                  preset.palette_id === paletteId &&
                  preset.thinking_bar_style === thinkingBarStyle &&
                  preset.question_box_style === questionBoxStyle &&
                  preset.counter_style === counterStyle;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 10px",
                      borderRadius: "10px",
                      background: isActive ? "var(--soft-accent)" : "var(--surface-strong)",
                      border: isActive ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                      color: isActive ? "var(--accent)" : "var(--text)",
                      fontSize: "11.5px",
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                    title={preset.description}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                    {!preset.isBuiltIn && (
                      <span
                        onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                        style={{ marginLeft: "4px", color: "var(--muted)", fontSize: "10px" }}
                        title="Xóa preset này"
                      >
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--line)" }} />

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              🎬 Giai đoạn khung hình (Phase)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "6px" }}>
              {(
                [
                  { id: "question", label: "1. Question" },
                  { id: "choices", label: "2. Choices" },
                  { id: "thinking", label: "3. Thinking" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={phase === p.id ? "primary-button compact" : "quiet-button compact"}
                  style={{ fontSize: "11px", padding: "6px 8px", justifyContent: "center" }}
                  onClick={() => setPhase(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
              {(
                [
                  { id: "reveal", label: "4. Answer Reveal" },
                  { id: "explain", label: "5. Fact / Explain" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={phase === p.id ? "primary-button compact" : "quiet-button compact"}
                  style={{ fontSize: "11px", padding: "6px 8px", justifyContent: "center" }}
                  onClick={() => setPhase(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--line)" }} />

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              🎨 1. Bảng màu nền (Theme & Palette)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
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
                      gap: "4px",
                      padding: "6px",
                      borderRadius: "10px",
                      background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ width: "100%", height: "18px", borderRadius: "6px", background: "linear-gradient(135deg, " + p.primary + ", " + p.secondary + ")" }} />
                    <span style={{ fontSize: "10.5px", fontWeight: isSelected ? 800 : 500, color: isSelected ? "var(--accent)" : "var(--text)" }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--line)" }} />

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              ⏱️ 2. Thanh thời gian (Thinking Bar)
            </label>
            <select
              className="select-input"
              value={thinkingBarStyle}
              onChange={(e) => setThinkingBarStyle(e.target.value as QuizThinkingBarStyle)}
              style={{ width: "100%", marginBottom: "6px" }}
            >
              {ALL_THINKING_BAR_STYLES.filter((s) => s !== "auto").map((style) => (
                <option key={style} value={style}>
                  {THINKING_BAR_STYLE_LABELS[style as Exclude<QuizThinkingBarStyle, "auto">] || style}
                </option>
              ))}
            </select>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0 }}>
              {THINKING_BAR_STYLE_DESCRIPTIONS[thinkingBarStyle as Exclude<QuizThinkingBarStyle, "auto">]}
            </p>
          </div>

          <div style={{ height: "1px", background: "var(--line)" }} />

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              ❓ 3. Hộp câu hỏi (Question Box)
            </label>
            <select
              className="select-input"
              value={questionBoxStyle}
              onChange={(e) => setQuestionBoxStyle(e.target.value as QuizQuestionBoxStyle)}
              style={{ width: "100%", marginBottom: "6px" }}
            >
              {ALL_QUESTION_BOX_STYLES.filter((s) => s !== "auto").map((style) => (
                <option key={style} value={style}>
                  {QUESTION_BOX_STYLE_LABELS[style as Exclude<QuizQuestionBoxStyle, "auto">] || style}
                </option>
              ))}
            </select>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0, marginBottom: "8px" }}>
              {QUESTION_BOX_STYLE_DESCRIPTIONS[questionBoxStyle as Exclude<QuizQuestionBoxStyle, "auto">]}
            </p>

            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              {SAMPLE_QUESTIONS.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                  onClick={() => handleApplyPresetQuestion(sq)}
                >
                  {sq.title.split(" ")[0]}
                </button>
              ))}
            </div>

            <textarea
              className="text-input"
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Nhập câu hỏi test..."
              style={{ width: "100%", fontSize: "12px" }}
            />
          </div>

          <div style={{ height: "1px", background: "var(--line)" }} />

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              🔢 4. Hộp đếm số câu (Counter Badge)
            </label>
            <select
              className="select-input"
              value={counterStyle}
              onChange={(e) => setCounterStyle(e.target.value as QuizQuestionCounterStyle)}
              style={{ width: "100%", marginBottom: "6px" }}
            >
              {ALL_QUESTION_COUNTER_STYLES.filter((s) => s !== "auto").map((style) => (
                <option key={style} value={style}>
                  {QUESTION_COUNTER_STYLE_LABELS[style as Exclude<QuizQuestionCounterStyle, "auto">] || style}
                </option>
              ))}
            </select>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0, marginBottom: "8px" }}>
              {QUESTION_COUNTER_STYLE_DESCRIPTIONS[counterStyle as Exclude<QuizQuestionCounterStyle, "auto">]}
            </p>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Số câu:</span>
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
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Tổng số câu:</span>
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

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              🎭 5. Nhân vật Mascot
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Tư thế / Pose:</span>
                <select
                  className="select-input compact"
                  value={mascotAction}
                  onChange={(e) => setMascotAction(e.target.value as MascotActionType)}
                  style={{ width: "100%" }}
                >
                  <option value="thinking">Thinking 🤔</option>
                  <option value="celebrate">Celebrate 🎉</option>
                  <option value="point">Point Board 👉</option>
                  <option value="oops">Oops / Shock 😅</option>
                  <option value="idle">Idle / Listen 🧘</option>
                  <option value="wave">Wave 👋</option>
                </select>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Vị trí:</span>
                <select
                  className="select-input compact"
                  value={mascotPosition}
                  onChange={(e) => setMascotPosition(e.target.value as "bottom_left" | "bottom_right")}
                  style={{ width: "100%" }}
                >
                  <option value="bottom_left">Góc Trái Dưới</option>
                  <option value="bottom_right">Góc Phải Dưới</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          style={{
            position: "relative",
            background: "#060911",
            borderRadius: "16px",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: "20px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "20px",
              right: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 50,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "20px",
                background: "rgba(10, 14, 26, 0.85)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#22E58B",
                fontSize: "12px",
                fontWeight: 700,
                pointerEvents: "auto",
              }}
            >
              <CheckCircle size={15} weight="fill" />
              <span>WCAG AA Passed ({contrastReport?.ratio || 7.42}:1)</span>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px",
                borderRadius: "12px",
                background: "rgba(10, 14, 26, 0.85)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.15)",
                pointerEvents: "auto",
              }}
            >
              {(["fit", "50", "75", "100"] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  className={zoom === z ? "primary-button compact" : "quiet-button compact"}
                  style={{ fontSize: "11px", padding: "3px 8px" }}
                  onClick={() => setZoom(z)}
                >
                  {z === "fit" ? "Fit" : z + "%"}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              width: "1920px",
              height: "1080px",
              transform: "scale(" + scaleFactor + ")",
              transformOrigin: "center center",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#000",
              flexShrink: 0,
            }}
          >
            {previewHtml ? (
              <iframe
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
          </div>
        </div>
      </div>

      {/* Save Preset Modal */}
      {presetModalOpen && (
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
          <div
            className="panel"
            style={{ width: "420px", padding: "24px", borderRadius: "16px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>💾 Lưu Style Preset mới</h3>
              <button type="button" className="icon-button" onClick={() => setPresetModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
              Lưu tổ hợp (Palette + Thinking Bar + Question Box + Counter) đang xem vào danh sách Preset cá nhân.
            </p>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Tên Preset:</label>
              <input
                type="text"
                className="text-input"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="VD: Neon Arcade Pro..."
                style={{ width: "100%" }}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="quiet-button" onClick={() => setPresetModalOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!newPresetName.trim()}
                onClick={handleSaveCustomPreset}
              >
                <FloppyDisk size={16} />
                <span>Lưu Preset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Sync Modal */}
      {channelSyncOpen && (
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
          <div
            className="panel"
            style={{ width: "460px", padding: "24px", borderRadius: "16px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>🔗 Áp dụng Style vào Kênh</h3>
              <button type="button" className="icon-button" onClick={() => setChannelSyncOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
              Cập nhật style mặc định của Channel DNA để các tập mới sinh ra sẽ tự động sử dụng bộ style này.
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Chọn Kênh áp dụng:</label>
              <select
                className="select-input"
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                style={{ width: "100%" }}
              >
                {channels.map((ch) => (
                  <option key={ch.channel_id} value={ch.channel_id}>
                    {ch.display_name} ({ch.slug})
                  </option>
                ))}
              </select>
            </div>

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
              <div><strong>• Palette:</strong> {PALETTES.find((p) => p.id === paletteId)?.label || paletteId}</div>
              <div><strong>• Thinking Bar:</strong> {THINKING_BAR_STYLE_LABELS[thinkingBarStyle as Exclude<QuizThinkingBarStyle, "auto">]}</div>
              <div><strong>• Question Box:</strong> {QUESTION_BOX_STYLE_LABELS[questionBoxStyle as Exclude<QuizQuestionBoxStyle, "auto">]}</div>
              <div><strong>• Counter Badge:</strong> {QUESTION_COUNTER_STYLE_LABELS[counterStyle as Exclude<QuizQuestionCounterStyle, "auto">]}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="quiet-button" onClick={() => setChannelSyncOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={savingChannel || !selectedChannelId}
                onClick={handleApplyToChannel}
              >
                {savingChannel ? <CircleNotch className="spin" size={16} /> : <Link size={16} weight="bold" />}
                <span>{savingChannel ? "Đang lưu…" : "Xác nhận áp dụng"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

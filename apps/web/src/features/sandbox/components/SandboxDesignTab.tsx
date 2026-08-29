import { ListNumbers, SquareSplitHorizontal } from "@phosphor-icons/react";
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
  type QuizAnswerCardStyle,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizPreviewLayoutId,
  type QuizThinkingBarStyle,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { QUIZ_LAYOUT_UI_DEFINITIONS } from "../../quizLayouts/quizLayoutUiCatalog";
import { PALETTES } from "../constants";

export interface SandboxDesignTabProps {
  layoutId: QuizPreviewLayoutId;
  setLayoutId: (layout: QuizPreviewLayoutId) => void;
  paletteId: string;
  setPaletteId: (id: string) => void;
  thinkingBarStyle: QuizThinkingBarStyle;
  setThinkingBarStyle: (style: QuizThinkingBarStyle) => void;
  questionBoxStyle: QuizQuestionBoxStyle;
  setQuestionBoxStyle: (style: QuizQuestionBoxStyle) => void;
  answerCardStyle: QuizAnswerCardStyle;
  setAnswerCardStyle: (style: QuizAnswerCardStyle) => void;
  counterStyle: QuizQuestionCounterStyle;
  setCounterStyle: (style: QuizQuestionCounterStyle) => void;
}

export function SandboxDesignTab({
  layoutId,
  setLayoutId,
  paletteId,
  setPaletteId,
  thinkingBarStyle,
  setThinkingBarStyle,
  questionBoxStyle,
  setQuestionBoxStyle,
  answerCardStyle,
  setAnswerCardStyle,
  counterStyle,
  setCounterStyle,
}: SandboxDesignTabProps) {
  const { t } = useTranslation();

  return (
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
          {QUIZ_LAYOUT_UI_DEFINITIONS.map((layout) => {
            const active = layoutId === layout.id;
            return (
              <button
                key={layout.id}
                type="button"
                onClick={() => setLayoutId(layout.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  background: active ? "var(--soft-accent)" : "var(--surface-strong)",
                  border: active ? "2px solid var(--accent)" : "1px solid var(--line)",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--accent)" : "var(--text)",
                  textAlign: "left",
                }}
              >
                {layout.icon === "split" ? <SquareSplitHorizontal size={18} /> : <ListNumbers size={18} />}
                <span style={{ minWidth: 0 }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                    {t(layout.sandboxLabelKey)}
                  </span>
                  <small style={{ color: "var(--muted)", fontSize: "9.5px", display: "block" }}>{t(layout.sandboxDescriptionKey)}</small>
                </span>
              </button>
            );
          })}
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
                    background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`,
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
  );
}

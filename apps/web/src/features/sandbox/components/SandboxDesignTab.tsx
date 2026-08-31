import {
  ALL_ANSWER_CARD_STYLES,
  ALL_BACKGROUND_STYLES,
  ALL_QUESTION_BOX_STYLES,
  ALL_QUESTION_COUNTER_STYLES,
  ALL_THINKING_BAR_STYLES,
  ANSWER_CARD_STYLE_LABELS,
  BACKGROUND_STYLE_LABELS,
  QUESTION_BOX_STYLE_LABELS,
  QUESTION_COUNTER_STYLE_LABELS,
  THINKING_BAR_STYLE_LABELS,
  type QuizAnswerCardStyle,
  type QuizBackgroundStyle,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizPreviewLayoutId,
  type QuizThinkingBarStyle,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { SandboxLayoutSelector } from "./design/SandboxLayoutSelector";
import { SandboxPaletteSelector } from "./design/SandboxPaletteSelector";
import { SandboxStyleOptionSection } from "./design/SandboxStyleOptionSection";

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
  backgroundStyle: QuizBackgroundStyle;
  setBackgroundStyle: (style: QuizBackgroundStyle) => void;
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
  backgroundStyle,
  setBackgroundStyle,
}: SandboxDesignTabProps) {
  const { t } = useTranslation();

  const thinkingBarOptions = ALL_THINKING_BAR_STYLES.filter((s) => s !== "auto").map((s) => ({
    id: s,
    label: THINKING_BAR_STYLE_LABELS[s] || s,
  }));

  const questionBoxOptions = ALL_QUESTION_BOX_STYLES.filter((s) => s !== "auto").map((s) => ({
    id: s,
    label: QUESTION_BOX_STYLE_LABELS[s] || s,
  }));

  const answerCardOptions = ALL_ANSWER_CARD_STYLES.filter((s) => s !== "auto").map((s) => ({
    id: s,
    label: ANSWER_CARD_STYLE_LABELS[s] || s,
  }));

  const counterOptions = ALL_QUESTION_COUNTER_STYLES.filter((s) => s !== "auto").map((s) => ({
    id: s,
    label: QUESTION_COUNTER_STYLE_LABELS[s] || s,
  }));

  const backgroundOptions = ALL_BACKGROUND_STYLES.filter((s) => s !== "auto").map((s) => ({
    id: s,
    label: BACKGROUND_STYLE_LABELS[s] || s,
  }));

  return (
    <>
      {/* 1. Layout Mode Selector */}
      <SandboxLayoutSelector layoutId={layoutId} setLayoutId={setLayoutId} />

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* 2. Color Palette */}
      <SandboxPaletteSelector paletteId={paletteId} setPaletteId={setPaletteId} />

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* 3. Thinking Bar Selector */}
      <SandboxStyleOptionSection
        sectionTitle={t("visualSandbox.thinkingBarSection")}
        activeLabel={THINKING_BAR_STYLE_LABELS[thinkingBarStyle as Exclude<QuizThinkingBarStyle, "auto">]}
        columns={3}
        options={thinkingBarOptions}
        selectedValue={thinkingBarStyle}
        onSelect={setThinkingBarStyle}
      />

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* 4. Question Box Selector */}
      <SandboxStyleOptionSection
        sectionTitle={t("visualSandbox.questionBoxSection")}
        activeLabel={QUESTION_BOX_STYLE_LABELS[questionBoxStyle as Exclude<QuizQuestionBoxStyle, "auto">]}
        columns={2}
        options={questionBoxOptions}
        selectedValue={questionBoxStyle}
        onSelect={setQuestionBoxStyle}
      />

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* 5. Answer Card Selector */}
      <SandboxStyleOptionSection
        sectionTitle={t("visualSandbox.answerCardSection")}
        activeLabel={ANSWER_CARD_STYLE_LABELS[answerCardStyle as Exclude<QuizAnswerCardStyle, "auto">]}
        columns={2}
        options={answerCardOptions}
        selectedValue={answerCardStyle}
        onSelect={setAnswerCardStyle}
      />

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* 6. Counter Badge Selector */}
      <SandboxStyleOptionSection
        sectionTitle={t("visualSandbox.counterBadgeSection")}
        activeLabel={QUESTION_COUNTER_STYLE_LABELS[counterStyle as Exclude<QuizQuestionCounterStyle, "auto">]}
        columns={2}
        options={counterOptions}
        selectedValue={counterStyle}
        onSelect={setCounterStyle}
      />

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* 7. Background Variant Selector */}
      <SandboxStyleOptionSection
        sectionTitle={t("visualSandbox.backgroundSection")}
        activeLabel={BACKGROUND_STYLE_LABELS[backgroundStyle as Exclude<QuizBackgroundStyle, "auto">]}
        columns={2}
        options={backgroundOptions}
        selectedValue={backgroundStyle}
        onSelect={setBackgroundStyle}
      />
    </>
  );
}

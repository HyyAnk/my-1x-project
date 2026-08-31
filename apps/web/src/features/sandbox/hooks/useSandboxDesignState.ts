import { useState } from "react";
import type {
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  QuizPreviewLayoutId,
  SandboxPreviewInput,
} from "@studio/shared";

export function useSandboxDesignState() {
  const [theme, setTheme] = useState<SandboxPreviewInput["theme"]>("candy_arcade");
  const [paletteId, setPaletteId] = useState("lime");
  const [layoutId, setLayoutId] = useState<QuizPreviewLayoutId>("media_left_choices_right");
  const [thinkingBarStyle, setThinkingBarStyle] = useState<QuizThinkingBarStyle>("star_slider");
  const [questionBoxStyle, setQuestionBoxStyle] = useState<QuizQuestionBoxStyle>("candy_pop");
  const [answerCardStyle, setAnswerCardStyle] = useState<QuizAnswerCardStyle>("glossy_arcade");
  const [counterStyle, setCounterStyle] = useState<QuizQuestionCounterStyle>("hanging_woodsign");
  const [backgroundStyle, setBackgroundStyle] = useState<QuizBackgroundStyle>("candy_rays");

  return {
    theme,
    setTheme,
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
    backgroundStyle,
    setBackgroundStyle,
  };
}

export type SandboxDesignState = ReturnType<typeof useSandboxDesignState>;

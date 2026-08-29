import type { QuizVisualTheme } from "@studio/shared";
import type {
  ResolvedAnswerCardStyle,
  ResolvedCounterStyle,
  ResolvedQuestionBoxStyle,
  ResolvedThinkingBarStyle,
} from "../utils/quizStyleResolution";

export type EpisodeStyleOverride = {
  theme?: QuizVisualTheme;
  paletteId?: string;
  thinkingBarStyle?: ResolvedThinkingBarStyle;
  questionBoxStyle?: ResolvedQuestionBoxStyle;
  answerCardStyle?: ResolvedAnswerCardStyle;
  counterStyle?: ResolvedCounterStyle;
  totalQuestions?: number;
  channelBrandName?: string;
};

export type EpisodePreviewCandidate = {
  override: EpisodeStyleOverride;
  label: string;
};

export type ResolvedEpisodePreviewStyle = Required<Omit<EpisodeStyleOverride, "channelBrandName">> & {
  channelBrandName: string;
};

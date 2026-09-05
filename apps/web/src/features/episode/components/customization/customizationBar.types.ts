import type {
  Channel,
  DirectorPlan,
  Episode,
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizImageStyle,
  QuizPaletteId,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  QuizV2,
  Task,
  VisualPresetItem,
  ThumbnailRatioMode,
  MascotRenderAspectRatio,
} from "@studio/shared";
import type { Notice } from "../../../../components/types";

export type EpisodeQuizCustomizationBarProps = {
  channel: Channel;
  episode: Episode;
  quiz: QuizV2 | null;
  directorPlan: DirectorPlan | null;
  activeEpisodeTask: Task | null;
  busy: string | null;
  questionCountDraft: number;
  setQuestionCountDraft: (count: number) => void;
  onSaveQuestionCount: (count: number) => void;
  onSaveVisualStyle: (style: QuizImageStyle | "mixed") => void;
  onSaveThinkingBarStyle: (style: QuizThinkingBarStyle) => void;
  onSaveQuestionBoxStyle: (style: QuizQuestionBoxStyle) => void;
  onSaveAnswerCardStyle: (style: QuizAnswerCardStyle) => void;
  onSaveCounterStyle: (style: QuizQuestionCounterStyle) => void;
  onSaveBackgroundStyle: (style: QuizBackgroundStyle) => void;
  onSavePaletteId: (palette: QuizPaletteId) => void;
  onSaveAspectRatio?: (ratio: MascotRenderAspectRatio) => void;
  onSaveThumbnailRatio?: (ratio: ThumbnailRatioMode) => void;
  onApplyStylePreset: (preset: VisualPresetItem) => void;
  setEpisode?: (episode: Episode | null) => void;
  onNotice?: (notice: NonNullable<Notice>) => void;
};

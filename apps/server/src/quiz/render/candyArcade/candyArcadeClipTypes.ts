import type {
  ChannelMascotConfig,
  DirectorArchetype,
  MascotProfile,
  MascotRenderAspectRatio,
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizLayoutResolutionResult,
  QuizQuestion,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  ResolvedQuizLayoutId,
} from "@studio/shared";
import type { QuizTemplateScene } from "../../visual/types.js";
import type { ProductionMascotTimelineEvent } from "../productionMascotRenderer.js";
import type { Copy } from "./quizCopy.js";

export type QuestionClipInput = {
  start: number;
  questionNarrationStart?: number;
  choicesStart: number;
  thinkingStart: number;
  timerHideAt?: number;
  revealStart: number;
  rewardStart: number;
  end: number;
  question: QuizQuestion;
  archetype: DirectorArchetype;
  layoutResolution: Extract<QuizLayoutResolutionResult<ResolvedQuizLayoutId>, { ok: true }>;
  questionIndex: number;
  count: number;
  visual: QuizTemplateScene;
  copy: Copy;
  assets: Record<string, string>;
  isFinal: boolean;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  mascotEvents?: readonly ProductionMascotTimelineEvent[];
  thinkingBarStyle?: QuizThinkingBarStyle | null;
  questionBoxStyle?: QuizQuestionBoxStyle | null;
  answerCardStyle?: QuizAnswerCardStyle | null;
  counterStyle?: QuizQuestionCounterStyle | null;
  backgroundStyle?: QuizBackgroundStyle | null;
  aspectRatio?: MascotRenderAspectRatio;
  channelBrandName?: string | null;
  styleCatalogRevision?: string;
};

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
  MascotStateMediaMode,
} from "@studio/shared";
import type { QuizTemplateScene } from "../../visual/types.js";
import type { ProductionMascotTimelineEvent } from "../productionMascotRenderer.js";
import type { Copy } from "./quizCopy.js";

export type CandyArcadeProductKind = "episode" | "quiz_short";

export type QuestionClipInput = {
  /** Quiz Shorts swap the counter for the progress strip, the thinking bar for the ring timer and hide the mascot until reveal. */
  productKind?: CandyArcadeProductKind;
  countdownSeconds?: number;
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
  mediaMode?: MascotStateMediaMode;
};

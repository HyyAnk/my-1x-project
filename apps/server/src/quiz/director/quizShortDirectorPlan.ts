import {
  QUIZ_GAMEPLAY_POLICY_VERSION,
  type DirectorBeat,
  type DirectorPlan,
  type QuizPortraitLayoutId,
  type QuizShortConfig,
  type QuizShortLayoutPair,
  type QuizV2,
} from "@studio/shared";
import { createDefaultDirectorPlan } from "./parseDirectorPlan.js";
import { assertDirectorPlanValid } from "./validateDirectorPlan.js";
import { applyGameplayDirectorPolicy } from "./gameplayDirectorPolicy.js";
import {
  portraitBeatArchetype,
  portraitLayoutAssetIntents,
  resolvePortraitBeatLayout,
  resolvePortraitGameplayId,
} from "./quizShortBeatLayout.js";

export const QUIZ_SHORT_PACING_PROFILE = "short" as const;

export const QUIZ_SHORT_TEXT_LAYOUT_PAIR: QuizShortLayoutPair = { primary: "short_stack_list", secondary: "short_verdict_yes_no" };
export const QUIZ_SHORT_TEXT_ONLY_LAYOUT_PAIR: QuizShortLayoutPair = { primary: "short_stack_list", secondary: "short_stack_list" };
export const QUIZ_SHORT_IMAGE_LAYOUT_PAIR: QuizShortLayoutPair = { primary: "short_media_top_choices", secondary: "short_versus_two" };

function isImageTopic(quiz: QuizV2): boolean {
  return quiz.questions.length > 0 && quiz.questions.every((question) => question.visual_opportunity.trim().length > 0);
}

/**
 * The configured pair wins. Without one, image topics (every question carries a visual
 * subject) alternate the two media layouts; text topics alternate the stack list with the
 * verdict layout only when the quiz actually contains yes/no questions.
 */
export function resolveQuizShortLayoutPair(quiz: QuizV2, config?: Pick<QuizShortConfig, "layout_pair">): QuizShortLayoutPair {
  if (config?.layout_pair) return config.layout_pair;
  if (isImageTopic(quiz)) return QUIZ_SHORT_IMAGE_LAYOUT_PAIR;
  const hasYesNo = quiz.questions.some((question) => question.format === "yes_no");
  return hasYesNo ? QUIZ_SHORT_TEXT_LAYOUT_PAIR : QUIZ_SHORT_TEXT_ONLY_LAYOUT_PAIR;
}

/** Beats alternate primary, secondary, primary ...; question one is always on the primary layout. */
export function assignedPortraitLayout(pair: QuizShortLayoutPair, beatIndex: number): QuizPortraitLayoutId {
  return beatIndex % 2 === 0 ? pair.primary : pair.secondary;
}

function buildQuizShortBeat(quiz: QuizV2, beat: DirectorBeat, pair: QuizShortLayoutPair, beatIndex: number): DirectorBeat {
  const question = quiz.questions.find((item) => item.id === beat.question_id);
  if (!question) throw new Error(`Unknown director question ${beat.question_id}`);
  const layoutId = resolvePortraitBeatLayout(question, pair, assignedPortraitLayout(pair, beatIndex));
  return applyGameplayDirectorPolicy(
    quiz,
    {
      ...beat,
      archetype: portraitBeatArchetype(question, layoutId),
      layout_id: layoutId,
      asset_intents: portraitLayoutAssetIntents(layoutId),
      gameplay_id: resolvePortraitGameplayId(question, layoutId),
    },
    QUIZ_SHORT_PACING_PROFILE,
  );
}

export function createQuizShortDirectorPlan(quiz: QuizV2, config: QuizShortConfig): DirectorPlan {
  const pair = resolveQuizShortLayoutPair(quiz, config);
  // The landscape default always resolves; every portrait field is replaced per beat below.
  const base = createDefaultDirectorPlan(quiz);
  return assertDirectorPlanValid(
    quiz,
    {
      ...base,
      gameplay_policy_version: QUIZ_GAMEPLAY_POLICY_VERSION,
      beats: base.beats.map((beat, index) => buildQuizShortBeat(quiz, beat, pair, index)),
    },
    { pacingProfile: QUIZ_SHORT_PACING_PROFILE, aspectRatio: "9:16" },
  );
}

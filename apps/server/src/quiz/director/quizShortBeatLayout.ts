import {
  QUIZ_PORTRAIT_LAYOUT_IDS,
  getQuizLayoutCapability,
  resolveQuizLayout,
  type DirectorArchetype,
  type DirectorBeat,
  type QuizGameplayArchetypeId,
  type QuizLayoutMediaKind,
  type QuizPortraitLayoutId,
  type QuizQuestion,
  type QuizShortLayoutPair,
} from "@studio/shared";

const PORTRAIT_LAYOUT_ASSET_INTENTS: Record<QuizPortraitLayoutId, DirectorBeat["asset_intents"]> = {
  short_stack_list: [],
  short_media_top_choices: ["question_illustration"],
  short_versus_two: ["choice_illustration"],
  short_verdict_yes_no: ["question_illustration"],
};

const VERDICT_CHOICE_TEXT = /^(true|false|yes|no)$/i;

export function portraitLayoutAssetIntents(layoutId: QuizPortraitLayoutId): DirectorBeat["asset_intents"] {
  return PORTRAIT_LAYOUT_ASSET_INTENTS[layoutId];
}

export function portraitLayoutMedia(layoutId: QuizPortraitLayoutId): readonly QuizLayoutMediaKind[] {
  return getQuizLayoutCapability(layoutId).media.required;
}

export function portraitBeatArchetype(question: QuizQuestion, layoutId: QuizPortraitLayoutId): DirectorArchetype {
  if (layoutId === "short_verdict_yes_no" || question.format === "yes_no") return "yes_no";
  if (layoutId === "short_versus_two") return "visual_multiple_choice";
  return "text_multiple_choice";
}

export function hasVerdictChoices(question: QuizQuestion): boolean {
  return question.choices.length === 2 && question.choices.every((choice) => VERDICT_CHOICE_TEXT.test(choice.text.trim()));
}

/** Portrait layouts have no gameplay mapping of their own, so the gameplay follows the choice count and format. */
export function resolvePortraitGameplayId(question: QuizQuestion, layoutId: QuizPortraitLayoutId): QuizGameplayArchetypeId {
  if (question.choices.length === 2) {
    return question.format === "yes_no" || hasVerdictChoices(question) ? "verdict_yes_no" : "versus_faceoff";
  }
  if (question.format === "odd_one_out") return "visual_spotting";
  if (layoutId === "short_media_top_choices" && question.gameplay_id === "visual_identification") return "visual_identification";
  return "deep_trivia";
}

/**
 * A question fits a portrait layout when the catalog accepts its choice count, format and
 * media, and when a media layout can actually be illustrated (a visual subject exists).
 */
export function isQuestionCompatibleWithPortraitLayout(question: QuizQuestion, layoutId: QuizPortraitLayoutId): boolean {
  const media = portraitLayoutMedia(layoutId);
  if (media.includes("question") && !question.visual_opportunity.trim()) return false;
  const resolution = resolveQuizLayout({
    requestedLayout: layoutId,
    archetype: portraitBeatArchetype(question, layoutId),
    questionFormat: question.format,
    choiceCount: question.choices.length,
    aspectRatio: "9:16",
    media,
    answerMode: question.answer_mode,
  });
  return resolution.ok;
}

function autoPortraitLayout(question: QuizQuestion): QuizPortraitLayoutId {
  const media: readonly QuizLayoutMediaKind[] =
    question.format === "odd_one_out" ? ["choice"] : question.visual_opportunity.trim() ? ["question"] : [];
  const resolution = resolveQuizLayout({
    requestedLayout: "auto",
    archetype: question.format === "yes_no" ? "yes_no" : "text_multiple_choice",
    questionFormat: question.format,
    choiceCount: question.choices.length,
    aspectRatio: "9:16",
    media,
    answerMode: question.answer_mode,
  });
  if (resolution.ok && (QUIZ_PORTRAIT_LAYOUT_IDS as readonly string[]).includes(resolution.layoutId)) {
    return resolution.layoutId as QuizPortraitLayoutId;
  }
  const detail = resolution.ok ? "" : " " + resolution.issues.map((issue) => issue.message).join(" ");
  throw new Error(`Question ${question.id} fits no portrait layout.${detail}`);
}

/** Assigned layout first, then the other layout of the pair, then the portrait auto resolver. */
export function resolvePortraitBeatLayout(
  question: QuizQuestion,
  pair: QuizShortLayoutPair,
  assigned: QuizPortraitLayoutId,
): QuizPortraitLayoutId {
  if (isQuestionCompatibleWithPortraitLayout(question, assigned)) return assigned;
  const other = assigned === pair.primary ? pair.secondary : pair.primary;
  if (other !== assigned && isQuestionCompatibleWithPortraitLayout(question, other)) return other;
  return autoPortraitLayout(question);
}

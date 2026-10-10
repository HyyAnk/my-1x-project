import {
  getQuizLayoutCapability,
  isQuizPortraitLayoutId,
  resolveQuizLayout,
  type DirectorBeat,
  type MascotRenderAspectRatio,
  type QuizIssue,
  type QuizLayoutMediaKind,
  type QuizLayoutResolutionResult,
  type QuizQuestion,
  type ResolvedQuizLayoutId,
} from "@studio/shared";

/**
 * Beats carry no aspect ratio of their own, so callers that do not know the product
 * canvas infer it from the layout family: portrait ids resolve against 9:16, everything
 * else (including "auto") keeps the landscape default.
 */
export function inferBeatAspectRatio(beat: Pick<DirectorBeat, "layout_id">): MascotRenderAspectRatio {
  return isQuizPortraitLayoutId(beat.layout_id) ? "9:16" : "16:9";
}

export function resolveQuestionLayout(
  question: QuizQuestion,
  beat: DirectorBeat,
  aspectRatio: MascotRenderAspectRatio = inferBeatAspectRatio(beat),
): QuizLayoutResolutionResult<ResolvedQuizLayoutId> {
  const rawMedia: readonly QuizLayoutMediaKind[] = Array.isArray(beat.asset_intents)
    ? beat.asset_intents.includes("choice_illustration")
      ? ["choice"]
      : beat.asset_intents.includes("question_illustration")
        ? ["question"]
        : []
    : question.format === "odd_one_out"
      ? ["choice"]
      : ["question"];

  const requestedLayout = beat.layout_id;
  const media =
    requestedLayout !== "auto" ? rawMedia.filter((m) => getQuizLayoutCapability(requestedLayout).media.supported.includes(m)) : rawMedia;

  return resolveQuizLayout({
    requestedLayout,
    archetype: beat.archetype,
    questionFormat: question.format,
    choiceCount: question.choices.length,
    aspectRatio,
    media,
    answerMode: question.answer_mode,
  });
}

export function layoutResolutionIssues(
  resolution: Extract<QuizLayoutResolutionResult<ResolvedQuizLayoutId>, { ok: false }>,
  questionId: string,
  stage: QuizIssue["stage"],
  codePrefix: "director" | "qa",
): QuizIssue[] {
  return resolution.issues.map((layoutIssue) => ({
    code: `${codePrefix}_${layoutIssue.code}`,
    severity: "blocker",
    message: layoutIssue.message,
    next_action: layoutIssue.nextAction,
    question_ids: [questionId],
    stage,
  }));
}

import {
  resolveQuizLayout,
  type DirectorBeat,
  type MascotRenderAspectRatio,
  type QuizIssue,
  type QuizLayoutMediaKind,
  type QuizLayoutResolutionResult,
  type QuizQuestion,
  type ResolvedQuizLayoutId,
} from "@studio/shared";

export function resolveQuestionLayout(
  question: QuizQuestion,
  beat: DirectorBeat,
  aspectRatio: MascotRenderAspectRatio = "16:9",
): QuizLayoutResolutionResult<ResolvedQuizLayoutId> {
  const media: readonly QuizLayoutMediaKind[] = Array.isArray(beat.asset_intents)
    ? beat.asset_intents.includes("choice_illustration")
      ? ["choice"]
      : beat.asset_intents.includes("question_illustration")
        ? ["question"]
        : []
    : question.format === "odd_one_out"
      ? ["choice"]
      : ["question"];

  return resolveQuizLayout({
    requestedLayout: beat.layout_id,
    archetype: beat.archetype,
    questionFormat: question.format,
    choiceCount: question.choices.length,
    aspectRatio,
    media,
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

import {
  resolveBeatQuizStyle,
  resolveQuizStyle,
  type DirectorBeat,
  type DirectorPlan,
  type MascotRenderAspectRatio,
  type QuizLayoutResolutionResult,
  type QuizV2,
  type ResolvedQuizLayoutId,
  type ResolvedQuizStyleWithProvenance,
} from "@studio/shared";
import { resolveQuestionLayout } from "../../layoutCompatibility.js";
import { getQuizVisualTemplate } from "../../visual/registry.js";
import type { QuizTemplateScene } from "../../visual/types.js";
import type { QuizRenderStyleContext } from "../quizRenderStyleContext.js";

type SuccessfulLayoutResolution = Extract<QuizLayoutResolutionResult<ResolvedQuizLayoutId>, { ok: true }>;

export type ResolvedCandyArcadeQuestion = {
  question: QuizV2["questions"][number];
  questionIndex: number;
  beat: DirectorBeat;
  style: ResolvedQuizStyleWithProvenance;
  layoutResolution: SuccessfulLayoutResolution;
  visual: QuizTemplateScene;
};

export function resolveCandyArcadeQuestions(input: {
  quiz: QuizV2;
  director: DirectorPlan;
  styleContext: QuizRenderStyleContext;
  aspectRatio: MascotRenderAspectRatio;
}): ResolvedCandyArcadeQuestion[] {
  const template = getQuizVisualTemplate(resolveQuizStyle(input.styleContext).theme);
  const beatsByQuestionId = new Map(input.director.beats.map((beat) => [beat.question_id, beat]));
  const resolvedQuestions: ResolvedCandyArcadeQuestion[] = [];
  let previousPaletteId: string | undefined;

  input.quiz.questions.forEach((question, questionIndex) => {
    const beat = beatsByQuestionId.get(question.id);
    if (!beat) return;

    const style = resolveBeatQuizStyle(input.styleContext, beat);
    const layoutResolution = resolveQuestionLayout(question, beat, input.aspectRatio);
    if (!layoutResolution.ok) {
      throw new Error(layoutResolution.issues.map((issue) => `${issue.code}: ${issue.message}`).join(" "));
    }

    const visual = template.resolveScene({
      question,
      questionIndex,
      totalQuestions: input.quiz.questions.length,
      requestedPalette: style.paletteId,
      resolvedLayoutId: layoutResolution.layoutId,
      requestedMotion: beat.motion_id,
      requestedTransition: beat.transition_id,
      previousPaletteId,
    });
    previousPaletteId = visual.palette.id;
    resolvedQuestions.push({ question, questionIndex, beat, style, layoutResolution, visual });
  });

  return resolvedQuestions;
}

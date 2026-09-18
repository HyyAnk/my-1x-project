import type { DirectorPlan, QuizQuestion, VoicePlan } from "@studio/shared";
import type { TimelineContext } from "./timelineContext.js";
import {
  compileMidpointBeat,
  compileQuestionEntranceBeat,
  compileChoicesBeat,
  compileThinkingCountdownBeat,
  compileAnswerRevealBeat,
  compileExplanationBeat,
} from "./question/index.js";

export function compileQuestionBlock(
  ctx: TimelineContext,
  question: QuizQuestion,
  questionIndex: number,
  director: DirectorPlan,
  voicePlan: VoicePlan,
): void {
  const beat = director.beats.find((candidate) => candidate.question_id === question.id);
  if (!beat) throw new Error("Question " + question.id + " has no Director beat");

  compileMidpointBeat(ctx, question, voicePlan);

  const { questionStart, questionNarrationEnd } = compileQuestionEntranceBeat(ctx, question, beat, voicePlan);

  const { choiceNarrationEnd } = compileChoicesBeat(ctx, question, questionIndex, voicePlan, questionStart, questionNarrationEnd);

  const { revealAt } = compileThinkingCountdownBeat(ctx, question, beat, voicePlan, choiceNarrationEnd);

  const { rewardAt, revealNarrationEnd } = compileAnswerRevealBeat(ctx, question, beat, voicePlan, revealAt);

  compileExplanationBeat(ctx, question, beat, voicePlan, questionStart, rewardAt, revealNarrationEnd);
}

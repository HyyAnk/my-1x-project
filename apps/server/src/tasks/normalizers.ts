import type { Beat } from "../sceneTiming.js";
import { canonicalizeVisibleQuizAnswer, stripQuizChoiceLabel } from "../quiz/domain/quiz.js";

export function normalizeQuizBeatMetadata(beats: Beat[]): Beat[] {
  const canonicalByQuestion = new Map<number, NonNullable<Beat["quiz"]>>();
  for (const beat of beats) {
    const quiz = beat.quiz;
    if (!quiz || ["intro", "outro"].includes(quiz.phase) || !quiz.question_number) continue;
    const canonicalAnswer = canonicalizeVisibleQuizAnswer(quiz.choices, quiz.answer);
    if (!quiz.question.trim() || quiz.choices.length < 2 || !canonicalAnswer) continue;
    if (
      !canonicalByQuestion.has(quiz.question_number) ||
      (!canonicalByQuestion.get(quiz.question_number)!.image_prompt.trim() && quiz.image_prompt.trim())
    ) {
      canonicalByQuestion.set(quiz.question_number, {
        ...quiz,
        choices: quiz.choices.map(stripQuizChoiceLabel),
        answer: canonicalAnswer,
      });
    }
  }

  return beats.map((beat) => {
    const quiz = beat.quiz;
    const resolvedSourceIds =
      beat.source_ids.length > 0
        ? beat.source_ids
        : quiz?.question_number
          ? [`C${String(quiz.question_number).padStart(2, "0")}`]
          : beat.continuity_bundle_id && /^cb-(\d+)$/i.test(beat.continuity_bundle_id)
            ? [`C${String(Number(beat.continuity_bundle_id.match(/^cb-(\d+)$/i)![1])).padStart(2, "0")}`]
            : beat.sequence_id && /^sequence-(\d+)$/i.test(beat.sequence_id)
              ? [`C${String(Number(beat.sequence_id.match(/^sequence-(\d+)$/i)![1])).padStart(2, "0")}`]
              : [];

    const beatWithSources =
      resolvedSourceIds.length > 0 && beat.source_ids.length === 0 ? { ...beat, source_ids: resolvedSourceIds } : beat;

    if (!quiz || ["intro", "outro"].includes(quiz.phase) || !quiz.question_number) return beatWithSources;
    const canonical = canonicalByQuestion.get(quiz.question_number);
    if (!canonical) return beatWithSources;
    const ownAnswer = canonicalizeVisibleQuizAnswer(quiz.choices, quiz.answer);
    if (ownAnswer) {
      return {
        ...beatWithSources,
        quiz: {
          ...quiz,
          choices: quiz.choices.map(stripQuizChoiceLabel),
          answer: ownAnswer,
          image_prompt: quiz.image_prompt.trim() || canonical.image_prompt,
        },
      };
    }
    return {
      ...beatWithSources,
      quiz: {
        ...quiz,
        question: quiz.question.trim() || canonical.question,
        choices: canonical.choices,
        answer: canonical.answer,
        explanation: quiz.explanation.trim() || canonical.explanation,
        image_prompt: quiz.image_prompt.trim() || canonical.image_prompt,
      },
    };
  });
}

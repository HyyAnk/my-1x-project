import { resolveQuizLayoutId, type DirectorArchetype, type DirectorPlan, type QuizQuestionFormat, type QuizV2 } from "@studio/shared";
import type { EpisodePreviewQuestion } from "../types/episodePreview.types";

export function buildEpisodePreviewQuestions(quiz: QuizV2 | null, directorPlan: DirectorPlan | null): EpisodePreviewQuestion[] {
  if (!quiz) return [];
  const beatsByQuestionId = new Map(directorPlan?.beats.map((beat) => [beat.question_id, beat]) ?? []);

  return quiz.questions.map((question) => {
    const beat = beatsByQuestionId.get(question.id);
    const correctChoiceIndex = Math.max(
      0,
      question.choices.findIndex((choice) => choice.id === question.correct_choice_id),
    );
    return {
      id: question.id,
      number: question.number,
      text: question.question,
      choices: question.choices.map((choice) => choice.text),
      correctChoiceIndex,
      factText: question.fun_fact || question.explanation,
      totalQuestions: quiz.questions.length,
      layoutId: resolveQuizLayoutId({
        requestedLayout: beat?.layout_id ?? "auto",
        archetype: beat?.archetype ?? inferQuestionArchetype(question.format),
        questionFormat: question.format,
      }),
      layoutSource: beat ? "director" : "inferred",
    };
  });
}

function inferQuestionArchetype(format: QuizQuestionFormat): DirectorArchetype {
  if (format === "odd_one_out") return "visual_multiple_choice";
  if (format === "image_guess") return "illustrated_multiple_choice";
  if (format === "true_false") return "true_false";
  return "text_multiple_choice";
}

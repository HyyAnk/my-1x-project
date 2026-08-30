import {
  resolveQuizLayoutId,
  type DirectorArchetype,
  type DirectorPlan,
  type Episode,
  type QuizQuestionFormat,
  type QuizV2,
} from "@studio/shared";
import type { EpisodePreviewQuestion } from "../types/episodePreview.types";

export function buildEpisodePreviewQuestions(
  quiz: QuizV2 | null,
  directorPlan: DirectorPlan | null,
  episode?: Episode | null,
): EpisodePreviewQuestion[] {
  if (quiz && quiz.questions && quiz.questions.length > 0) {
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

  if (episode) {
    return [buildTopicTemplatePreviewQuestion(episode)];
  }

  return [];
}

export function buildTopicTemplatePreviewQuestion(episode: Episode): EpisodePreviewQuestion {
  const quizFormat = normalizeQuizQuestionFormat(episode.quiz_config?.quiz_format);
  const archetype = inferQuestionArchetype(quizFormat);
  const layoutId = resolveQuizLayoutId({
    requestedLayout: "auto",
    archetype,
    questionFormat: quizFormat,
  });
  const totalQuestions = episode.quiz_config?.question_count ?? 8;

  const topicTitle = episode.topic?.title?.trim();
  const topicHook = episode.topic?.hook?.trim();
  const topicPremise = episode.topic?.premise?.trim();

  let text = topicTitle || "Sample Quiz Question";
  let choices: string[];

  if (quizFormat === "odd_one_out") {
    text = topicTitle ? `Find the odd one out: ${topicTitle}` : "Find the odd one out among the choices";
    choices = ["Option A", "Option B", "Option C"];
  } else if (quizFormat === "true_false") {
    text = topicTitle || "Is this statement true or false?";
    choices = ["True", "False"];
  } else if (quizFormat === "image_guess") {
    text = topicTitle || "What is shown in the image?";
    choices = ["Choice A", "Choice B", "Choice C"];
  } else {
    choices = ["Choice A", "Choice B", "Choice C"];
  }

  return {
    id: "topic-template-preview-q1",
    number: 1,
    text,
    choices,
    correctChoiceIndex: quizFormat === "true_false" ? 0 : 1,
    factText: topicHook || topicPremise || "Previewing visual style before generating script.",
    totalQuestions,
    layoutId,
    layoutSource: "topic_template",
  };
}

export function normalizeQuizQuestionFormat(format?: string): QuizQuestionFormat {
  if (format === "odd_one_out") return "odd_one_out";
  if (format === "image_guess") return "image_guess";
  if (format === "true_false") return "true_false";
  return "multiple_choice";
}

export function inferQuestionArchetype(format: QuizQuestionFormat): DirectorArchetype {
  if (format === "odd_one_out") return "visual_multiple_choice";
  if (format === "image_guess") return "illustrated_multiple_choice";
  if (format === "true_false") return "true_false";
  return "text_multiple_choice";
}

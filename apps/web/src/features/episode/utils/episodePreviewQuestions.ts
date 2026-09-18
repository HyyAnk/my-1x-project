import {
  isResolvedQuizLayoutId,
  resolveQuizLayout,
  type DirectorArchetype,
  type DirectorPlan,
  type Episode,
  type QuizQuestionFormat,
  type QuizV2,
  type ResolvedQuizLayoutId,
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
      const archetype = beat?.archetype ?? (question.choices.length === 1 ? "mystery_reveal" : inferQuestionArchetype(question.format));
      const isMystery = archetype === "mystery_reveal" || beat?.layout_id === "mystery_reveal";
      const choices =
        isMystery && question.choices.length > 0
          ? [question.choices[correctChoiceIndex]?.text || question.choices[0].text]
          : question.choices.map((choice) => choice.text);
      const effectiveCorrectIndex = isMystery ? 0 : correctChoiceIndex;

      return {
        id: question.id,
        number: question.number,
        text: question.question,
        choices,
        correctChoiceIndex: effectiveCorrectIndex,
        factText: question.explanation || question.fun_fact,
        totalQuestions: quiz.questions.length,
        layoutId: resolvePreviewLayout(
          beat?.layout_id ?? (isMystery ? "mystery_reveal" : "auto"),
          archetype,
          question.format,
          choices.length,
        ),
        questionFormat: question.format,
        archetype,
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
  const isMystery = (episode.quiz_config as { gameplay_archetype?: string } | undefined)?.gameplay_archetype === "mystery_reveal";
  const quizFormat = normalizeQuizQuestionFormat(episode.quiz_config?.quiz_format);
  const archetype = isMystery ? "mystery_reveal" : inferQuestionArchetype(quizFormat);
  const choiceCount = isMystery ? 1 : quizFormat === "true_false" ? 2 : 3;
  const layoutId = resolvePreviewLayout(isMystery ? "mystery_reveal" : "auto", archetype, quizFormat, choiceCount);
  const totalQuestions = episode.quiz_config?.question_count ?? 8;

  const topicTitle = episode.topic?.title?.trim();
  const topicHook = episode.topic?.hook?.trim();
  const topicPremise = episode.topic?.premise?.trim();

  let text = topicTitle || "Sample Quiz Question";
  let choices: string[];

  if (isMystery) {
    text = topicTitle ? `Can you guess the mystery subject? ${topicTitle}` : "Who or what is hidden in the shadows?";
    choices = ["Mystery Answer"];
  } else if (quizFormat === "odd_one_out") {
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
    correctChoiceIndex: isMystery ? 0 : quizFormat === "true_false" ? 0 : 1,
    factText: topicHook || topicPremise || "Previewing visual style before generating script.",
    totalQuestions,
    layoutId,
    questionFormat: quizFormat,
    archetype,
    layoutSource: "topic_template",
  };
}

function resolvePreviewLayout(
  requestedLayout: DirectorPlan["beats"][number]["layout_id"],
  archetype: DirectorArchetype,
  questionFormat: QuizQuestionFormat,
  choiceCount: number,
): ResolvedQuizLayoutId {
  const resolution = resolveQuizLayout({ requestedLayout, archetype, questionFormat, choiceCount });
  if (resolution.ok) return resolution.layoutId;
  if (requestedLayout !== "auto" && isResolvedQuizLayoutId(requestedLayout)) return requestedLayout;
  throw new Error(resolution.issues.map((issue) => issue.message).join(" "));
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

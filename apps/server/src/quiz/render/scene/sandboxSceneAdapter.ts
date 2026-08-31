import { getQuizPreviewLayoutCapability, quizChoicePresentationFor, type SandboxPreviewInput } from "@studio/shared";
import { candyArcadePalettes } from "../../visual/candyArcade.js";
import { buildQuizSceneRenderModel } from "./buildQuizSceneRenderModel.js";
import { sandboxSceneState } from "./sandboxSceneStateAdapter.js";
import { resolveQuizSceneElementStyles } from "./quizSceneStyles.js";
import type { QuizSceneRenderModel } from "./quizScene.types.js";

export function adaptSandboxQuizScene(input: SandboxPreviewInput, mascotOccupied: boolean): QuizSceneRenderModel {
  const questionNumber = input.question_number;
  const questionFormat = input.question_format ?? (input.choices.length === 2 ? "true_false" : "multiple_choice");
  const capability = getQuizPreviewLayoutCapability(input.layout_id);
  const presentation =
    input.question_format || input.archetype
      ? quizChoicePresentationFor(input.archetype ?? defaultArchetype(questionFormat, capability.supportedPresentations[0]), questionFormat)
      : capability.supportedPresentations[0];
  const questionId = `sandbox-question-${questionNumber}`;
  const choices = input.choices.map((text, index) => ({ id: `sandbox-choice-${index + 1}`, text }));
  const correctChoiceId = choices[input.correct_choice_index]?.id ?? choices[0].id;
  const palette = candyArcadePalettes.find((candidate) => candidate.id === input.palette_id) ?? candyArcadePalettes[0];
  return buildQuizSceneRenderModel({
    question: {
      id: questionId,
      number: questionNumber,
      format: questionFormat,
      text: input.question_text,
      visualOpportunity: "planet rings saturn space",
      explanation: input.fact_card_text,
      funFact: input.fact_card_text,
      choices,
      correctChoiceId,
    },
    totalQuestions: input.total_questions,
    state: sandboxSceneState(input),
    layout: { id: input.layout_id, source: "preview", capability, presentation },
    aspectRatio: input.aspect_ratio,
    mascot: mascotOccupied ? { occupied: true, anchor: input.mascot_position } : { occupied: false, anchor: null },
    hero: { source: null, altText: input.question_text, fallback: { subject: input.question_text, seed: questionNumber } },
    choiceMedia: Object.fromEntries(
      choices.map((choice, index) => [
        choice.id,
        { source: null, altText: choice.text, fallback: { subject: choice.text, seed: questionNumber + index + 1 } },
      ]),
    ),
    palette,
    styles: resolveQuizSceneElementStyles({
      thinkingBar: input.thinking_bar_style,
      questionBox: input.question_box_style,
      answerCard: input.answer_card_style,
      counter: input.counter_style,
      background: input.background_style,
    }),
    visual: { motionId: "enter.pop", transitionId: "bubble_splash" },
    channelBrandName: input.channel_brand_name,
    brandVisible: mascotOccupied,
    isFinal: questionNumber >= input.total_questions,
  });
}

function defaultArchetype(format: "multiple_choice" | "image_guess" | "true_false" | "odd_one_out", presentation: "text" | "visual") {
  if (format === "odd_one_out") return "visual_multiple_choice" as const;
  if (format === "true_false") return "true_false" as const;
  return presentation === "visual" ? ("visual_multiple_choice" as const) : ("text_multiple_choice" as const);
}

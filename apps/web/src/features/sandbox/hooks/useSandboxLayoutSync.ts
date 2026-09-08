import { useCallback } from "react";
import { getCompatibleQuizLayout, type QuizPreviewLayoutId, type ResolvedQuizLayoutId } from "@studio/shared";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxQuestionState, PresetSampleQuestion } from "./useSandboxQuestionState";
import type { SandboxViewportState } from "./useSandboxViewportState";

export interface UseSandboxLayoutSyncOptions {
  design: SandboxDesignState;
  question: SandboxQuestionState;
  viewport: SandboxViewportState;
  mascot: SandboxMascotState;
}

export function useSandboxLayoutSync({ design, question, viewport, mascot: _mascot }: UseSandboxLayoutSyncOptions) {
  const handleLayoutChange = useCallback(
    (newLayoutId: QuizPreviewLayoutId) => {
      design.setLayoutId(newLayoutId);
      const isTfChoices = question.choices.length === 2 && question.choices[0] === "True" && question.choices[1] === "False";

      if (newLayoutId === "mystery_reveal") {
        const currentAnswer = question.choices[question.correctChoiceIndex] || question.choices[0] || "Pikachu";
        question.setChoices([currentAnswer]);
        question.setCorrectChoiceIndex(0);
      } else if (newLayoutId === "verdict_true_false") {
        if (question.choices.length !== 2 || !isTfChoices) {
          question.setChoices(["True", "False"]);
          if (question.correctChoiceIndex >= 2) question.setCorrectChoiceIndex(0);
        }
      } else if (newLayoutId === "split_versus_two") {
        if (question.choices.length !== 2 || isTfChoices) {
          question.setChoices(question.choices.length > 2 && !isTfChoices ? question.choices.slice(0, 2) : ["Option A", "Option B"]);
          if (question.correctChoiceIndex >= 2) question.setCorrectChoiceIndex(0);
        }
      } else if (
        newLayoutId === "visual_choices_three" ||
        newLayoutId === "visual_choices_three_pure" ||
        newLayoutId === "media_left_choices_right" ||
        newLayoutId === "full_stack_list" ||
        newLayoutId === "clue_deduction"
      ) {
        if (question.choices.length < 3) {
          if (isTfChoices) {
            question.setChoices(["Option A", "Option B", "Option C"]);
          } else if (question.choices.length <= 1) {
            const firstChoice = question.choices[0] || "Option A";
            question.setChoices([firstChoice, "Option B", "Option C"]);
          } else {
            question.setChoices([...question.choices, "Option C"]);
          }
        }
      }
    },
    [design, question],
  );

  const handleApplyPresetQuestion = useCallback(
    (sample: PresetSampleQuestion) => {
      question.handleApplyPresetQuestion(sample);
      let targetLayout: ResolvedQuizLayoutId = "media_left_choices_right";
      if (sample.type === "true_false") {
        targetLayout = "verdict_true_false";
      } else if (sample.type === "versus") {
        targetLayout = "split_versus_two";
      } else if (sample.type === "mystery_reveal") {
        targetLayout = "mystery_reveal";
      } else if (
        design.layoutId === "verdict_true_false" ||
        design.layoutId === "split_versus_two" ||
        design.layoutId === "mystery_reveal"
      ) {
        targetLayout = "media_left_choices_right";
      } else if (design.layoutId !== "baseline") {
        targetLayout = design.layoutId;
      }
      const compatibleLayout = getCompatibleQuizLayout(targetLayout, viewport.aspectRatio);
      design.setLayoutId(compatibleLayout);
    },
    [design, question, viewport.aspectRatio],
  );

  return {
    handleLayoutChange,
    handleApplyPresetQuestion,
  };
}

export type SandboxLayoutSync = ReturnType<typeof useSandboxLayoutSync>;

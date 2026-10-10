import { useCallback, useRef } from "react";
import { getCompatibleQuizLayout, type QuizPreviewLayoutId, type ResolvedQuizLayoutId } from "@studio/shared";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxQuestionState, PresetSampleQuestion } from "./useSandboxQuestionState";
import type { SandboxViewportState } from "./useSandboxViewportState";
import { planLayoutChoiceTransition, type SandboxChoiceDraft } from "../utils/sandboxLayoutChoices";

export interface UseSandboxLayoutSyncOptions {
  design: SandboxDesignState;
  question: SandboxQuestionState;
  viewport: SandboxViewportState;
  mascot: SandboxMascotState;
}

export function useSandboxLayoutSync({ design, question, viewport, mascot: _mascot }: UseSandboxLayoutSyncOptions) {
  const cachedDraftChoicesRef = useRef<SandboxChoiceDraft | null>(null);

  const handleLayoutChange = useCallback(
    (newLayoutId: QuizPreviewLayoutId) => {
      design.setLayoutId(newLayoutId);
      const transition = planLayoutChoiceTransition(
        newLayoutId,
        { choices: question.choices, correctIndex: question.correctChoiceIndex },
        cachedDraftChoicesRef.current,
      );
      cachedDraftChoicesRef.current = transition.nextCachedDraft;
      if (transition.choices !== undefined) question.setChoices(transition.choices);
      if (transition.correctIndex !== undefined) question.setCorrectChoiceIndex(transition.correctIndex);
    },
    [design, question],
  );

  const handleApplyPresetQuestion = useCallback(
    (sample: PresetSampleQuestion) => {
      question.handleApplyPresetQuestion(sample);
      let targetLayout: ResolvedQuizLayoutId = "media_left_choices_right";
      if (sample.type === "yes_no") {
        targetLayout = "verdict_yes_no";
      } else if (sample.type === "versus") {
        targetLayout = "split_versus_two";
      } else if (sample.type === "mystery_reveal") {
        targetLayout = "mystery_reveal";
      } else if (design.layoutId === "verdict_yes_no" || design.layoutId === "split_versus_two" || design.layoutId === "mystery_reveal") {
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

import type { QuizPreviewLayoutId } from "@studio/shared";

export type SandboxChoiceDraft = {
  choices: string[];
  correctIndex: number;
};

/** Changes to apply to the sandbox question when switching layouts; undefined fields stay untouched. */
export type SandboxLayoutChoiceTransition = {
  choices?: string[];
  correctIndex?: number;
  nextCachedDraft: SandboxChoiceDraft | null;
};

const THREE_CHOICE_LAYOUTS: ReadonlySet<QuizPreviewLayoutId> = new Set<QuizPreviewLayoutId>([
  "visual_choices_three",
  "visual_choices_three_pure",
  "media_left_choices_right",
  "full_stack_list",
]);

function isYesNoChoices(choices: string[]): boolean {
  return choices.length === 2 && choices[0] === "Yes" && choices[1] === "No";
}

function resetIndexBeyondTwo(correctIndex: number): number | undefined {
  return correctIndex >= 2 ? 0 : undefined;
}

function planMysteryReveal(current: SandboxChoiceDraft, cached: SandboxChoiceDraft | null): SandboxLayoutChoiceTransition {
  const nextCachedDraft = current.choices.length > 1 ? { choices: [...current.choices], correctIndex: current.correctIndex } : cached;
  const currentAnswer = current.choices[current.correctIndex] || current.choices[0] || "Pikachu";
  return { choices: [currentAnswer], correctIndex: 0, nextCachedDraft };
}

function planVerdictYesNo(current: SandboxChoiceDraft, cached: SandboxChoiceDraft | null): SandboxLayoutChoiceTransition {
  if (current.choices.length === 2 && isYesNoChoices(current.choices)) return { nextCachedDraft: cached };
  return { choices: ["Yes", "No"], correctIndex: resetIndexBeyondTwo(current.correctIndex), nextCachedDraft: cached };
}

function planSplitVersus(current: SandboxChoiceDraft, cached: SandboxChoiceDraft | null): SandboxLayoutChoiceTransition {
  const isBinary = isYesNoChoices(current.choices);
  if (current.choices.length === 2 && !isBinary) return { nextCachedDraft: cached };
  if (cached && cached.choices.length === 2 && !cached.choices.includes("Yes")) {
    return { choices: [...cached.choices], correctIndex: Math.min(cached.correctIndex, 1), nextCachedDraft: cached };
  }
  const choices = current.choices.length > 2 && !isBinary ? current.choices.slice(0, 2) : ["Option A", "Option B"];
  return { choices, correctIndex: resetIndexBeyondTwo(current.correctIndex), nextCachedDraft: cached };
}

function expandToThreeChoices(choices: string[]): string[] {
  if (isYesNoChoices(choices)) return ["Option A", "Option B", "Option C"];
  if (choices.length <= 1) return [choices[0] || "Option A", "Option B", "Option C"];
  return [...choices, "Option C"];
}

function planThreeChoices(current: SandboxChoiceDraft, cached: SandboxChoiceDraft | null): SandboxLayoutChoiceTransition {
  if (cached && cached.choices.length >= 3) {
    return { choices: [...cached.choices], correctIndex: cached.correctIndex, nextCachedDraft: null };
  }
  if (current.choices.length >= 3) return { nextCachedDraft: cached };
  return { choices: expandToThreeChoices(current.choices), nextCachedDraft: cached };
}

/** Decides how the sandbox question choices adapt when the preview layout changes. */
export function planLayoutChoiceTransition(
  layoutId: QuizPreviewLayoutId,
  current: SandboxChoiceDraft,
  cached: SandboxChoiceDraft | null,
): SandboxLayoutChoiceTransition {
  if (layoutId === "mystery_reveal") return planMysteryReveal(current, cached);
  if (layoutId === "verdict_yes_no") return planVerdictYesNo(current, cached);
  if (layoutId === "split_versus_two") return planSplitVersus(current, cached);
  if (THREE_CHOICE_LAYOUTS.has(layoutId)) return planThreeChoices(current, cached);
  return { nextCachedDraft: cached };
}

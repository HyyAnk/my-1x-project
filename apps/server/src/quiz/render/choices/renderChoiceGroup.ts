import { renderChoiceCard } from "./choiceSurfaceMarkup.js";
import type { QuizSceneChoice } from "../scene/quizScene.types.js";
import type { ChoiceGroupRenderInput } from "./choiceGroup.types.js";

export function renderChoiceGroup(input: ChoiceGroupRenderInput): string {
  assertCanonicalChoice(input);
  if (input.items.length === 0) return "";
  const choicesHtml = orderedChoices(input.items)
    .map((choice, index) => renderChoiceCard({ groupInput: input, choice, displayIndex: index }))
    .join("");
  const presentationClass = input.presentation === "visual" ? "visual-answer-grid" : "answer-grid";
  const visibility = input.visible ? "visible" : "hidden";
  return `<div class="choice-group choice-group-${input.presentation} ${presentationClass} answer-count-${input.items.length}" role="list" aria-label="Answer choices" data-choice-presentation="${input.presentation}" data-choice-visibility="${visibility}" data-choice-phase="${input.phase}" data-choice-fit-status="pending" data-choice-fit-lines="1"${input.visible ? "" : ' aria-hidden="true"'}>${choicesHtml}</div>`;
}

function orderedChoices(items: readonly QuizSceneChoice[]): QuizSceneChoice[] {
  return items
    .map((choice, sourceIndex) => ({ choice, sourceIndex }))
    .sort((left, right) => left.choice.order - right.choice.order || left.sourceIndex - right.sourceIndex)
    .map(({ choice }) => choice);
}

function assertCanonicalChoice(input: ChoiceGroupRenderInput): void {
  if (input.items.length > 0 && !input.items.some((choice) => choice.id === input.correctChoiceId)) {
    throw new Error("QUIZ_CHOICE_GROUP_CORRECT_CHOICE_MISSING");
  }
}

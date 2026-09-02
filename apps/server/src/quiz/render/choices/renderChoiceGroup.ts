import { ambientPhaseSeconds, textLayout } from "../../visual/candyArcade.js";
import type {
  AnswerCardSemanticState,
  AnswerCardSkinDecorations,
  AnswerCardSkinHookInput,
} from "../../visual/elements/answerCard/types.js";
import { esc, escAttr, illustrationDataUri } from "../candyArcade/candyArcadeSvg.js";
import type { QuizSceneChoice } from "../scene/quizScene.types.js";
import type { ChoiceGroupRenderInput } from "./choiceGroup.types.js";

export function renderChoiceGroup(input: ChoiceGroupRenderInput): string {
  assertCanonicalChoice(input);
  const choicesHtml = orderedChoices(input.items)
    .map((choice, index) => renderChoice(input, choice, index))
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

function renderChoice(input: ChoiceGroupRenderInput, choice: QuizSceneChoice, displayIndex: number): string {
  const label = String.fromCharCode(65 + displayIndex);
  const state = answerState(input, choice.id);
  const revealClass = revealTargetClass(input, choice.id);
  const hookInput: AnswerCardSkinHookInput = { order: displayIndex, presentation: input.presentation, state };
  const decorations = input.skin.renderDecorations?.(hookInput) ?? {};
  const layout = textLayout(choice.text, "choice", { hasMascot: input.hasMascot, layoutId: input.layoutId });
  const itemPhase = ambientPhaseSeconds("float", displayIndex, input.questionId);
  const skinClasses = [input.skin.className, input.skin.cardClassName?.(hookInput)].filter(Boolean).join(" ");
  const stateClasses = [state === "pending" ? "answer-normal answer-pending" : `answer-${state}`, revealClass]
    .filter(Boolean)
    .join(" ");
  const semanticAttributes = choiceAttributes(input, choice, label, state);
  const content = choiceSurfaceContent(choice, label, decorations);

  if (input.presentation === "visual") {
    return `<div class="choice-card choice-card-visual visual-answer-card skin-${input.skin.id} ${stateClasses} choice-tier-${layout.tier}" style="--item-phase:${itemPhase}s" ${semanticAttributes} data-layout-allow-occlusion data-layout-allow-overflow>${renderChoiceMedia(choice)}<div class="choice-card-surface visual-answer-label ${skinClasses}" data-layout-allow-overflow>${content}</div></div>`;
  }

  return `<div class="choice-card choice-card-text choice-card-surface answer-card skin-${input.skin.id} ${skinClasses} ${stateClasses} choice-tier-${layout.tier}" style="--item-phase:${itemPhase}s" ${semanticAttributes} data-layout-allow-occlusion data-layout-allow-overflow>${content}</div>`;
}

function choiceSurfaceContent(choice: QuizSceneChoice, label: string, decorations: AnswerCardSkinDecorations): string {
  return `${decorations.beforeLabelHtml ?? ""}<b class="choice-label" data-layout-allow-occlusion data-text="${label}" aria-hidden="true">${label}${decorations.labelSuffixHtml ?? ""}</b><span class="choice-text" data-layout-allow-occlusion data-text="${escAttr(choice.text)}">${esc(choice.text)}</span>`;
}

function renderChoiceMedia(choice: QuizSceneChoice): string {
  const fallback = choice.media.source === null;
  const source = choice.media.source ?? illustrationDataUri(choice.media.fallback.subject, choice.media.fallback.seed);
  return `<figure class="choice-media image-card option-image" data-media-fallback="${fallback}" data-layout-allow-overflow><img src="${escAttr(source)}" alt="${escAttr(choice.media.altText)}"><span class="image-shine" aria-hidden="true"></span></figure>`;
}

function answerState(input: ChoiceGroupRenderInput, choiceId: string): AnswerCardSemanticState {
  if (input.revealMode === "scheduled") return "pending";
  if (input.phase !== "reveal" && input.phase !== "explain") return "pending";
  return choiceId === input.correctChoiceId ? "correct" : "incorrect";
}

function revealTargetClass(input: ChoiceGroupRenderInput, choiceId: string): string {
  if (input.revealMode !== "scheduled") return "";
  return choiceId === input.correctChoiceId ? "answer-reveal-correct" : "answer-reveal-incorrect";
}

function choiceAttributes(input: ChoiceGroupRenderInput, choice: QuizSceneChoice, label: string, state: AnswerCardSemanticState): string {
  const result = state === "pending" ? "" : state === "correct" ? ", correct answer" : ", incorrect answer";
  return `role="listitem" aria-label="${escAttr(`${label}: ${choice.text}${result}`)}" data-choice-id="${escAttr(choice.id)}" data-choice-order="${choice.order}" data-choice-label="${label}" data-answer-state="${state}" data-choice-skin="${input.skin.id}"`;
}

function assertCanonicalChoice(input: ChoiceGroupRenderInput): void {
  if (!input.items.some((choice) => choice.id === input.correctChoiceId)) {
    throw new Error("QUIZ_CHOICE_GROUP_CORRECT_CHOICE_MISSING");
  }
}

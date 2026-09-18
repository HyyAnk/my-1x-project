import type { QuizChoicePresentation, QuizPreviewLayoutId } from "@studio/shared";
import { ambientPhaseSeconds, textLayout } from "../../visual/candyArcade.js";
import type {
  AnswerCardSemanticState,
  AnswerCardSkinDecorations,
  AnswerCardSkinHookInput,
} from "../../visual/elements/answerCard/types.js";
import { esc, escAttr, illustrationDataUri } from "../candyArcade/candyArcadeSvg.js";
import type { QuizSceneChoice } from "../scene/quizScene.types.js";
import type { ChoiceGroupRenderInput } from "./choiceGroup.types.js";

export type ChoiceDecorationVariant = "detached_badge" | "media_bottom_badge" | "text_only" | "single_reveal";

export function resolveChoiceDecorationVariant(
  layoutId: QuizPreviewLayoutId,
  options?: { presentation?: QuizChoicePresentation },
): ChoiceDecorationVariant {
  switch (layoutId) {
    case "media_left_choices_right":
    case "visual_choices_three":
    case "full_stack_list":
      return "detached_badge";
    case "visual_choices_three_pure":
      return "media_bottom_badge";
    case "split_versus_two":
    case "verdict_true_false":
      return "text_only";
    case "mystery_reveal":
      return "single_reveal";
    default:
      if (options?.presentation === "visual") {
        return "detached_badge";
      }
      return "detached_badge";
  }
}

export type RenderChoiceCardInput = {
  groupInput: ChoiceGroupRenderInput;
  choice: QuizSceneChoice;
  displayIndex: number;
};

export function renderChoiceCard(input: RenderChoiceCardInput): string {
  const { groupInput, choice, displayIndex } = input;
  const variant = resolveChoiceDecorationVariant(groupInput.layoutId, { presentation: groupInput.presentation });
  const isTextOnly = variant === "text_only" || variant === "single_reveal";
  const label = String.fromCharCode(65 + displayIndex);
  const state = resolveAnswerState(groupInput, choice.id);
  const revealClass = resolveRevealTargetClass(groupInput, choice.id);
  const hookInput: AnswerCardSkinHookInput = { order: displayIndex, presentation: groupInput.presentation, state };

  // Include surface decorations while omitting badge decorations for text-only layouts
  const rawDecorations = groupInput.skin.renderDecorations?.(hookInput) ?? {};
  const decorations: AnswerCardSkinDecorations = isTextOnly ? { beforeLabelHtml: rawDecorations.beforeLabelHtml } : rawDecorations;

  const layout = textLayout(choice.text, "choice", {
    hasMascot: groupInput.hasMascot,
    layoutId: groupInput.layoutId,
  });
  const itemPhase = ambientPhaseSeconds("float", displayIndex, groupInput.questionId);
  const skinClasses = [groupInput.skin.className, groupInput.skin.cardClassName?.(hookInput)].filter(Boolean).join(" ");
  const stateClasses = [state === "pending" ? "answer-normal answer-pending" : `answer-${state}`, revealClass].filter(Boolean).join(" ");
  const semanticAttributes = buildChoiceAttributes(groupInput, choice, label, state, variant);

  // Variant 1: Pure Visual (media_bottom_badge)
  if (variant === "media_bottom_badge") {
    const badgeHtml = renderChoiceBadge(label, decorations, "choice-badge-pure");
    const hiddenTextHtml = `<span class="choice-text sr-only" data-layout-ignore data-text="${escAttr(choice.text)}">${esc(choice.text)}</span>`;
    return `<div class="choice-card choice-card-visual visual-answer-card choice-pure-visual skin-${groupInput.skin.id} ${stateClasses} choice-tier-${layout.tier}" style="--item-phase:${itemPhase}s" ${semanticAttributes} data-layout-allow-occlusion data-layout-allow-overflow>${renderChoiceMedia(choice)}${badgeHtml}${hiddenTextHtml}</div>`;
  }

  // Variant 2: Text Only or Single Reveal (split_versus_two, verdict_true_false, mystery_reveal)
  if (isTextOnly) {
    const singleClass = variant === "single_reveal" ? " choice-single-reveal" : "";
    const surfaceDecorations = decorations.beforeLabelHtml ?? "";
    if (groupInput.presentation === "visual") {
      return `<div class="choice-card choice-card-visual visual-answer-card choice-text-only${singleClass} skin-${groupInput.skin.id} ${stateClasses} choice-tier-${layout.tier}" style="--item-phase:${itemPhase}s" ${semanticAttributes} data-layout-allow-occlusion data-layout-allow-overflow>${renderChoiceMedia(choice)}<div class="choice-card-surface visual-answer-label ${skinClasses}" data-layout-allow-overflow>${surfaceDecorations}<span class="choice-text" data-layout-allow-occlusion data-text="${escAttr(choice.text)}">${esc(choice.text)}</span></div></div>`;
    }
    return `<div class="choice-card choice-card-text answer-card choice-text-only${singleClass} skin-${groupInput.skin.id} ${stateClasses} choice-tier-${layout.tier}" style="--item-phase:${itemPhase}s" ${semanticAttributes} data-layout-allow-occlusion data-layout-allow-overflow><div class="choice-card-surface ${skinClasses}" data-layout-allow-overflow>${surfaceDecorations}<span class="choice-text" data-layout-allow-occlusion data-text="${escAttr(choice.text)}">${esc(choice.text)}</span></div></div>`;
  }

  // Variant 3: Detached Badge (media_left_choices_right, visual_choices_three, full_stack_list)
  const badgeHtml = renderChoiceBadge(label, decorations);

  if (groupInput.presentation === "visual") {
    const surfaceHtml = renderChoiceTextSurface(choice, `visual-answer-label ${skinClasses}`, decorations);
    return `<div class="choice-card choice-card-visual visual-answer-card skin-${groupInput.skin.id} ${stateClasses} choice-tier-${layout.tier}" style="--item-phase:${itemPhase}s" ${semanticAttributes} data-layout-allow-occlusion data-layout-allow-overflow>${renderChoiceMedia(choice)}<div class="choice-answer-assembly visual-answer-assembly" data-layout-allow-overflow>${badgeHtml}${surfaceHtml}</div></div>`;
  }

  const surfaceHtml = renderChoiceTextSurface(choice, skinClasses, decorations);
  return `<div class="choice-card choice-card-text answer-card skin-${groupInput.skin.id} ${stateClasses} choice-tier-${layout.tier}" style="--item-phase:${itemPhase}s" ${semanticAttributes} data-layout-allow-occlusion data-layout-allow-overflow>${badgeHtml}${surfaceHtml}</div>`;
}

function renderChoiceBadge(label: string, decorations: AnswerCardSkinDecorations, extraClass = ""): string {
  const suffix = decorations.labelSuffixHtml ?? "";
  const className = extraClass ? `choice-label ${extraClass}` : "choice-label";
  return `<b class="${className}" data-layout-allow-occlusion data-text="${label}" aria-hidden="true">${label}${suffix}</b>`;
}

function renderChoiceTextSurface(choice: QuizSceneChoice, skinClasses: string, decorations: AnswerCardSkinDecorations): string {
  const decorationsHtml = decorations.beforeLabelHtml ?? "";
  return `<div class="choice-card-surface ${skinClasses}" data-layout-allow-overflow>${decorationsHtml}<span class="choice-text" data-layout-allow-occlusion data-text="${escAttr(choice.text)}">${esc(choice.text)}</span></div>`;
}

export function renderChoiceMedia(choice: QuizSceneChoice): string {
  const fallback = choice.media.source === null;
  const source = choice.media.source ?? illustrationDataUri(choice.media.fallback.subject, choice.media.fallback.seed);
  return `<figure class="choice-media image-card option-image" data-media-fallback="${fallback}" data-layout-allow-overflow><img src="${escAttr(source)}" alt="${escAttr(choice.media.altText)}"><span class="image-shine" aria-hidden="true"></span></figure>`;
}

export function resolveAnswerState(input: ChoiceGroupRenderInput, choiceId: string): AnswerCardSemanticState {
  if (input.revealMode === "scheduled") return "pending";
  if (input.phase !== "reveal" && input.phase !== "explain") return "pending";
  return choiceId === input.correctChoiceId ? "correct" : "incorrect";
}

export function resolveRevealTargetClass(input: ChoiceGroupRenderInput, choiceId: string): string {
  if (input.revealMode !== "scheduled") return "";
  return choiceId === input.correctChoiceId ? "answer-reveal-correct" : "answer-reveal-incorrect";
}

export function buildChoiceAttributes(
  input: ChoiceGroupRenderInput,
  choice: QuizSceneChoice,
  label: string,
  state: AnswerCardSemanticState,
  variant: ChoiceDecorationVariant,
): string {
  const result = state === "pending" ? "" : state === "correct" ? ", correct answer" : ", incorrect answer";
  const isTextOnly = variant === "text_only" || variant === "single_reveal";
  const ariaLabel = isTextOnly ? `${choice.text}${result}` : `${label}: ${choice.text}${result}`;
  const labelAttr = isTextOnly ? "" : ` data-choice-label="${label}"`;
  return `role="listitem" aria-label="${escAttr(ariaLabel)}" data-choice-id="${escAttr(choice.id)}" data-choice-order="${choice.order}"${labelAttr} data-answer-state="${state}" data-choice-skin="${input.skin.id}" data-choice-variant="${variant}"`;
}

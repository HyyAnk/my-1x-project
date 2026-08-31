import {
  resolveAnswerCardSkin,
  resolveBackgroundVariant,
  resolveCounterBadgeVariant,
  resolveQuestionBoxVariant,
  resolveThinkingBarVariant,
} from "../../visual/elements/index.js";
import { renderChoiceGroup } from "../choices/renderChoiceGroup.js";
import { renderChannelBrandMark } from "../candyArcade/channelBrandMark.js";
import { escAttr, illustrationDataUri } from "../candyArcade/candyArcadeSvg.js";
import type { QuizSceneParts } from "./buildQuizSceneParts.js";
import type { QuizSceneTiming } from "./quizScene.types.js";
import type { BackgroundRenderContext } from "../../visual/elements/background/types.js";

export function renderStableQuizSceneParts(parts: QuizSceneParts) {
  const questionBoxHtml = resolveQuestionBoxVariant(parts.question.style).renderHtml({
    question: parts.question.text,
    tier: parts.question.layout.tier,
    questionNumber: parts.question.number,
    paletteAccent: parts.question.paletteAccent,
    highlightedHtml: parts.question.highlightedHtml,
  });
  const counterBadgeHtml = resolveCounterBadgeVariant(parts.counter.style).renderHtml({
    questionNumber: parts.counter.questionNumber,
    totalQuestions: parts.counter.totalQuestions,
    paletteAccent: parts.counter.paletteAccent,
    isFinal: parts.counter.isFinal,
  });
  return {
    questionBoxHtml,
    counterBadgeHtml,
    heroHtml: renderSceneMedia(parts.hero, "hero-image"),
    brandMarkHtml: renderChannelBrandMark(parts.brand.name, parts.brand.visible, parts.brand.aspectRatio),
  };
}

export function renderQuizSceneThinkingPart(parts: QuizSceneParts, timing: QuizSceneTiming): string {
  return resolveThinkingBarVariant(parts.phase.thinkingStyle).renderHtml({
    clipStart: timing.start,
    revealStart: timing.revealStart,
    thinkingStart: timing.thinkingStart,
    duration: timing.end - timing.start,
    questionNumber: parts.counter.questionNumber,
    paletteAccent: parts.question.paletteAccent,
  });
}

export function renderQuizSceneChoicePart(parts: QuizSceneParts): string {
  return renderChoiceGroup({
    ...parts.choices,
    skin: resolveAnswerCardSkin(parts.choices.style),
  });
}

export function renderQuizSceneBackground(
  parts: QuizSceneParts,
  surface: "production" | "sandbox",
  context?: Partial<BackgroundRenderContext>,
): string {
  return resolveBackgroundVariant(parts.background.style).renderHtml({
    surface,
    questionIndex: parts.background.questionIndex,
    ...context,
  });
}

export function renderSceneMedia(media: QuizSceneParts["hero"], className: string): string {
  const source = media.source ?? illustrationDataUri(media.fallback.subject, media.fallback.seed);
  return `<figure class="image-card ${className}" data-layout-allow-overflow><img src="${escAttr(source)}" alt="${escAttr(media.altText)}"><span class="image-shine"></span></figure>`;
}

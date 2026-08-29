import type { ChannelMascotConfig, MascotProfile, QuizThinkingBarStyle, QuizV2 } from "@studio/shared";
import { ambientPhaseSeconds, motionCssClass, textLayout, visualAnswerState } from "../../visual/candyArcade.js";
import type { QuizTemplateScene } from "../../visual/types.js";
import { resolveThinkingBarVariant } from "../../visual/elements/index.js";
import { esc, escAttr, highlightQuestionMarkup, illustrationDataUri } from "./candyArcadeSvg.js";
import { assetFor, source } from "./candyArcadeAudio.js";
import { renderMascotHtmlLayer } from "../mascotStateResolver.js";

export type SubComposition = {
  id: string;
  start: string;
  duration: string;
  trackIndex: string;
  html: string;
};

export type Copy = ReturnType<typeof quizCopy>;

export function quizCopy(language: string) {
  const vietnamese = /^(vi|vietnamese|tiếng việt)/i.test(language.trim());
  return vietnamese
    ? {
        ready: "Sẵn sàng chơi chưa?",
        questions: (count: number) => (count === 1 ? "câu hỏi" : "câu hỏi đầy bất ngờ"),
        question: "Câu",
        getReady: "Quan sát thật kỹ nhé!",
        choose: "Chọn một đáp án",
        time: "Sắp hết giờ!",
        correct: "Đúng rồi!",
        why: "Bạn có biết?",
        funFact: "Bạn có biết?",
        final: "Thử thách cuối",
        scorePrompt: "Bạn đúng được mấy câu?",
        playAgain: "Chơi lại nhé",
        exploreMore: "Còn nhiều câu hỏi thú vị phía trước",
        ctaComment: "Bình luận",
        ctaLike: "Thích",
        ctaSubscribe: "Đăng ký",
      }
    : {
        ready: "Ready to play?",
        questions: (count: number) => (count === 1 ? "question" : "questions to explore"),
        question: "Question",
        getReady: "Look closely and get ready!",
        choose: "Choose one",
        time: "Final seconds!",
        correct: "That's right!",
        why: "Did you know?",
        funFact: "Did you know?",
        final: "Final challenge",
        scorePrompt: "How many did you get right?",
        playAgain: "Play again soon",
        exploreMore: "Many more questions to explore",
        ctaComment: "Comment",
        ctaLike: "Like",
        ctaSubscribe: "Subscribe",
      };
}

export function toSubComposition(clip: string): SubComposition {
  const openingTag = clip.match(/^<section\b[^>]*>/)?.[0];
  if (!openingTag) throw new Error("Candy Arcade clip must start with a section element");
  const id = requiredAttribute(openingTag, "id");
  const start = requiredAttribute(openingTag, "data-start");
  const duration = requiredAttribute(openingTag, "data-duration");
  const trackIndex = requiredAttribute(openingTag, "data-track-index");
  const sceneRoot = openingTag
    .replace(/\sdata-start="[^"]*"/g, "")
    .replace(/\sdata-duration="[^"]*"/g, "")
    .replace(/\sdata-track-index="[^"]*"/g, "")
    .replace(/>$/, ` data-composition-id="${id}" data-no-timeline data-width="1920" data-height="1080">`);
  const body = rootRelativeSubCompositionAssets(clip.replace(openingTag, sceneRoot));
  return { id, start, duration, trackIndex, html: `<template id="${id}-template">${body}</template>` };
}

export function requiredAttribute(tag: string, name: string): string {
  const value = tag.match(new RegExp(`\\s${name}="([^"]+)"`))?.[1];
  if (!value) throw new Error(`Candy Arcade clip is missing ${name}`);
  return value;
}

export function rootRelativeSubCompositionAssets(html: string): string {
  return html.replace(/\b(src|poster)="\.\//g, '$1="').replace(/url\((['"]?)\.\//g, "url($1");
}

export function subCompositionMount(scene: SubComposition): string {
  return `<div id="${scene.id}-mount" data-composition-id="${scene.id}" data-composition-src="compositions/${scene.id}.html" data-start="${scene.start}" data-duration="${scene.duration}" data-track-index="${scene.trackIndex}" data-no-timeline></div>`;
}

export function mascotElement(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  phase: "intro" | "question" | "outro",
): string {
  return renderMascotHtmlLayer(mascot, config, phase, { sourceMapper: source });
}

export function introClip(
  end: number,
  count: number,
  copy: Copy,
  mascot?: MascotProfile | null,
  mascotConfig?: ChannelMascotConfig | null,
): string {
  if (end < 0.08) return "";
  const mascotHtml = mascotElement(mascot, mascotConfig, "intro");
  const fallbackMascot = mascot || mascotHtml ? "" : `<div class="brand-mascot mascot-wave" data-layout-ignore aria-hidden="true">✦</div>`;
  return `<section id="candy-intro" class="clip candy-scene candy-intro" data-start="0" data-duration="${end.toFixed(3)}" data-track-index="0"><div class="intro-rays"></div><div class="intro-dot dot-a"></div><div class="intro-dot dot-b"></div><div class="intro-card"><span>QUIZ TIME</span><h1>${esc(copy.ready)}</h1><p>${count} ${esc(copy.questions(count))}</p><div class="intro-stars" data-layout-ignore aria-hidden="true">✦&nbsp;&nbsp;★&nbsp;&nbsp;✦</div></div>${mascotHtml || fallbackMascot}</section>`;
}

export function outroClip(
  start: number,
  end: number,
  count: number,
  copy: Copy,
  mascot?: MascotProfile | null,
  mascotConfig?: ChannelMascotConfig | null,
): string {
  const mascotHtml = mascotElement(mascot, mascotConfig, "outro");
  return `<section id="candy-outro" class="clip candy-scene candy-outro" data-start="${start.toFixed(3)}" data-duration="${Math.max(0.04, end - start).toFixed(3)}" data-track-index="0"><div class="intro-rays"></div><div class="outro-blob blob-a"></div><div class="outro-blob blob-b"></div><div class="outro-card"><span>${esc(copy.scorePrompt)}</span><h1>${esc(copy.playAgain)}</h1><p>${esc(copy.exploreMore)}</p><div class="outro-cta-badges"><span class="badge-cta badge-comment">💬 ${esc(copy.ctaComment)}</span><span class="badge-cta badge-like">👍 ${esc(copy.ctaLike)}</span><span class="badge-cta badge-sub">🔔 ${esc(copy.ctaSubscribe)}</span></div><div class="outro-stars" data-layout-ignore aria-hidden="true">★&nbsp;&nbsp;✦&nbsp;&nbsp;★</div></div>${mascotHtml}</section>`;
}

export function questionClip(input: {
  start: number;
  choicesStart: number;
  thinkingStart: number;
  revealStart: number;
  rewardStart: number;
  end: number;
  question: QuizV2["questions"][number];
  questionIndex: number;
  count: number;
  visual: QuizTemplateScene;
  copy: Copy;
  assets: Record<string, string>;
  isFinal: boolean;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  thinkingBarStyle?: QuizThinkingBarStyle | null;
}): string {
  const { question, visual } = input;
  const questionLayout = textLayout(question.question, "question");
  const config = styleAttributes(
    visual,
    questionLayout,
    input.start,
    input.choicesStart,
    input.thinkingStart,
    input.revealStart,
    input.rewardStart,
    input.end,
  );
  const hasMascot = Boolean(
    input.mascot && (!input.mascotConfig || input.mascotConfig.enabled) && input.mascotConfig?.show_in_question !== false,
  );
  const mascotClass = hasMascot ? "has-mascot" : "";
  const classNames = [
    "clip",
    "candy-scene",
    "quiz-question-clip",
    `layout-${visual.layoutId}`,
    `archetype-${question.format}`,
    motionCssClass(visual.motionId),
    input.isFinal ? "is-final-scene" : "",
    mascotClass,
  ]
    .filter(Boolean)
    .join(" ");
  const questionAsset = assetFor(input.assets, `asset-${question.id}-hero`, `asset-${question.id}-question`);
  const answers = answerCards(question, input.assets);
  const hero =
    visual.layoutId === "visual_choices_three"
      ? ""
      : imageCard(questionAsset, question.visual_opportunity || question.question, "hero-image", question.number);
  const visualAnswers = visual.layoutId === "visual_choices_three" ? visualAnswerCards(question, input.assets) : "";
  const mascotHtml = mascotElement(input.mascot, input.mascotConfig, "question");
  const thinkingBarVariant = resolveThinkingBarVariant(input.thinkingBarStyle);
  const thinkingBarHtml = thinkingBarVariant.renderHtml({
    clipStart: input.start,
    revealStart: input.revealStart,
    thinkingStart: input.thinkingStart,
    duration: input.end - input.start,
    questionNumber: question.number,
    paletteAccent: visual.palette.accent,
  });
  const body = `<div class="game-stage" data-layout-allow-overflow><div class="question-title question-tier-${questionLayout.tier}" data-layout-allow-occlusion><div class="question-card-inner"><div class="q-badge-star" data-layout-ignore aria-hidden="true"><span class="star-shape">★</span><i class="star-sparkle star-sp-1">✦</i><i class="star-sparkle star-sp-2">•</i></div><div class="q-decor-corner q-decor-top-right" data-layout-ignore aria-hidden="true"><span class="corner-gem">✦</span></div><div class="q-decor-corner q-decor-bottom-right" data-layout-ignore aria-hidden="true"><span class="corner-petal">✿</span></div><h1>${highlightQuestionMarkup(question.question, question.visual_opportunity)}</h1></div></div>${hero}${visualAnswers || answers}<div class="phase-region">${thinkingBarHtml}${revealPanel(input)}</div></div>`;
  return `<section id="quiz-q${question.number}-${Math.round(input.start * 1000)}" class="${classNames}" ${config} data-start="${input.start.toFixed(3)}" data-duration="${Math.max(0.04, input.end - input.start).toFixed(3)}" data-track-index="0"><div class="bg-gradient"></div><div class="bg-rays"></div><div class="bg-pattern pattern-circles"></div><div class="bg-pattern pattern-sprinkles"></div><div class="bg-shape shape-a" data-layout-allow-overflow></div>${sceneDecorations(input.questionIndex)}<header class="game-header" data-layout-allow-occlusion><div class="hanging-wood-sign" data-layout-allow-occlusion><div class="hanging-ropes" aria-hidden="true"><span class="wood-rope rope-left"></span><span class="wood-rope rope-right"></span></div><div class="wood-sign-plank"><span class="rope-bracket bracket-left" aria-hidden="true"></span><span class="rope-bracket bracket-right" aria-hidden="true"></span><div class="wood-inner-panel"><span class="question-number-val">${question.number}</span></div><span class="wood-sign-star star-tl" data-layout-ignore aria-hidden="true">✦</span><span class="wood-sign-star star-br" data-layout-ignore aria-hidden="true">★</span></div></div></header>${body}${mascotHtml}${rewardFx(input.isFinal ? "big" : "small")}</section>`;
}

export function transitionClip(input: {
  start: number;
  end: number;
  visual: QuizTemplateScene;
  nextPalette: QuizTemplateScene["palette"];
}): string {
  if (input.end - input.start < 0.04) return "";
  const special = input.visual.transitionId === "lightning_brush";
  const body = special
    ? `<div class="brush brush-one" data-layout-allow-occlusion data-layout-allow-overflow></div><div class="brush brush-two" data-layout-allow-occlusion data-layout-allow-overflow></div><div class="transition-mark" data-layout-ignore aria-hidden="true">✦</div>`
    : `<div class="splash-bed" data-layout-allow-occlusion data-layout-allow-overflow></div><i class="splash-bubble splash-bubble-a" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-b" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-c" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-d" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-e" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-f" data-layout-allow-occlusion data-layout-allow-overflow></i><div class="splash-brand" data-layout-ignore aria-hidden="true">✦</div><div class="splash-particles" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>✦</i><i>•</i></div><div class="splash-release" data-layout-allow-occlusion data-layout-allow-overflow></div>`;
  return `<section id="candy-transition-${Math.round(input.start * 1000)}" class="clip candy-transition transition-${input.visual.transitionId}" data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow style="--from:${input.visual.palette.accent};--to:${input.nextPalette.backgroundPrimary};--ink:${input.visual.palette.text};--clip-start:${input.start.toFixed(3)}s" data-start="${input.start.toFixed(3)}" data-duration="${(input.end - input.start).toFixed(3)}" data-track-index="1">${body}</section>`;
}

export function rewardFx(intensity: "small" | "big"): string {
  const particles = intensity === "big" ? ["★", "✦", "★", "✦", "★", "✦", "★", "✦", "★"] : ["✦", "★", "✦", "★", "✦", "★", "✦"];
  return `<div class="reward-fx reward-${intensity}" data-layout-ignore aria-hidden="true">${particles.map((particle) => `<i>${particle}</i>`).join("")}</div>`;
}

export function imageCard(asset: string | null, subject: string, className: string, seed: number): string {
  return `<figure class="image-card ${className}" data-layout-allow-overflow><img src="${escAttr(asset ?? illustrationDataUri(subject, seed))}" alt="${escAttr(subject)}"><span class="image-shine"></span></figure>`;
}

export function answerCards(question: QuizV2["questions"][number], assets: Record<string, string>): string {
  return `<div class="answer-grid answer-count-${question.choices.length}">${question.choices
    .map((choice, index) => {
      const state = "answer-" + visualAnswerState(choice.id, question.correct_choice_id, "reveal");
      const layout = textLayout(choice.text, "choice");
      const optionAsset = assetFor(assets, `asset-${question.id}-${choice.id}`);
      const phaseSeconds = ambientPhaseSeconds("float", index, question.id);
      return `<div class="answer-card ${state} choice-tier-${layout.tier}" style="--item-phase:${phaseSeconds}s" data-layout-allow-occlusion data-layout-allow-overflow><b data-layout-allow-occlusion data-text="${String.fromCharCode(65 + index)}">${String.fromCharCode(65 + index)}</b>${optionAsset ? `<img src="${escAttr(optionAsset)}" alt="">` : ""}<span data-layout-allow-occlusion data-text="${escAttr(choice.text)}">${esc(choice.text)}</span></div>`;
    })
    .join("")}</div>`;
}

export function visualAnswerCards(question: QuizV2["questions"][number], assets: Record<string, string>): string {
  return `<div class="visual-answer-grid">${question.choices
    .map((choice, index) => {
      const state = "answer-" + visualAnswerState(choice.id, question.correct_choice_id, "reveal");
      const layout = textLayout(choice.text, "choice");
      const phaseSeconds = ambientPhaseSeconds("float", index, question.id);
      return `<div class="visual-answer-card ${state} choice-tier-${layout.tier}" style="--item-phase:${phaseSeconds}s" data-layout-allow-occlusion data-layout-allow-overflow>${imageCard(assetFor(assets, `asset-${question.id}-${choice.id}`), choice.text, "option-image", index + question.number * 10)}<div class="visual-answer-label" data-layout-allow-overflow><b data-layout-allow-occlusion data-text="${String.fromCharCode(65 + index)}">${String.fromCharCode(65 + index)}</b><span data-layout-allow-occlusion data-text="${escAttr(choice.text)}">${esc(choice.text)}</span></div></div>`;
    })
    .join("")}</div>`;
}

export function revealPanel(input: { question: QuizV2["questions"][number]; copy: Copy; isFinal: boolean }): string {
  return `<div class="fact-card" data-layout-allow-occlusion><p>${esc(input.question.fun_fact || input.question.explanation)}</p></div>`;
}

export function sceneDecorations(questionIndex: number): string {
  const symbols = ["✦", "•", "○", "★", "✧", "⚡", "•"];
  return `<div class="scene-decor" data-layout-ignore aria-hidden="true">${symbols.map((symbol, index) => `<i class="decor-${index + 1}" data-layout-ignore aria-hidden="true" style="--decor-phase:${ambientPhaseSeconds("drift", index, String(questionIndex))}s">${symbol}</i>`).join("")}</div>`;
}

export function styleAttributes(
  visual: QuizTemplateScene,
  layout: ReturnType<typeof textLayout>,
  clipStart: number,
  choicesStart: number,
  thinkingStart: number,
  revealStart: number,
  rewardStart: number,
  clipEnd: number,
): string {
  const palette = visual.palette;
  const timerDuration = Math.max(0.04, revealStart - clipStart);
  return `style="--bg-primary:${palette.backgroundPrimary};--bg-secondary:${palette.backgroundSecondary};--accent:${palette.accent};--surface-accent:${palette.surfaceAccent};--on-accent:${palette.onAccent};--badge:${palette.answerBadge};--correct:${palette.correct};--incorrect:${palette.incorrect};--surface:${palette.surface};--ink:${palette.text};--muted:${palette.muted};--question-size:${layout.fontSize}px;--question-leading:${layout.lineHeight};--clip-start:${clipStart.toFixed(3)}s;--scene-duration:${Math.max(0.04, clipEnd - clipStart).toFixed(3)}s;--choices-at:${Math.max(0, choicesStart - clipStart).toFixed(3)}s;--thinking-at:${Math.max(0, thinkingStart - clipStart).toFixed(3)}s;--reveal-at:${Math.max(0, revealStart - clipStart).toFixed(3)}s;--reward-at:${Math.max(0, rewardStart - clipStart).toFixed(3)}s;--choices-duration:${Math.max(0.04, revealStart - choicesStart).toFixed(3)}s;--timer-duration:${timerDuration.toFixed(3)}s;--reveal-duration:${Math.max(0.04, rewardStart - revealStart).toFixed(3)}s;--ambient-phase:${ambientPhaseSeconds("drift", 0, String(clipStart))}s"`;
}

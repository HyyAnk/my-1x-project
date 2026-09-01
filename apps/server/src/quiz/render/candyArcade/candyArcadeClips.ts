import type {
  ChannelMascotConfig,
  DirectorArchetype,
  MascotProfile,
  MascotRenderAspectRatio,
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizLayoutResolutionResult,
  QuizQuestion,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  ResolvedQuizLayoutId,
} from "@studio/shared";
import { serializeQuizPaletteInlineStyle } from "@studio/shared";
import { ambientPhaseSeconds, motionCssClass, textLayout } from "../../visual/candyArcade.js";
import type { QuizTemplateScene } from "../../visual/types.js";
import { esc, escAttr, illustrationDataUri } from "./candyArcadeSvg.js";
import { source } from "./candyArcadeAudio.js";
import {
  renderProductionMascotHtmlLayer,
  type ProductionMascotRenderOptions,
  type ProductionMascotTimelineEvent,
} from "../productionMascotRenderer.js";
import { adaptProductionQuizScene } from "../scene/productionSceneAdapter.js";
import { buildQuizSceneParts } from "../scene/buildQuizSceneParts.js";
import {
  renderQuizSceneBackground,
  renderQuizSceneChoicePart,
  renderQuizSceneThinkingPart,
  renderStableQuizSceneParts,
} from "../scene/renderQuizSceneParts.js";
import { renderQuizLayoutBody } from "../layouts/registry.js";
import { renderCandyRaysDecorations } from "../../visual/elements/background/variants/candyRays.js";
import type { QuizSceneTiming } from "../scene/quizScene.types.js";

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

export function toSubComposition(clip: string, aspectRatio: MascotRenderAspectRatio = "16:9"): SubComposition {
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
    .replace(
      />$/,
      ` data-composition-id="${id}" data-no-timeline data-width="${aspectRatio === "9:16" ? 1080 : 1920}" data-height="${aspectRatio === "9:16" ? 1920 : 1080}" data-aspect-ratio="${aspectRatio}">`,
    );
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
  options: Partial<Omit<ProductionMascotRenderOptions, "phase">> = {},
): string {
  return renderProductionMascotHtmlLayer(mascot, config, {
    phase,
    clipStartSeconds: options.clipStartSeconds ?? 0,
    clipDurationSeconds: options.clipDurationSeconds ?? 10,
    timelineEvents: options.timelineEvents,
    revealOutcome: options.revealOutcome,
    aspectRatio: options.aspectRatio ?? "16:9",
    sourceMapper: source,
    extraClass: options.extraClass,
  });
}

export function introClip(
  end: number,
  count: number,
  copy: Copy,
  mascot?: MascotProfile | null,
  mascotConfig?: ChannelMascotConfig | null,
  aspectRatio: MascotRenderAspectRatio = "16:9",
): string {
  if (end < 0.08) return "";
  const mascotHtml = mascotElement(mascot, mascotConfig, "intro", { clipStartSeconds: 0, clipDurationSeconds: end, aspectRatio });
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
  aspectRatio: MascotRenderAspectRatio = "16:9",
): string {
  const mascotHtml = mascotElement(mascot, mascotConfig, "outro", {
    clipStartSeconds: start,
    clipDurationSeconds: Math.max(0.04, end - start),
    aspectRatio,
  });
  return `<section id="candy-outro" class="clip candy-scene candy-outro" data-start="${start.toFixed(3)}" data-duration="${Math.max(0.04, end - start).toFixed(3)}" data-track-index="0"><div class="intro-rays"></div><div class="outro-blob blob-a"></div><div class="outro-blob blob-b"></div><div class="outro-card"><span>${esc(copy.scorePrompt)}</span><h1>${esc(copy.playAgain)}</h1><p>${esc(copy.exploreMore)}</p><div class="outro-cta-badges"><span class="badge-cta badge-comment">💬 ${esc(copy.ctaComment)}</span><span class="badge-cta badge-like">👍 ${esc(copy.ctaLike)}</span><span class="badge-cta badge-sub">🔔 ${esc(copy.ctaSubscribe)}</span></div><div class="outro-stars" data-layout-ignore aria-hidden="true">★&nbsp;&nbsp;✦&nbsp;&nbsp;★</div></div>${mascotHtml}</section>`;
}

export function questionClip(input: {
  start: number;
  choicesStart: number;
  thinkingStart: number;
  revealStart: number;
  rewardStart: number;
  end: number;
  question: QuizQuestion;
  archetype: DirectorArchetype;
  layoutResolution: Extract<QuizLayoutResolutionResult<ResolvedQuizLayoutId>, { ok: true }>;
  questionIndex: number;
  count: number;
  visual: QuizTemplateScene;
  copy: Copy;
  assets: Record<string, string>;
  isFinal: boolean;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  mascotEvents?: readonly ProductionMascotTimelineEvent[];
  thinkingBarStyle?: QuizThinkingBarStyle | null;
  questionBoxStyle?: QuizQuestionBoxStyle | null;
  answerCardStyle?: QuizAnswerCardStyle | null;
  counterStyle?: QuizQuestionCounterStyle | null;
  backgroundStyle?: QuizBackgroundStyle | null;
  aspectRatio?: MascotRenderAspectRatio;
  channelBrandName?: string | null;
}): string {
  const { question, visual } = input;
  const timing: QuizSceneTiming = {
    start: input.start,
    choicesStart: input.choicesStart,
    thinkingStart: input.thinkingStart,
    revealStart: input.revealStart,
    rewardStart: input.rewardStart,
    end: input.end,
  };
  const mascotHtml = mascotElement(input.mascot, input.mascotConfig, "question", {
    clipStartSeconds: input.start,
    clipDurationSeconds: Math.max(0.04, input.end - input.start),
    timelineEvents: input.mascotEvents,
    revealOutcome: "correct",
    aspectRatio: input.aspectRatio ?? "16:9",
  });
  const mascotEnabled = Boolean(
    input.mascot && (!input.mascotConfig || input.mascotConfig.enabled) && input.mascotConfig?.show_in_question !== false,
  );
  const mascot = mascotEnabled
    ? { occupied: true as const, anchor: input.mascotConfig?.position ?? "bottom_left" }
    : { occupied: false as const, anchor: null };
  const model = adaptProductionQuizScene({
    question,
    questionIndex: input.questionIndex,
    totalQuestions: input.count,
    archetype: input.archetype,
    layoutResolution: input.layoutResolution,
    visual,
    timing,
    atSeconds: input.revealStart,
    assets: input.assets,
    aspectRatio: input.aspectRatio ?? "16:9",
    mascot,
    styles: {
      thinkingBar: input.thinkingBarStyle,
      questionBox: input.questionBoxStyle,
      answerCard: input.answerCardStyle,
      counter: input.counterStyle,
      background: input.backgroundStyle,
    },
    channelBrandName: input.channelBrandName,
    brandVisible: Boolean(mascotHtml),
    isFinal: input.isFinal,
  });
  const parts = buildQuizSceneParts(model);
  const config = styleAttributes(
    visual,
    parts.question.layout,
    input.start,
    input.choicesStart,
    input.thinkingStart,
    input.revealStart,
    input.rewardStart,
    input.end,
  );
  const stableParts = renderStableQuizSceneParts(parts);
  const choicesHtml = renderQuizSceneChoicePart(parts);
  const mascotClass = model.mascot.occupied ? "has-mascot" : "";
  const classNames = [
    "clip",
    "candy-scene",
    "quiz-question-clip",
    `layout-${model.layout.id}`,
    `archetype-${question.format}`,
    motionCssClass(visual.motionId),
    input.isFinal ? "is-final-scene" : "",
    mascotClass,
  ]
    .filter(Boolean)
    .join(" ");
  const layoutBody = renderQuizLayoutBody(model.layout.id, {
    questionBoxHtml: stableParts.questionBoxHtml,
    heroHtml: stableParts.heroHtml,
    choicesHtml,
    phaseHtml: `${renderQuizSceneThinkingPart(parts, timing)}<div class="fact-card" data-layout-allow-occlusion><p>${esc(parts.phase.factText)}</p></div>`,
  });
  const body = `<div class="game-stage" data-layout-allow-overflow>${layoutBody}</div>`;
  return `<section id="quiz-q${question.number}-${Math.round(input.start * 1000)}" class="${classNames}" ${config} data-start="${input.start.toFixed(3)}" data-duration="${Math.max(0.04, input.end - input.start).toFixed(3)}" data-track-index="0">${renderQuizSceneBackground(parts, "production", { questionIndex: input.questionIndex, clipStart: input.start, duration: input.end - input.start })}<header class="game-header" data-layout-allow-occlusion>${stableParts.counterBadgeHtml}</header>${body}${stableParts.brandMarkHtml}${mascotHtml}${rewardFx(input.isFinal ? "big" : "small")}</section>`;
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

export function revealPanel(input: { question: QuizQuestion; copy: Copy; isFinal: boolean }): string {
  return `<div class="fact-card" data-layout-allow-occlusion><p>${esc(input.question.fun_fact || input.question.explanation)}</p></div>`;
}

export function sceneDecorations(questionIndex: number): string {
  return renderCandyRaysDecorations(questionIndex);
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
  const paletteInline = serializeQuizPaletteInlineStyle(visual.palette);
  const timerDuration = Math.max(0.04, revealStart - clipStart);
  return `style="${paletteInline}--question-size:${layout.fontSize}px;--question-leading:${layout.lineHeight};--clip-start:${clipStart.toFixed(3)}s;--scene-duration:${Math.max(0.04, clipEnd - clipStart).toFixed(3)}s;--choices-at:${Math.max(0, choicesStart - clipStart).toFixed(3)}s;--thinking-at:${Math.max(0, thinkingStart - clipStart).toFixed(3)}s;--reveal-at:${Math.max(0, revealStart - clipStart).toFixed(3)}s;--reward-at:${Math.max(0, rewardStart - clipStart).toFixed(3)}s;--choices-duration:${Math.max(0.04, revealStart - choicesStart).toFixed(3)}s;--timer-duration:${timerDuration.toFixed(3)}s;--reveal-duration:${Math.max(0.04, rewardStart - revealStart).toFixed(3)}s;--ambient-phase:${ambientPhaseSeconds("drift", 0, String(clipStart))}s"`;
}

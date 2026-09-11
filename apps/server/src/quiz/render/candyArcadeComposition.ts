import {
  QuizV2Schema,
  type ChannelMascotConfig,
  type DirectorPlan,
  type MascotProfile,
  type QuizTimeline,
  type QuizV2,
  type MascotRenderAspectRatio,
  type IntroOutroTransitionType,
  type ResolvedTransitionInstance,
  resolveTransitionInstance,
  MASCOT_CANVAS_SIZES,
} from "@studio/shared";
import { type ResolveBgmOptions } from "../audio/bgmRegistry.js";
import { resolveCandyArcadeQuestions } from "./candyArcade/candyArcadeQuestionResolution.js";
import { candyArcadeCss, candyArcadeHeroAreaRatio } from "./candyArcade/candyArcadeStyles.js";
import { highlightQuestionMarkup, illustrationDataUri, QUESTION_KEYWORD_STOP_WORDS, esc, escAttr } from "./candyArcade/candyArcadeSvg.js";
import { assetFor, buildBgmClips, buildSfxClips, sfxSource, source } from "./candyArcade/candyArcadeAudio.js";
import { candyArcadeFontReadinessScript } from "./candyArcade/candyArcadeFonts.js";
import {
  introClip,
  outroClip,
  customIntroVideoClip,
  customOutroVideoClip,
  questionClip,
  quizCopy,
  subCompositionMount,
  toSubComposition,
  transitionClip,
  mascotElement,
} from "./candyArcade/candyArcadeClips.js";
import { calculateIntroTransitionTiming } from "./candyArcade/customVideoClips.js";
import { renderChannelBrandMark } from "./candyArcade/channelBrandMark.js";
import { getMascotPreloadTags } from "./mascotStateResolver.js";
import { adaptMascotForPhase, adaptMascotForQuestion } from "./productionMascotRenderer.js";
import type { QuizRenderStyleContext } from "./quizRenderStyleContext.js";

export type CandyArcadeCompositionInput = {
  quiz: QuizV2;
  director: DirectorPlan;
  timeline: QuizTimeline;
  styleContext: QuizRenderStyleContext;
  audioPath: string;
  narrationDurationSeconds: number;
  aspectRatio?: MascotRenderAspectRatio;
  assets?: Record<string, string>;
  bgmOptions?: ResolveBgmOptions;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  premixedAudio?: boolean;
  mascotStyleId?: string | null;
  /** Must match the renderer CLI --fps so markup and encoder stay in sync. */
  fps?: number;
  introVideoPath?: string;
  outroVideoPath?: string;
  transitionType?: IntroOutroTransitionType;
  transitionDurationSeconds?: number;
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
};

export type CandyArcadeCompositionBundle = {
  html: string;
  files: Record<string, string>;
  transitionInstances: Record<string, ResolvedTransitionInstance>;
};

export {
  candyArcadeHeroAreaRatio,
  candyArcadeCss,
  highlightQuestionMarkup,
  illustrationDataUri,
  QUESTION_KEYWORD_STOP_WORDS,
  esc,
  escAttr,
  buildBgmClips,
  buildSfxClips,
  sfxSource,
  source,
  assetFor,
  introClip,
  outroClip,
  customIntroVideoClip,
  customOutroVideoClip,
  questionClip,
  transitionClip,
  mascotElement,
  quizCopy,
  toSubComposition,
  subCompositionMount,
  renderChannelBrandMark,
};

export function buildCandyArcadeComposition(input: CandyArcadeCompositionInput): string {
  return buildCandyArcadeCompositionBundle(input).html;
}

export function buildCandyArcadeCompositionBundle(input: CandyArcadeCompositionInput): CandyArcadeCompositionBundle {
  QuizV2Schema.parse(input.quiz);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const canvas = MASCOT_CANVAS_SIZES[aspectRatio];
  const duration = Math.max(3, input.narrationDurationSeconds, input.timeline.duration_seconds);
  const copy = quizCopy(input.quiz.language);
  const resolvedQuestions = resolveCandyArcadeQuestions({
    quiz: input.quiz,
    director: input.director,
    styleContext: input.styleContext,
    aspectRatio,
  });
  const usedBackgroundStyles = new Set(resolvedQuestions.map(({ style }) => style.backgroundStyle));
  const resolvedQuestionById = new Map(resolvedQuestions.map((item) => [item.question.id, item]));
  const events = input.timeline.events;
  const eventAt = (questionId: string, type: string, fallback: number) =>
    events.find((event) => event.question_id === questionId && event.type === type)?.at_seconds ?? fallback;
  const eventOf = (questionId: string, type: string) => events.find((event) => event.question_id === questionId && event.type === type);
  const firstStart = input.quiz.questions[0] ? eventAt(input.quiz.questions[0].id, "question.enter", 0) : 0;

  const chosenStyleId =
    input.mascotStyleId ??
    (input.quiz as { quiz_config?: { mascot_style_id?: string } }).quiz_config?.mascot_style_id ??
    (input as { quiz_config?: { mascot_style_id?: string } }).quiz_config?.mascot_style_id ??
    (input.mascotConfig as { mascot_style_id?: string })?.mascot_style_id ??
    input.mascot?.active_style_id;

  const transitionInstances: Record<string, ResolvedTransitionInstance> = {};
  const clips: string[] = [];
  if (input.introVideoPath && firstStart > 0.04) {
    const introBoundaryId = "intro";
    const introTransitionType = input.transitionType ?? "stinger_swipe";
    const fpsVal = input.fps ?? 30;
    const timing = calculateIntroTransitionTiming(firstStart, introTransitionType, input.transitionDurationSeconds);
    const startFrames = Math.round(timing.transitionStart * fpsVal);
    const boundaryFrame = Math.round(firstStart * fpsVal);
    const endFramesExclusive = boundaryFrame + Math.max(1, Math.round(timing.transitionDuration * fpsVal));

    if (introTransitionType !== "cut") {
      try {
        const resolvedIntroInstance = input.transitionInstances?.[introBoundaryId] ?? resolveTransitionInstance(
          { id: introTransitionType, durationSeconds: timing.transitionDuration },
          {
            instanceId: introBoundaryId,
            placement: "intro",
            fps: { numerator: fpsVal, denominator: 1 },
            startFrame: startFrames,
            boundaryFrame,
            availableEndFrameExclusive: endFramesExclusive,
            width: canvas.width,
            height: canvas.height,
            fromColor: "#000000",
            toColor: "#000000",
            inkColor: "#ffffff",
          },
        );
        transitionInstances[introBoundaryId] = resolvedIntroInstance;
      } catch {
        // Uncataloged or legacy intro transition type
      }
    }
    clips.push(
      customIntroVideoClip(
        input.introVideoPath,
        firstStart,
        introTransitionType,
        true,
        input.transitionDurationSeconds,
        introBoundaryId,
      ),
    );
  } else if (firstStart > 0.04) {
    const introMascot = adaptMascotForPhase(input.mascot, "intro", chosenStyleId);
    clips.push(introClip(firstStart, input.quiz.questions.length, copy, introMascot, input.mascotConfig, aspectRatio));
  }
  const outroStart = events.find((event) => event.segment_id === "outro")?.at_seconds;

  resolvedQuestions.forEach(({ question, questionIndex, beat, style, layoutResolution, visual }) => {
    const nextQuestion = input.quiz.questions[questionIndex + 1];
    const nextResolvedQuestion = nextQuestion ? resolvedQuestionById.get(nextQuestion.id) : undefined;
    const start = eventAt(question.id, "question.enter", 0);
    const questionNarrationStart =
      events.find(
        (event) =>
          event.question_id === question.id && event.type === "narration.segment" && event.segment_id === question.id + ":question",
      )?.at_seconds ?? start;
    const choicesStart = eventAt(question.id, "choices.enter", start + 1);
    const thinkingStart = eventAt(question.id, "countdown.start", choicesStart + 1);
    const revealStart = eventAt(question.id, "answer.reveal", thinkingStart + 8);
    const rewardStart = eventAt(question.id, "reward.play", revealStart + 0.8);
    const transition = eventOf(question.id, "transition.start");
    const end = Math.min(
      duration,
      nextQuestion ? eventAt(nextQuestion.id, "question.enter", duration) : (transition?.at_seconds ?? outroStart ?? duration),
    );
    const questionMascot = adaptMascotForQuestion(input.mascot, chosenStyleId, questionIndex);
    if (end - start > 0.04)
      clips.push(
        questionClip({
          start,
          questionNarrationStart,
          choicesStart,
          thinkingStart,
          revealStart,
          rewardStart,
          end,
          question,
          archetype: beat.archetype,
          layoutResolution,
          questionIndex,
          count: input.quiz.questions.length,
          visual,
          copy,
          assets: input.assets ?? {},
          isFinal: questionIndex === input.quiz.questions.length - 1,
          mascot: questionMascot,
          mascotConfig: input.mascotConfig,
          aspectRatio,
          mascotEvents: events.filter((event) => event.question_id === question.id),
          thinkingBarStyle: style.thinkingBarStyle,
          questionBoxStyle: style.questionBoxStyle,
          answerCardStyle: style.answerCardStyle,
          counterStyle: style.counterStyle,
          backgroundStyle: style.backgroundStyle,
          channelBrandName: style.channelBrandName,
          styleCatalogRevision: input.styleContext.styleCatalogRevision ?? undefined,
        }),
      );
    if (transition) {
      const boundaryId = (transition.payload?.instance_id as string | undefined) ?? question.id;
      const nextPalette = nextResolvedQuestion?.visual.palette ?? visual.palette;
      const fpsVal = input.fps ?? 30;
      const startFrames = Math.round(transition.at_seconds * fpsVal);
      const durationFrames = Math.round(transition.duration_seconds * fpsVal);
      const endFramesExclusive = startFrames + Math.max(1, durationFrames);
      const boundaryFrame = Math.round((transition.at_seconds + transition.duration_seconds * 0.5) * fpsVal);

      const resolvedInstance = input.transitionInstances?.[boundaryId] ?? resolveTransitionInstance(
        {
          id: visual.transitionId,
          durationSeconds: transition.duration_seconds,
        },
        {
          instanceId: boundaryId,
          placement: "scene",
          fps: { numerator: fpsVal, denominator: 1 },
          startFrame: startFrames,
          boundaryFrame: Math.min(endFramesExclusive - 1, Math.max(startFrames, boundaryFrame)),
          availableEndFrameExclusive: endFramesExclusive,
          width: canvas.width,
          height: canvas.height,
          fromColor: visual.palette.accent,
          toColor: nextPalette.backgroundPrimary,
          inkColor: visual.palette.text,
        },
      );

      transitionInstances[boundaryId] = resolvedInstance;

      clips.push(
        transitionClip({
          start: transition.at_seconds,
          end: transition.at_seconds + transition.duration_seconds,
          visual,
          nextPalette,
          instanceId: boundaryId,
          instance: resolvedInstance,
        }),
      );
    }
  });
  if (typeof outroStart === "number" && outroStart < duration - 0.04) {
    if (input.outroVideoPath) {
      clips.push(customOutroVideoClip(input.outroVideoPath, outroStart, duration - outroStart));
    } else {
      const outroMascot = adaptMascotForPhase(input.mascot, "outro", chosenStyleId);
      clips.push(outroClip(outroStart, duration, input.quiz.questions.length, copy, outroMascot, input.mascotConfig, aspectRatio));
    }
  }

  const scenes = clips.filter(Boolean).map((clip) => toSubComposition(clip, aspectRatio));
  const audioSrc = source(input.audioPath);
  const narrationDuration = input.narrationDurationSeconds > 0 ? input.narrationDurationSeconds : duration;
  const isPremixed = input.premixedAudio ?? input.audioPath.includes("soundtrack");
  const bgmClips = isPremixed
    ? []
    : buildBgmClips(duration, input.assets, outroStart, {
        seed: input.quiz.episode_id,
        ...input.bgmOptions,
      });
  const sfxClips = isPremixed ? [] : buildSfxClips(events, input.assets);

  const mascotPreloads = getMascotPreloadTags(input.mascot, source);

  const audioTags = isPremixed
    ? `<audio id="master-soundtrack" class="clip" data-start="0" data-duration="${duration.toFixed(3)}" data-track-index="1" data-volume="1" src="${audioSrc}"></audio>`
    : [
        `<audio id="quiz-narration" class="clip" data-start="0" data-duration="${narrationDuration.toFixed(3)}" data-track-index="2" data-volume="1" src="${audioSrc}"></audio>`,
        ...bgmClips,
        ...sfxClips,
      ].join("\n");

  const fps = input.fps ?? 30;

  return {
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Candy Arcade Quiz</title>${mascotPreloads ? `\n${mascotPreloads}` : ""}<style>${candyArcadeCss({ aspectRatio, backgroundStyles: usedBackgroundStyles, styleCatalogRevision: input.styleContext.styleCatalogRevision ?? undefined })}</style></head><body><main id="stage" data-composition-id="quiz-v2-candy-arcade" data-no-timeline data-start="0" data-width="${canvas.width}" data-height="${canvas.height}" data-aspect-ratio="${aspectRatio}" data-duration="${duration.toFixed(3)}" data-fps="${fps}">${scenes.map(subCompositionMount).join("\n")}\n${audioTags}</main><script>${candyArcadeFontReadinessScript()}</script></body></html>`,
    files: Object.fromEntries(scenes.map((scene) => [`compositions/${scene.id}.html`, scene.html])),
    transitionInstances,
  };
}

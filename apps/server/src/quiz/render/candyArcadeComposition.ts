import {
  QuizV2Schema,
  type ChannelMascotConfig,
  type DirectorPlan,
  type MascotProfile,
  type QuizAnswerCardStyle,
  type QuizConfig,
  type QuizPaletteId,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
  type QuizTimeline,
  type QuizV2,
} from "@studio/shared";
import { getQuizVisualTemplate } from "../visual/registry.js";
import { type ResolveBgmOptions } from "../audio/bgmRegistry.js";
import { CANDY_ARCADE_LAYOUT_DIMENSIONS, candyArcadeCss, candyArcadeHeroAreaRatio } from "./candyArcade/candyArcadeStyles.js";
import { highlightQuestionMarkup, illustrationDataUri, QUESTION_KEYWORD_STOP_WORDS, esc, escAttr } from "./candyArcade/candyArcadeSvg.js";
import { assetFor, buildBgmClips, buildSfxClips, sfxSource, source } from "./candyArcade/candyArcadeAudio.js";
import { candyArcadeFontReadinessScript } from "./candyArcade/candyArcadeFonts.js";
import {
  introClip,
  outroClip,
  questionClip,
  quizCopy,
  subCompositionMount,
  toSubComposition,
  transitionClip,
  mascotElement,
} from "./candyArcade/candyArcadeClips.js";
import { getMascotPreloadTags } from "./mascotStateResolver.js";

export type CandyArcadeCompositionInput = {
  quiz: QuizV2;
  director: DirectorPlan;
  timeline: QuizTimeline;
  theme: QuizConfig["visual_theme"];
  audioPath: string;
  narrationDurationSeconds: number;
  assets?: Record<string, string>;
  bgmOptions?: ResolveBgmOptions;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  defaultThinkingBarStyle?: QuizThinkingBarStyle | null;
  defaultQuestionBoxStyle?: QuizQuestionBoxStyle | null;
  defaultAnswerCardStyle?: QuizAnswerCardStyle | null;
  defaultCounterStyle?: QuizQuestionCounterStyle | null;
  defaultPaletteId?: QuizPaletteId | null;
};

export type CandyArcadeCompositionBundle = {
  html: string;
  files: Record<string, string>;
};

export {
  CANDY_ARCADE_LAYOUT_DIMENSIONS,
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
  questionClip,
  transitionClip,
  mascotElement,
  quizCopy,
  toSubComposition,
  subCompositionMount,
};

export function buildCandyArcadeComposition(input: CandyArcadeCompositionInput): string {
  return buildCandyArcadeCompositionBundle(input).html;
}

export function buildCandyArcadeCompositionBundle(input: CandyArcadeCompositionInput): CandyArcadeCompositionBundle {
  QuizV2Schema.parse(input.quiz);
  const duration = Math.max(3, input.narrationDurationSeconds, input.timeline.duration_seconds);
  const copy = quizCopy(input.quiz.language);
  const template = getQuizVisualTemplate(input.theme);
  const events = input.timeline.events;
  const eventAt = (questionId: string, type: string, fallback: number) =>
    events.find((event) => event.question_id === questionId && event.type === type)?.at_seconds ?? fallback;
  const eventOf = (questionId: string, type: string) => events.find((event) => event.question_id === questionId && event.type === type);
  const firstStart = input.quiz.questions[0] ? eventAt(input.quiz.questions[0].id, "question.enter", 0) : 0;
  const clips: string[] = [introClip(firstStart, input.quiz.questions.length, copy, input.mascot, input.mascotConfig)];
  const outroStart = events.find((event) => event.type === "narration.segment" && event.segment_id === "outro")?.at_seconds;
  let previousPaletteId: string | undefined;

  input.quiz.questions.forEach((question, index) => {
    const beat = input.director.beats.find((candidate) => candidate.question_id === question.id);
    if (!beat) return;
    const requestedPalette =
      beat.palette_id && beat.palette_id !== "auto"
        ? beat.palette_id
        : input.defaultPaletteId && input.defaultPaletteId !== "auto"
          ? input.defaultPaletteId
          : beat.palette_id;

    const visual = template.resolveScene({
      question,
      questionIndex: index,
      totalQuestions: input.quiz.questions.length,
      archetype: beat.archetype,
      requestedPalette,
      requestedLayout: beat.layout_id,
      requestedMotion: beat.motion_id,
      requestedTransition: beat.transition_id,
      previousPaletteId,
    });
    previousPaletteId = visual.palette.id;
    const nextQuestion = input.quiz.questions[index + 1];
    const start = eventAt(question.id, "question.enter", 0);
    const choicesStart = eventAt(question.id, "choices.enter", start + 1);
    const thinkingStart = eventAt(question.id, "countdown.start", choicesStart + 1);
    const revealStart = eventAt(question.id, "answer.reveal", thinkingStart + 8);
    const rewardStart = eventAt(question.id, "reward.play", revealStart + 0.8);
    const transition = eventOf(question.id, "transition.start");
    const end = Math.min(
      duration,
      nextQuestion ? eventAt(nextQuestion.id, "question.enter", duration) : (transition?.at_seconds ?? outroStart ?? duration),
    );
    const thinkingBarStyle =
      beat.thinking_bar_style && beat.thinking_bar_style !== "auto"
        ? beat.thinking_bar_style
        : input.defaultThinkingBarStyle ?? "auto";
    const questionBoxStyle =
      beat.question_box_style && beat.question_box_style !== "auto"
        ? beat.question_box_style
        : input.defaultQuestionBoxStyle ?? "auto";
    const answerCardStyle =
      beat.answer_card_style && beat.answer_card_style !== "auto"
        ? beat.answer_card_style
        : input.defaultAnswerCardStyle ?? "auto";
    const counterStyle =
      beat.question_counter_style && beat.question_counter_style !== "auto"
        ? beat.question_counter_style
        : input.defaultCounterStyle ?? "auto";
    if (end - start > 0.04)
      clips.push(
        questionClip({
          start,
          choicesStart,
          thinkingStart,
          revealStart,
          rewardStart,
          end,
          question,
          questionIndex: index,
          count: input.quiz.questions.length,
          visual,
          copy,
          assets: input.assets ?? {},
          isFinal: index === input.quiz.questions.length - 1,
          mascot: input.mascot,
          mascotConfig: input.mascotConfig,
          thinkingBarStyle,
          questionBoxStyle,
          answerCardStyle,
          counterStyle,
        }),
      );
    if (transition)
      clips.push(
        transitionClip({
          start: transition.at_seconds,
          end: transition.at_seconds + transition.duration_seconds,
          visual,
          nextPalette: nextQuestion
            ? template.resolveScene({
                question: nextQuestion,
                questionIndex: index + 1,
                totalQuestions: input.quiz.questions.length,
                archetype:
                  input.director.beats.find((candidate) => candidate.question_id === nextQuestion.id)?.archetype ?? "text_multiple_choice",
                requestedPalette: input.director.beats.find((candidate) => candidate.question_id === nextQuestion.id)?.palette_id ?? "auto",
                requestedLayout: "auto",
                requestedMotion: "auto",
                requestedTransition: "auto",
                previousPaletteId: visual.palette.id,
              }).palette
            : visual.palette,
        }),
      );
  });
  if (typeof outroStart === "number" && outroStart < duration - 0.04)
    clips.push(outroClip(outroStart, duration, input.quiz.questions.length, copy, input.mascot, input.mascotConfig));

  const scenes = clips.filter(Boolean).map(toSubComposition);
  const audioSrc = source(input.audioPath);
  const narrationDuration = input.narrationDurationSeconds > 0 ? input.narrationDurationSeconds : duration;
  const bgmClips = buildBgmClips(duration, input.assets, outroStart, {
    seed: input.quiz.episode_id,
    ...input.bgmOptions,
  });
  const sfxClips = buildSfxClips(events, input.assets);
  const mascotPreloads = getMascotPreloadTags(input.mascot, source);
  const audioTags = [
    `<audio id="quiz-narration" class="clip" data-start="0" data-duration="${narrationDuration.toFixed(3)}" data-track-index="2" data-volume="1" src="${audioSrc}"></audio>`,
    ...bgmClips,
    ...sfxClips,
  ].join("\n");

  return {
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Candy Arcade Quiz</title>${mascotPreloads ? `\n${mascotPreloads}` : ""}<style>${candyArcadeCss()}</style></head><body><main id="stage" data-composition-id="quiz-v2-candy-arcade" data-no-timeline data-start="0" data-width="1920" data-height="1080" data-duration="${duration.toFixed(3)}" data-fps="30">${scenes.map(subCompositionMount).join("\n")}\n${audioTags}</main><script>${candyArcadeFontReadinessScript()}</script></body></html>`,
    files: Object.fromEntries(scenes.map((scene) => [`compositions/${scene.id}.html`, scene.html])),
  };
}

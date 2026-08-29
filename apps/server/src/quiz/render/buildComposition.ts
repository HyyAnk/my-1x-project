import { pathToFileURL } from "node:url";
import {
  QuizV2Schema,
  quizChoiceCountForFormat,
  type ChannelMascotConfig,
  type DirectorPlan,
  type MascotProfile,
  type QuizAnswerCardStyle,
  type QuizConfig,
  type QuizPaletteId,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizQuestionFormat,
  type QuizThinkingBarStyle,
  type QuizTimeline,
  type QuizV2,
  MASCOT_CANVAS_SIZES,
  type MascotRenderAspectRatio,
  type Scene,
} from "@studio/shared";
import {
  buildCandyArcadeComposition,
  buildCandyArcadeCompositionBundle,
  type CandyArcadeCompositionBundle,
} from "./candyArcadeComposition.js";
import type { ResolveBgmOptions } from "../audio/bgmRegistry.js";
import { candyArcadeFontFaceCss, candyArcadeFontReadinessScript } from "./candyArcade/candyArcadeFonts.js";

export function buildQuizComposition(
  config: { question_count: number; quiz_format: string; age_band: string; visual_theme: string },
  scenes: Scene[],
  audioPath: string,
  narrationDurationSeconds?: number,
  options?: {
    assets?: Record<string, string>;
    bgmOptions?: ResolveBgmOptions;
    aspectRatio?: MascotRenderAspectRatio;
    mascot?: MascotProfile | null;
    mascotConfig?: ChannelMascotConfig | null;
  },
): string {
  const normalizedFormat = (config.quiz_format === "knowledge" ? "multiple_choice" : config.quiz_format) as QuizQuestionFormat;
  const aspectRatio = options?.aspectRatio ?? "16:9";
  const canvas = MASCOT_CANVAS_SIZES[aspectRatio];
  const requiredChoiceCount = quizChoiceCountForFormat(normalizedFormat);
  for (const scene of scenes) {
    if (!scene.quiz || !scene.quiz.question_number || ["intro", "outro"].includes(scene.quiz.phase)) continue;
    if (scene.quiz.choices.length !== requiredChoiceCount) {
      throw new Error(
        `QUIZ_CHOICE_COUNT_INVALID: Question ${scene.quiz.question_number} has ${scene.quiz.choices.length} choices; exactly ${requiredChoiceCount} required`,
      );
    }
  }
  const sceneDuration = Math.max(
    0.1,
    scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0),
  );
  const totalDuration = Math.max(3, narrationDurationSeconds ?? sceneDuration);
  const durationScale = totalDuration / sceneDuration;
  const audioSrc = audioSource(audioPath);
  let cursor = 0;
  const clips = scenes
    .map((scene, index) => {
      const start = cursor;
      const scaledDuration = scene.duration_seconds * durationScale;
      cursor += scaledDuration;
      const isWelcome = index === 0 || /welcome|intro|opening/i.test(scene.sequence_title);
      const quiz = scene.quiz;
      const questionNumber = quiz?.question_number ?? Math.min(config.question_count, Math.max(1, index));
      const label = isWelcome ? "READY TO PLAY" : "QUESTION " + questionNumber;
      const safeDialogue = escapeHtml((quiz?.explanation || scene.dialogue).replace(/\s+/g, " ").trim().slice(0, 240));
      const safeTitle = escapeHtml(quiz?.question || scene.sequence_title || label);
      const choices = (quiz?.choices.length ? quiz.choices : ["A", "B", "C"])
        .map(
          (choice, choiceIndex) =>
            '<div class="answer-choice answer-' +
            (choiceIndex + 1) +
            '"><b>' +
            String.fromCharCode(65 + choiceIndex) +
            "</b><span>" +
            escapeHtml(choice) +
            "</span></div>",
        )
        .join("");
      const phaseLabel = quiz?.phase === "reveal" ? "ANSWER REVEAL" : quiz?.phase === "explanation" ? "WHY IT'S TRUE" : label;
      return (
        '<section id="quiz-scene-' +
        (index + 1) +
        '" class="clip quiz-scene ' +
        (isWelcome ? "welcome" : "") +
        '" data-start="' +
        start.toFixed(3) +
        '" data-duration="' +
        scaledDuration.toFixed(3) +
        '" data-track-index="0"><div class="scene-kicker">' +
        phaseLabel +
        "</div><h1>" +
        safeTitle +
        '</h1><div class="answer-grid">' +
        choices +
        '</div><p class="voice-line">' +
        safeDialogue +
        '</p><div class="countdown"><span></span><span></span><span></span></div><div class="sparkle sparkle-one" data-layout-ignore aria-hidden="true">✦</div><div class="sparkle sparkle-two" data-layout-ignore aria-hidden="true">✦</div></section>'
      );
    })
    .join("\n");
  const css =
    (
      candyArcadeFontFaceCss("render") +
      ':root{color-scheme:dark;--ink:#18212b;--cream:#fff8e8;--yellow:#ffd65a;--coral:#ff7866;--mint:#73d6bd;--blue:#78b9ff}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--ink);font-family:Arial,sans-serif}body{color:var(--cream)}#stage{position:relative;width:1920px;height:1080px;overflow:hidden;background:radial-gradient(circle at 18% 10%,#31445c 0,#18212b 45%,#111820 100%)}#stage:before{content:"";position:absolute;inset:0;opacity:.17;background-image:radial-gradient(#fff 1px,transparent 1px);background-size:34px 34px}section.clip{position:absolute;inset:0;padding:125px 160px 100px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}.scene-kicker{padding:14px 24px;border:4px solid var(--yellow);border-radius:999px;color:var(--yellow);font-size:34px;font-weight:800;letter-spacing:.14em}section.clip h1{max-width:1420px;margin:36px 0 42px;color:var(--cream);font-family:"SVN-Hello Headline",Arial,sans-serif;font-size:82px;line-height:1.04;letter-spacing:-.04em;text-wrap:balance}.answer-grid{display:grid;grid-template-columns:repeat(3,260px);gap:24px;margin-bottom:38px}.answer-grid div{min-width:220px;display:grid;gap:8px;padding:22px 16px;border-radius:26px;color:var(--ink);font-size:58px;font-weight:900}.answer-grid div span{font-size:22px;line-height:1.15;font-weight:700}.answer-grid div:nth-child(1){background:var(--coral)}.answer-grid div:nth-child(2){background:var(--mint)}.answer-grid div:nth-child(3){background:var(--blue)}.voice-line{max-width:1180px;margin:0;color:#dce7ef;font-size:31px;line-height:1.35}.countdown{display:flex;gap:14px;margin-top:34px}.countdown span{width:18px;height:18px;border-radius:50%;background:var(--yellow)}.sparkle{position:absolute;color:var(--yellow);font-size:88px}.sparkle-one{top:120px;left:190px}.sparkle-two{right:210px;bottom:150px;color:var(--coral)}'
    ).replace(
      "#stage{position:relative;width:1920px;height:1080px;",
      `#stage{position:relative;width:${canvas.width}px;height:${canvas.height}px;`,
    ) + (aspectRatio === "9:16" ? legacyPortraitCss : "");
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Quiz composition</title><style>' +
    css +
    '</style></head><body><main id="stage" data-composition-id="quiz" data-no-timeline data-start="0" data-width="' +
    canvas.width +
    '" data-height="' +
    canvas.height +
    '" data-aspect-ratio="' +
    aspectRatio +
    '" data-duration="' +
    totalDuration.toFixed(3) +
    '" data-fps="30">' +
    clips +
    '<audio id="quiz-narration" class="clip" data-start="0" data-duration="' +
    totalDuration.toFixed(3) +
    '" data-track-index="2" data-volume="1" src="' +
    audioSrc +
    '"></audio></main><script>' +
    candyArcadeFontReadinessScript() +
    "</script></body></html>"
  );
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export type QuizV2CompositionInput = {
  quiz: QuizV2;
  director: DirectorPlan;
  timeline: QuizTimeline;
  theme: QuizConfig["visual_theme"];
  audioPath: string;
  narrationDurationSeconds: number;
  aspectRatio?: MascotRenderAspectRatio;
  assets?: Record<string, string>;
  bgmOptions?: ResolveBgmOptions;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  defaultThinkingBarStyle?: QuizThinkingBarStyle | null;
  defaultQuestionBoxStyle?: QuizQuestionBoxStyle | null;
  defaultAnswerCardStyle?: QuizAnswerCardStyle | null;
  defaultCounterStyle?: QuizQuestionCounterStyle | null;
  defaultPaletteId?: QuizPaletteId | null;
  premixedAudio?: boolean;
  channelBrandName?: string | null;
};

/**
 * Builds a deterministic V2 composition directly from semantic facts and the
 * compiled timeline. The legacy scene renderer above stays intact for V1.
 */
export function buildQuizV2Composition(input: QuizV2CompositionInput): string {
  QuizV2Schema.parse(input.quiz);
  return buildCandyArcadeComposition(input);
}

export function buildQuizV2CompositionBundle(input: QuizV2CompositionInput): CandyArcadeCompositionBundle {
  QuizV2Schema.parse(input.quiz);
  return buildCandyArcadeCompositionBundle(input);
}

function audioSource(value: string): string {
  return escapeHtml(value.startsWith("./") || value.startsWith("../") ? value : pathToFileURL(value).href);
}

const legacyPortraitCss =
  '#stage[data-aspect-ratio="9:16"] section.clip{padding:96px 64px 80px}#stage[data-aspect-ratio="9:16"] section.clip h1{max-width:900px;font-size:72px}#stage[data-aspect-ratio="9:16"] .answer-grid{grid-template-columns:1fr;gap:22px}#stage[data-aspect-ratio="9:16"] .voice-line{max-width:860px;font-size:28px}';

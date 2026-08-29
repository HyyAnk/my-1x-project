import { SandboxPreviewInputSchema, type MascotProfile, type SandboxPreviewInput, type SandboxPreviewResponse } from "@studio/shared";
import { candyArcadePalettes, textLayout } from "../visual/candyArcade.js";
import { evaluateContrast } from "../visual/contrastCalculator.js";
import {
  getAnswerCardsCss,
  getCounterBadgesCss,
  getQuestionBoxesCss,
  getThinkingBarsCss,
  resolveAnswerCardVariant,
  resolveCounterBadgeVariant,
  resolveQuestionBoxVariant,
  resolveThinkingBarVariant,
} from "../visual/elements/index.js";
import { candyArcadeCss, illustrationDataUri, highlightQuestionMarkup } from "./candyArcadeComposition.js";
import { MASCOT_CANVAS_SIZES } from "@studio/shared";
import { esc, escAttr } from "./candyArcade/candyArcadeSvg.js";
import { renderPreviewMascotHtmlLayer } from "./previewMascotRenderer.js";
import { candyArcadeFontReadinessScript } from "./candyArcade/candyArcadeFonts.js";
import { renderChannelBrandMark } from "./candyArcade/channelBrandMark.js";
import { renderQuizLayoutBody } from "./layouts/registry.js";

export function buildSandboxComposition(input: SandboxPreviewInput, mascotProfile?: MascotProfile | null): SandboxPreviewResponse {
  input = SandboxPreviewInputSchema.parse(input);
  const aspectRatio = input.aspect_ratio;
  const canvas = MASCOT_CANVAS_SIZES[aspectRatio];
  const palette = candyArcadePalettes.find((p) => p.id === input.palette_id) ?? candyArcadePalettes[0];
  const questionText = input.question_text || "Which planet in our solar system has the most prominent rings?";
  const questionLayout = textLayout(questionText, "question");
  const choices = input.choices;
  const correctIdx = Math.max(0, Math.min(choices.length - 1, input.correct_choice_index ?? 1));
  const questionNumber = input.question_number ?? 1;
  const totalQuestions = input.total_questions ?? 10;
  const layoutId = input.layout_id;

  // Phase & Timeline Scrubbing
  let phase = input.phase ?? "thinking";

  if (input.timeline_time_seconds !== undefined) {
    const t = input.timeline_time_seconds;
    if (t < 1.2) {
      phase = "question";
    } else if (t < 2.5) {
      phase = "choices";
    } else if (t < 7.5) {
      phase = "thinking";
    } else if (t < 8.8) {
      phase = "reveal";
    } else {
      phase = "explain";
    }
  }

  // Timing constants based on phase
  const choicesAt = phase === "question" ? 999 : 0;
  const revealAt = phase === "reveal" || phase === "explain" ? 0 : 999;
  const rewardAt = phase === "explain" ? 0 : 999;

  // 1. Question Box Variant
  const qbVariant = resolveQuestionBoxVariant(input.question_box_style);
  const qbHtml = qbVariant.renderHtml({
    question: questionText,
    tier: questionLayout.tier,
    questionNumber,
    paletteAccent: palette.accent,
    highlightedHtml: highlightQuestionMarkup(questionText, "planet rings saturn space"),
  });

  // 2. Counter Badge Variant
  const cbVariant = resolveCounterBadgeVariant(input.counter_style);
  const cbHtml = cbVariant.renderHtml({
    questionNumber,
    totalQuestions,
    paletteAccent: palette.accent,
    isFinal: questionNumber >= totalQuestions,
  });

  // 3. Thinking Bar Variant
  const tbVariant = resolveThinkingBarVariant(input.thinking_bar_style);
  const tbHtml =
    phase === "thinking" || phase === "choices"
      ? tbVariant.renderHtml({
          clipStart: 0,
          revealStart: 10,
          thinkingStart: 0,
          duration: 10,
          questionNumber,
          paletteAccent: palette.accent,
        })
      : "";

  // 4. Answer Cards Variant
  const acVariant = resolveAnswerCardVariant(input.answer_card_style);
  const answerCardsHtml = acVariant.renderHtml({
    choices,
    correctIndex: correctIdx,
    phase,
    layoutId,
    paletteAccent: palette.accent,
  });

  const answerGridOpacity = phase === "question" ? "0" : "1";
  const answerGridStyle = `opacity:${answerGridOpacity};`;

  // 5. Fact Card for Explain Phase
  const factCardText = input.fact_card_text || "Hành tinh này có các đặc điểm kỳ thú và hệ thống vành đai ấn tượng nhất trong vũ trụ!";
  const factCardHtml =
    phase === "explain"
      ? `
    <div class="fact-card sandbox-explain-card" style="opacity: 1; animation: none; transform: translateX(-50%);">
      <p>${esc(factCardText)}</p>
    </div>
  `
      : "";

  // 6. Hero Artwork
  const heroImgUri = illustrationDataUri(questionText, questionNumber);

  // 7. Mascot HTML
  let mascotHtml = "";
  const mascotEnabled = input.mascot_enabled !== false && input.mascot_id !== "none";
  const mascotPhase = input.mascot_phase ?? phase;
  const mascotAction = input.mascot_action || (mascotPhase === "reveal" ? "celebrate" : mascotPhase === "explain" ? "point" : "thinking");
  const mascotPos = input.mascot_position || "bottom_left";
  const mascotScale = input.mascot_scale || 1.0;
  const mascotTimelineTime = input.mascot_timeline_time_seconds ?? input.timeline_time_seconds ?? previewTimeForPhase(mascotPhase);

  if (mascotEnabled && mascotProfile) {
    mascotHtml = renderPreviewMascotHtmlLayer(
      mascotProfile,
      {
        enabled: input.mascot_enabled,
        position: mascotPos,
        scale: mascotScale,
        offset_x: input.mascot_offset_x || 0,
        offset_y: input.mascot_offset_y || 0,
        flip_x: input.mascot_flip_x,
        show_in_intro: input.mascot_show_in_intro,
        show_in_outro: input.mascot_show_in_outro,
        show_in_question: input.mascot_show_in_question,
      },
      {
        aspectRatio,
        phase: mascotPhase,
        timelineTimeSeconds: mascotTimelineTime,
        revealOutcome: mascotPhase === "reveal" ? input.mascot_reveal_outcome : null,
        actionOverride: mascotAction,
        playing: input.mascot_playing,
      },
    );
  }

  const hasMascot = Boolean(mascotHtml);
  const mascotClass = hasMascot ? "has-mascot" : "";
  const brandMarkHtml = renderChannelBrandMark(input.channel_brand_name, hasMascot, aspectRatio);

  // 8. Reward FX
  const rewardFxHtml =
    phase === "reveal" || phase === "explain"
      ? `
    <div class="reward-fx reward-small" style="opacity: 1;" data-layout-ignore aria-hidden="true">
      <i style="left: 5%; top: 34%;">✦</i>
      <i style="right: 6%; top: 38%;">★</i>
      <i style="left: 9%; bottom: 18%;">✦</i>
      <i style="right: 10%; bottom: 16%;">★</i>
    </div>
  `
      : "";

  // 9. Stage Layout Rendering
  const stageContent = renderQuizLayoutBody(layoutId, {
    questionBoxHtml: qbHtml,
    heroHtml: `<figure class="image-card hero-image" data-layout-allow-overflow><img src="${heroImgUri}" alt="${escAttr(questionText)}"><span class="image-shine"></span></figure>`,
    textChoicesHtml: `<div class="answer-grid answer-count-${choices.length}" style="${answerGridStyle}">${answerCardsHtml}</div>`,
    visualChoicesHtml: renderSandboxVisualChoices(choices, correctIdx, phase, questionNumber, answerGridStyle),
    phaseHtml: `${tbHtml}${factCardHtml}`,
  });

  // 10. Full Production HyperFrames HTML Document
  const fullHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="/">
  <title>HyperFrames Sandbox Live Preview</title>
  <style>
    ${candyArcadeCss({ fontMode: "preview", aspectRatio })}
    ${getQuestionBoxesCss()}
    ${getCounterBadgesCss()}
    ${getThinkingBarsCss()}
    ${getAnswerCardsCss()}

    /* Live Sandbox Phase Styling Overrides */
    .sandbox-preview-stage {
      --clip-start: 0s;
      --scene-duration: 10s;
      --choices-at: ${choicesAt}s;
      --reveal-at: ${revealAt}s;
      --reward-at: ${rewardAt}s;
      --timer-duration: 10s;
      --bg-primary: ${palette.backgroundPrimary};
      --bg-secondary: ${palette.backgroundSecondary};
      --accent: ${palette.accent};
      --surface-accent: ${palette.surfaceAccent};
      --on-accent: ${palette.onAccent};
      --answer-badge: ${palette.answerBadge};
      --correct: ${palette.correct};
      --incorrect: ${palette.incorrect};
      --surface: ${palette.surface};
      --text: ${palette.text};
      --muted: ${palette.muted};
      --question-size: ${questionLayout.fontSize}px;
      --question-leading: ${questionLayout.lineHeight};
      position: absolute;
      inset: 0;
      width: ${canvas.width}px;
      height: ${canvas.height}px;
      overflow: hidden;
    }

    .sandbox-preview-stage .thinking-bar {
      opacity: 1;
      animation: none;
    }

  </style>
</head>
<body>
  <main id="stage" data-composition-id="quiz-v2-candy-arcade" data-no-timeline data-start="0" data-width="${canvas.width}" data-height="${canvas.height}" data-aspect-ratio="${aspectRatio}" data-duration="10" data-fps="30">
    <section class="clip candy-scene quiz-question-clip layout-${layoutId} ${mascotClass} sandbox-preview-stage ${questionNumber >= totalQuestions ? "is-final-scene" : ""}">
      <div class="bg-gradient"></div>
      <div class="bg-rays"></div>
      <div class="bg-pattern pattern-circles"></div>
      <div class="bg-pattern pattern-sprinkles"></div>
      <div class="bg-shape shape-a" data-layout-allow-overflow></div>
      <div class="bg-shape shape-b" data-layout-allow-overflow></div>
      <div class="scene-decor">
        <i class="decor-1">✦</i><i class="decor-2">★</i><i class="decor-3">✦</i><i class="decor-4">✿</i>
        <i class="decor-5">✦</i><i class="decor-6">★</i><i class="decor-7">✦</i>
      </div>

      <header class="game-header" data-layout-allow-occlusion>
        ${cbHtml}
      </header>

      <div class="game-stage" data-layout-allow-overflow>
        ${stageContent}
      </div>

      ${brandMarkHtml}
      ${mascotHtml}
      ${rewardFxHtml}
    </section>
  </main>
  <script>${candyArcadeFontReadinessScript()}</script>
</body>
</html>`;

  const contrastReport = evaluateContrast(palette.text, palette.surface, 4.5);

  return {
    html: fullHtml,
    css: candyArcadeCss({ fontMode: "preview", aspectRatio }),
    contrast_report: contrastReport,
  };
}

function renderSandboxVisualChoices(
  choices: string[],
  correctIndex: number,
  phase: SandboxPreviewInput["phase"],
  questionNumber: number,
  style: string,
): string {
  const cards = choices.map((choice, index) => renderSandboxVisualChoice(choice, index, correctIndex, phase, questionNumber)).join("");
  return `<div class="visual-answer-grid" style="${style}">${cards}</div>`;
}

function renderSandboxVisualChoice(
  choice: string,
  index: number,
  correctIndex: number,
  phase: SandboxPreviewInput["phase"],
  questionNumber: number,
): string {
  const revealed = phase === "reveal" || phase === "explain";
  const isCorrect = index === correctIndex;
  const state = revealed ? (isCorrect ? "answer-correct" : "answer-incorrect") : "answer-normal";
  const resultIcon = revealed
    ? isCorrect
      ? '<i class="answer-check" style="opacity:1;">✓</i>'
      : '<i class="answer-cross" style="opacity:1;">✕</i>'
    : "";
  return `<div class="visual-answer-card ${state}"><figure class="image-card option-image"><img src="${illustrationDataUri(choice, questionNumber + index + 1)}" alt="${escAttr(choice)}"><span class="image-shine"></span></figure><div class="visual-answer-label"><b>${String.fromCharCode(65 + index)}</b><span>${esc(choice)}</span>${resultIcon}</div></div>`;
}

function previewTimeForPhase(phase: "intro" | "question" | "choices" | "thinking" | "reveal" | "explain" | "outro"): number {
  const times = { intro: 0.5, question: 0.5, choices: 2, thinking: 5, reveal: 8, explain: 9.5, outro: 9.5 } as const;
  return times[phase];
}

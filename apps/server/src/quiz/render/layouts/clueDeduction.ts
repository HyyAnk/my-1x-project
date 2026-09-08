import type { QuizLayoutRenderDefinition } from "./types.js";
import { getClueDeductionCss } from "./styles/clueDeductionStyles.js";

export const clueDeductionLayout = {
  id: "clue_deduction",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}` +
    `<div class="clue-deduction-stage-wrapper" data-layout-allow-overflow>` +
    `<div class="clue-stage-backdrop"></div>` +
    `<div class="clue-dossier-bar">` +
    `<div class="dossier-case-badge"><span class="dossier-icon" aria-hidden="true">🔍</span> EVIDENCE DOSSIER</div>` +
    `<div class="clue-steps-tracker" aria-label="Progressive Clues">` +
    `<span class="clue-step-pip step-1 active"><i class="pip-dot"></i> CLUE 1</span>` +
    `<span class="clue-step-pip step-2"><i class="pip-dot"></i> CLUE 2</span>` +
    `<span class="clue-step-pip step-3"><i class="pip-dot"></i> CLUE 3</span>` +
    `</div>` +
    `<div class="dossier-status-chip">` +
    `<span class="status-text status-active">INVESTIGATING</span>` +
    `<span class="status-text status-solved">CASE SOLVED</span>` +
    `</div>` +
    `</div>` +
    `<div class="clue-card-stage">` +
    `<div class="clue-hero-frame">` +
    `<span class="evidence-bracket bracket-tl" aria-hidden="true"></span>` +
    `<span class="evidence-bracket bracket-tr" aria-hidden="true"></span>` +
    `<span class="evidence-bracket bracket-bl" aria-hidden="true"></span>` +
    `<span class="evidence-bracket bracket-br" aria-hidden="true"></span>` +
    `<div class="clue-loupe-reticle" data-layout-ignore aria-hidden="true">` +
    `<div class="loupe-ring"></div>` +
    `<div class="loupe-crosshair"></div>` +
    `<div class="loupe-beam"></div>` +
    `</div>` +
    `${slots.heroHtml}` +
    `<div class="clue-glow-ring" data-layout-ignore aria-hidden="true"></div>` +
    `</div>` +
    `</div>` +
    `${slots.choicesHtml}` +
    `</div>` +
    `<div class="phase-region">${slots.phaseHtml}</div>`,

  css: (aspectRatio) => getClueDeductionCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;

import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { getMysteryRevealCss } from "./styles/mysteryRevealStyles.js";

export const mysteryRevealLayout = {
  id: "mystery_reveal",
  renderBody: (slots) =>
    renderQuizFrameBody(
      slots,
      `<div class="mystery-stage-wrapper" data-layout-allow-overflow>` +
        `<div class="mystery-stage-backdrop"></div>` +
        `<div class="mystery-hero-stage">` +
        `<div class="mystery-layer mystery-mosaic-layer">${slots.heroHtml}</div>` +
        `<div class="mystery-layer mystery-revealed-layer">` +
        `<div class="mystery-revealed-inner">${slots.heroHtml}</div>` +
        `</div>` +
        `<div class="mystery-scanner-bar" data-layout-ignore aria-hidden="true">` +
        `<div class="scanner-beam"></div>` +
        `<div class="scanner-flare"></div>` +
        `</div>` +
        `</div>` +
        `</div>` +
        `${slots.choicesHtml}` +
        `<svg class="mystery-svg-filters" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;" aria-hidden="true">` +
        `<defs>` +
        `<filter id="mystery-mosaic-filter" x="0%" y="0%" width="100%" height="100%">` +
        `<feFlood x="2" y="2" height="2" width="2"/>` +
        `<feComposite width="22" height="22"/>` +
        `<feTile result="tile"/>` +
        `<feComposite in="SourceGraphic" in2="tile" operator="in"/>` +
        `<feMorphology operator="dilate" radius="11"/>` +
        `</filter>` +
        `</defs>` +
        `</svg>`,
    ),

  css: (aspectRatio) => getMysteryRevealCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;

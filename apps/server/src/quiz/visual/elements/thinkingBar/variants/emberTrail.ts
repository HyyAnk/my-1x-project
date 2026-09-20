import { calculateThinkingBarTiming, type ThinkingBarRenderInput, type ThinkingBarVariant } from "../types.js";
import { emberTrailBaseCss } from "./emberTrailBaseStyles.js";
import { emberTrailEffectsCss } from "./emberTrailEffects.js";
import { emberTrailMotionCss } from "./emberTrailMotion.js";

const HEATLINE_HTML = `<span class="ember-trail-heatline" data-layout-ignore aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`;
const FLAMES_HTML = `<span class="ember-flames" data-layout-ignore aria-hidden="true"><i></i><i></i></span>`;
const EMBER_PARTICLES_HTML = `<span class="ember-particles" data-layout-ignore aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
const COUNTDOWN_HTML = `<b class="marker-val val-query" data-layout-allow-overlap>?</b><b class="marker-val val-5" data-layout-allow-overlap>5</b><b class="marker-val val-4" data-layout-allow-overlap>4</b><b class="marker-val val-3" data-layout-allow-overlap>3</b><b class="marker-val val-2" data-layout-allow-overlap>2</b><b class="marker-val val-1" data-layout-allow-overlap>1</b>`;

export const emberTrailVariant: ThinkingBarVariant = {
  id: "flame_fuse",
  displayName: "Ember Trail",
  description: "A glowing ember burns across a braided fuse, leaving a charred trail with a clear 5–1 countdown.",
  renderHtml(input: ThinkingBarRenderInput): string {
    const timing = calculateThinkingBarTiming(input);
    return `<div class="thinking-bar thinking-bar-flame-fuse" ${timing.styleAttr}><div class="ember-trail-track" role="img" aria-label="Quiz countdown from 5 to 1" data-layout-allow-overflow><div class="ember-trail-bed" aria-hidden="true"><div class="ember-trail-char"></div><div class="ember-trail-rope"></div>${HEATLINE_HTML}</div><span class="ember-trail-marker" aria-hidden="true" data-layout-allow-occlusion data-layout-allow-overlap><span class="ember-trail-aura"></span>${FLAMES_HTML}<span class="ember-core"><i class="ember-hotspot"></i></span>${EMBER_PARTICLES_HTML}${COUNTDOWN_HTML}</span></div></div>`;
  },
  renderCss(): string {
    return `${emberTrailBaseCss()}\n${emberTrailEffectsCss()}\n${emberTrailMotionCss()}`;
  },
};

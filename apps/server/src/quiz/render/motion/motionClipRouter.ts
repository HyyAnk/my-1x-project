import type { MascotRenderAspectRatio, MotionTemplateOptions } from "@studio/shared";
import { renderKineticPunchIntro } from "./templates/kineticPunch/index.js";
import { renderCyberNeonIntro } from "./templates/cyberNeon/index.js";
import { renderMinimalSleekIntro } from "./templates/minimalSleek/index.js";
import { renderInteractiveCtaOutro } from "./templates/interactiveCta/index.js";
import { renderScorecardRecapOutro } from "./templates/scorecardRecap/index.js";

export interface MotionClipDispatchInput {
  topicTitle?: string;
  channelName?: string;
  startSeconds?: number;
  durationSeconds?: number;
  aspectRatio?: MascotRenderAspectRatio;
  options?: MotionTemplateOptions;
  mascotHtml?: string;
  brandLogoHtml?: string;
}

/**
 * Dispatches to the appropriate native motion intro template renderer.
 * Automatically falls back to Kinetic Punch if the requested ID is unrecognized.
 */
export function renderMotionIntroClip(templateId: string | undefined, input: MotionClipDispatchInput): string {
  switch (templateId) {
    case "cyber_neon":
      return renderCyberNeonIntro(input);
    case "minimal_sleek":
      return renderMinimalSleekIntro(input);
    case "kinetic_punch":
    default:
      return renderKineticPunchIntro(input);
  }
}

/**
 * Dispatches to the appropriate native motion outro template renderer.
 * Automatically falls back to Interactive CTA if the requested ID is unrecognized.
 */
export function renderMotionOutroClip(templateId: string | undefined, input: MotionClipDispatchInput): string {
  switch (templateId) {
    case "scorecard_recap":
      return renderScorecardRecapOutro(input);
    case "interactive_cta":
    default:
      return renderInteractiveCtaOutro(input);
  }
}

import type { SlotScopedStyleModule, StyleModule } from "./types.js";
import { auroraGlowVariant } from "../elements/background/variants/auroraGlow.js";
import { candyRaysVariant } from "../elements/background/variants/candyRays.js";
import { glossyArcadeVariant } from "../elements/answerCard/variants/glossyArcade.js";
import { comicChunkyVariant } from "../elements/answerCard/variants/comicChunky.js";
import { glassNeonVariant } from "../elements/answerCard/variants/glassNeon.js";
import { minimalSoftVariant } from "../elements/answerCard/variants/minimalSoft.js";
import { hangingWoodSignVariant } from "../elements/counterBadge/variants/hangingWoodSign.js";
import { neonBadgeVariant } from "../elements/counterBadge/variants/neonBadge.js";
import { floatingBalloonVariant } from "../elements/counterBadge/variants/floatingBalloon.js";
import { goldenShieldVariant } from "../elements/counterBadge/variants/goldenShield.js";
import { candyPopVariant } from "../elements/questionBox/variants/candyPop.js";
import { comicBubbleVariant } from "../elements/questionBox/variants/comicBubble.js";
import { glassMorphismVariant } from "../elements/questionBox/variants/glassMorphism.js";
import { parchmentScrollVariant } from "../elements/questionBox/variants/parchmentScroll.js";
import { starSliderVariant } from "../elements/thinkingBar/variants/starSlider.js";
import { capsuleLiquidVariant } from "../elements/thinkingBar/variants/capsuleLiquid.js";
import { energyLaserVariant } from "../elements/thinkingBar/variants/energyLaser.js";
import { constructionMachineVariant } from "../elements/thinkingBar/variants/constructionMachine.js";
import { emberTrailVariant } from "../elements/thinkingBar/variants/emberTrail.js";
import { cosmicRocketVariant } from "../elements/thinkingBar/variants/cosmicRocket.js";
import type { StyleSlot } from "@studio/shared";

const BUILTIN_VERSION = "1.0.0";

type IdentifiedRenderer = {
  id: string;
  displayName: string;
  description: string;
  renderCss: () => string;
};

function toKebabCase(value: string): string {
  return value.replaceAll("_", "-");
}

function getNamespace(slot: StyleSlot, id: string): string {
  const prefix = {
    "thinking-bar": "thinking-bar",
    "question-box": "qb",
    "answer-card": "ac",
    counter: "cb",
    background: "bg",
  }[slot];
  return `${prefix}-${toKebabCase(id)}`;
}

function manifest<TSlot extends StyleSlot>(
  slot: TSlot,
  id: string,
  displayName: string,
  description: string,
): {
  id: string;
  slot: TSlot;
  version: string;
  displayName: string;
  description: string;
  namespace: string;
  assetPaths: readonly [];
  cssSelectors: readonly [string];
} {
  const namespace = getNamespace(slot, id);
  return {
    id,
    slot,
    version: BUILTIN_VERSION,
    displayName,
    description,
    namespace,
    assetPaths: [],
    cssSelectors: [`.${namespace}`],
  };
}

function styleModule<TSlot extends StyleSlot, TRenderer extends IdentifiedRenderer>(
  slot: TSlot,
  renderer: TRenderer,
): StyleModule<TSlot, TRenderer> {
  return { manifest: manifest(slot, renderer.id, renderer.displayName, renderer.description), renderer };
}

export const BUILT_IN_THINKING_BAR_MODULES = [
  styleModule("thinking-bar", starSliderVariant),
  styleModule("thinking-bar", capsuleLiquidVariant),
  styleModule("thinking-bar", energyLaserVariant),
  styleModule("thinking-bar", constructionMachineVariant),
  styleModule("thinking-bar", emberTrailVariant),
  styleModule("thinking-bar", cosmicRocketVariant),
] as const;

export const BUILT_IN_QUESTION_BOX_MODULES = [
  styleModule("question-box", candyPopVariant),
  styleModule("question-box", comicBubbleVariant),
  styleModule("question-box", glassMorphismVariant),
  styleModule("question-box", parchmentScrollVariant),
] as const;

export const BUILT_IN_ANSWER_CARD_MODULES = [
  styleModule("answer-card", glossyArcadeVariant),
  styleModule("answer-card", comicChunkyVariant),
  styleModule("answer-card", glassNeonVariant),
  styleModule("answer-card", minimalSoftVariant),
] as const;

export const BUILT_IN_COUNTER_MODULES = [
  styleModule("counter", hangingWoodSignVariant),
  styleModule("counter", neonBadgeVariant),
  styleModule("counter", floatingBalloonVariant),
  styleModule("counter", goldenShieldVariant),
] as const;

export const BUILT_IN_BACKGROUND_MODULES = [
  styleModule("background", candyRaysVariant),
  styleModule("background", auroraGlowVariant),
] as const;

export const BUILT_IN_STYLE_MODULES: readonly SlotScopedStyleModule[] = [
  ...BUILT_IN_THINKING_BAR_MODULES,
  ...BUILT_IN_QUESTION_BOX_MODULES,
  ...BUILT_IN_ANSWER_CARD_MODULES,
  ...BUILT_IN_COUNTER_MODULES,
  ...BUILT_IN_BACKGROUND_MODULES,
];

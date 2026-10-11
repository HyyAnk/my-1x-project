import type { ThumbnailAspectRatio } from "@studio/shared";
import { QUIZ_STYLE_CONTRACTS } from "../../assets/promptCompiler.js";
import type { QuizThumbnailPlan } from "../thumbnailTypes.js";
import { editorialGeometry } from "./editorialGeometry.js";
import {
  compositionHeadlinePlacement,
  compositionLayoutPrompt,
  compositionMascotFraming,
  LEGACY_COMPOSITION,
} from "./composition/compositionCatalog.js";
import { headlineStyleDescription, LEGACY_HEADLINE_STYLE } from "./typography/headlineStyleCatalog.js";

const DEFAULT_STORY_MOMENT = "the mascot reacts with a big, startled double-take as it discovers the hero subject up close";

function resolveBlockLayout(plan: QuizThumbnailPlan, ratio: ThumbnailAspectRatio, subjects: string): string {
  const design = plan.editorial!;
  const landscape = ratio === "16:9";
  if (plan.layout === "mystery_silhouette") {
    return landscape
      ? `MYSTERY COMPOSITION: Left block (~35-40% width) features the mascot in a keen deduction pose below the headline; Right block (~60-65% width) features ONE dramatic dark silhouette of the hero subject (${subjects}) backlit by warm golden rim light, creating an intriguing guessing challenge; do not reveal the fully lit subject.`
      : `MYSTERY COMPOSITION: Upper area features the headline and ONE dramatic dark silhouette of the hero subject (${subjects}), with the mascot beside it, all essential action above y=1440.`;
  }
  if (design.spatialComposition) return design.spatialComposition;
  if (design.template === "comparison") {
    return design.candidateCount === 4
      ? "THREE-BLOCK COMPOSITION: Bottom row (y=50% to 95%) contains 4 distinct candidates arranged evenly in a clean horizontal row; Top-left features the headline; Upper-right features the mascot leaning down in keen scrutiny."
      : `TWO-BLOCK COMPOSITION: Left half (~60% width) contains two large equally lit candidates (${subjects}); Right half (~35% width) features the mascot torn between them; Top-left features the headline.`;
  }
  return compositionLayoutPrompt(design.composition ?? LEGACY_COMPOSITION, ratio, subjects);
}

function candidateLabelLine(candidateCount: number): string {
  if (candidateCount === 2)
    return 'OPTION LABELS: two crisp circular badges, "A" beside Option A and "B" beside Option B (solid black circle, bold white capital letter).';
  if (candidateCount === 4)
    return 'OPTION LABELS: four crisp circular badges "A", "B", "C", "D" beneath the candidates (solid black circle, bold white capital letter).';
  return "";
}

function headlineSection(plan: QuizThumbnailPlan, ratio: ThumbnailAspectRatio): string {
  const design = plan.editorial!;
  const placement = design.composition ? compositionHeadlinePlacement(design.composition, ratio) : "In the top-left area";
  const style = headlineStyleDescription(design.headlineStyle ?? LEGACY_HEADLINE_STYLE);
  const otherText = design.candidateCount > 0 ? "only the option letter badges" : "no other text";
  return `INTEGRATED HEADLINE TYPOGRAPHY:
${placement}, render the exact headline text "${plan.hookText}" as ${style}.
- Exact text and flawless spelling: "${plan.hookText}". Uppercase, at most two lines, the largest and highest-contrast element in the frame (letter height at least 11% of the frame height) so it reads at 320x180.
- The headline object is big and close to the camera: it spans at least ${ratio === "16:9" ? "45%" : "70%"} of the frame width and its letters fill it edge to edge. Never a small, distant or background sign, never thin or script lettering.
- The headline stays fully unobstructed: no subject, mascot, ear, hair or prop may overlap or touch any letter.
- Besides the headline there is ${otherText}: no other words, letters, numbers, logos or labels anywhere, including clothing, props and background signs.`;
}

/**
 * Story-scene art prompt (Short-Reel art direction): one frame from an animated film in which the mascot
 * acts out a dramatic moment with the quiz subject, with the headline built into the scene.
 */
export function compileEditorialPrompt(plan: QuizThumbnailPlan, ratio: ThumbnailAspectRatio, mascot: string): string {
  const design = plan.editorial!;
  const geometry = editorialGeometry(ratio, design);
  const style = QUIZ_STYLE_CONTRACTS[plan.visualStyle] ?? QUIZ_STYLE_CONTRACTS.pixar_3d;
  const subjects = plan.subjectAnchors.map((subject) => subject.visualPrompt).join("; ");
  const setting = plan.environmentAtmosphere || design.backgroundAtmosphere || style.heroBackground;
  const moment = plan.mascotPersona.dramaticHook || DEFAULT_STORY_MOMENT;

  return [
    `STORY-SCENE THUMBNAIL ART PLATE v2. ${ratio}, target ${geometry.width}x${geometry.height}. One single full-bleed frame from an animated feature film, not a collage or split screen.`,
    `ART DIRECTION: ${style.name} (${style.renderingMedium}). The mascot, the hero subject, the setting and the headline object all share this one stylized 3D look, lighting and materials. Render every subject in this style even if it is described photographically; no photographic cut-outs or stock-photo elements.`,
    headlineSection(plan, ratio),
    candidateLabelLine(design.candidateCount),
    resolveBlockLayout(plan, ratio, subjects),
    `Mascot identity and performance: ${mascot.replace(/Clean bright luminous rim lighting[^.]*\./g, "Crisp directional key lighting with sharp subject separation.")}`,
    `STORY MOMENT: ${moment}. The mascot is the protagonist, physically interacting with the hero subject (holding, chasing, recoiling from, hiding behind or wrestling with it) with an exaggerated, instantly readable facial reaction. Never a passive presenter or a generic pointing pose.`,
    design.composition ? compositionMascotFraming(design.composition, ratio) : "",
    `SETTING & LIGHT: ${setting}. Themed, colorful and warm with real depth, but simplified so the moment reads at a glance: soft depth of field on the background, a few large background shapes, no clutter. Cinematic key and rim light, saturated colors, strong value contrast between headline, subject, mascot and background; never a flat, murky or uniformly dark backdrop.`,
    "One clear visual question: no answer reveal, no extra characters beyond the mascot and the hero subject, no particles or glow overload.",
    ratio === "16:9"
      ? "Keep the bottom-right corner clear for the YouTube timestamp."
      : "Keep top 12%, bottom 25%, and rightmost 15% free of essential details for Shorts UI.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

import type { ThumbnailAspectRatio } from "@studio/shared";
import type { QuizThumbnailPlan } from "../thumbnailTypes.js";
import { editorialGeometry } from "./editorialGeometry.js";

export function compileEditorialPrompt(plan: QuizThumbnailPlan, ratio: ThumbnailAspectRatio, mascot: string): string {
  const design = plan.editorial!;
  const geometry = editorialGeometry(ratio, design);
  const subjects = plan.subjectAnchors.map((subject) => subject.visualPrompt).join("; ");
  const landscape = ratio === "16:9";

  const isMystery = plan.layout === "mystery_silhouette";

  const mysteryLayout = landscape
    ? `BALANCED TWO-BLOCK COMPOSITION: Left block (~35-40% width) features expressive mascot staged on middle-to-lower left in keen deduction pose with headline typography positioned prominently above it; Right block (~60-65% width) features ONE dramatic mystery dark silhouette of the hero subject (${subjects}) backlit by warm golden-amber geometric rim lighting with crisp edge separation, creating an intriguing guessing challenge; do not reveal the fully lit subject.`
    : `BALANCED TWO-BLOCK COMPOSITION: Upper area features headline typography and ONE dramatic mystery dark silhouette of the hero subject (${subjects}), with expressive mascot positioned beside it, all essential action above y=1440.`;

  const blockLayout =
    (isMystery ? mysteryLayout : design.spatialComposition) ||
    (design.template === "comparison"
      ? design.candidateCount === 4
        ? "BALANCED THREE-BLOCK COMPOSITION: Bottom row (y=50% to 95%) contains 4 distinct candidates arranged evenly in a clean horizontal row on a pristine bright surface; Top-left features headline typography; Upper-right features mascot leaning down in keen scrutiny."
        : `BALANCED TWO-BLOCK COMPOSITION: Left half (~60% width) contains two large equally lit candidates (${subjects}) on a clean illuminated surface; Right half (~35% width) features mascot in thinker pose gazing left at the choices; Top-left features headline typography.`
      : landscape
        ? `BALANCED TWO-BLOCK COMPOSITION: Left block (~35-40% width) features expressive mascot staged on middle-to-lower left with headline typography positioned prominently above it; Right block (~60-65% width) features ONE oversized hero subject (${subjects}) filling the vertical frame with extreme macro scale and tactile fidelity.`
        : `BALANCED TWO-BLOCK COMPOSITION: Upper area features headline typography and ONE oversized hero subject (${subjects}), with expressive mascot positioned beside it, all essential action above y=1440.`);

  const atmosphere =
    design.backgroundAtmosphere ||
    (design.background === "cream"
      ? "Clean bright sunlit studio surface with soft warm cream background and diffused natural window glow."
      : "Vibrant luminous studio atmosphere with warm ambient light, punchy saturated colors, and crisp rim lighting; NEVER a dull uniform pitch-black or gloomy dark navy backdrop.");

  const candidateLabels =
    design.candidateCount === 2
      ? 'OPTION CANDIDATE LABELS: Render two crisp circular letter badges positioned beside or beneath each option: circle "A" with white capital letter "A" next to Option A, and circle "B" with white capital letter "B" next to Option B.'
      : design.candidateCount === 4
        ? 'OPTION CANDIDATE LABELS: Render four crisp circular letter badges aligned neatly beneath each candidate in the row: circle "A", circle "B", circle "C", circle "D" (solid black circle with clean white outline and bold white capital letter).'
        : "";

  return [
    `EDITORIAL THUMBNAIL ART PLATE v1. ${ratio}, target ${geometry.width}x${geometry.height}. Single full-bleed image, not a collage of thumbnails.`,
    `INTEGRATED HEADLINE TYPOGRAPHY & BRUSH BANNERS:
In the top-left area, prominently render the exact headline text: "${plan.hookText}".
Typography & Banner Style:
- Dynamic two-tier textured paint brush stroke background banners with authentic dry-brush bristle edges and subtle splatters.
- Top banner: bold, rugged black acrylic paint brush stroke featuring clean, bold white uppercase lettering.
- Bottom banner: energetic bright neon-yellow/golden paint brush stroke featuring bold, high-contrast lettering (with key emphasis words or question marks optionally highlighted in vibrant red or yellow).
- Lettering must be bold, clean, modern sans-serif block typography with high visual contrast, crisp edges, and flawless spelling: "${plan.hookText}".`,
    candidateLabels,
    blockLayout,
    `Mascot identity and performance: ${mascot.replace(/Clean bright luminous rim lighting[^.]*\./g, "Crisp directional key lighting with sharp subject separation.")}`,
    "The mascot is emotionally immersed in the puzzle with exaggerated curiosity or astonishment, eyes locked directly onto the hero subject. Dynamic, engaging staging; never a passive standing presenter. The mascot uses natural expressive body language matching the challenge (e.g. hand under chin for pondering comparisons, blissful closed eyes for smelling, enthusiastic anticipation for tasting, headphones for audio, magnifying glass ONLY for micro-visual detail searches). Avoid unnecessary handheld tools; NO scanners or holographic interfaces.",
    `VIBRANT CONTEXTUAL LIGHTING & ENVIRONMENT: ${atmosphere}. STRICT PROHIBITION: DO NOT use a flat, dull, dark, or gloomy monochrome navy/black background unless specifically depicting midnight space or neon void. Background must possess rich tonal depth, natural ambient warmth, and cheerful luminosity (e.g. sunny citrus warmth for food, airy daylight garden bokeh for floral scents, sunlit natural wood for comparisons, high-key pristine white for pattern spotting, glowing colorful neon for puzzle doors). Focused directional key lighting with crisp optical depth of field, vibrant saturated colors, and high visual contrast.`,
    `CLEAN MINIMALIST BACKGROUND & SHALLOW DEPTH OF FIELD (HIGH SIGNAL-TO-NOISE RATIO):
The background MUST BE SIMPLE, SOFT-FOCUS, AND UNCLUTTERED so the viewer's attention locks instantly onto the hero subject and mascot.
- Extreme optical shallow depth of field (creamy f/1.8 bokeh blur): any background environment must be softly blurred, smooth, and uncluttered.
- STRICT PROHIBITION: DO NOT fill the background with complex sprawling city skylines, dozens of detailed skyscraper windows, tangled highway spaghetti overpasses, busy street traffic, chaotic bridges, crowd clutter, or intricate architectural noise in the background.
- Keep the background broad, soft, and atmospheric (e.g. smooth gradient sky, soft diffused studio cyclorama, or creamy blurred bokeh). The hero subject and mascot must remain the ONLY sharp, crisp focal elements.`,
    "STRICT SUBJECT REALISM: The hero subject must be an authentic, living, high-fidelity real-world subject with rich tangible textures. STRICT PROHIBITION: DO NOT render the subject as a wooden desk toy, educational cutaway model, carved figurine, anatomical diagram, or plastic display on a pedestal base. The subject must feel real, vivid, and tangible. One clear visual question; no answer reveal, glow overload, particles, elaborate scenery, 3D text, or decorative mini badges.",
    landscape
      ? "Keep the bottom-right corner clear for the YouTube timestamp."
      : "Keep top 12%, bottom 25%, and rightmost 15% free of essential details for Shorts UI.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

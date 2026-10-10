import type { ThumbnailAspectRatio, ThumbnailComposition } from "@studio/shared";

/** Composition used by editorial thumbnails generated before compositions were rotated. */
export const LEGACY_COMPOSITION: ThumbnailComposition = "mascot_left";

type PerRatio<T> = Record<ThumbnailAspectRatio, T>;

interface CompositionSpec {
  headlinePlacement: PerRatio<string>;
  layout: PerRatio<(subjects: string) => string>;
  /** Mascot scale and crop. Stated after the pose so it wins over full-body pose wording. */
  mascotFraming: PerRatio<string>;
}

const SIDE_MASCOT_FRAMING = "full or three-quarter body, about 55-65% of the frame height";

const COMPOSITIONS: Record<ThumbnailComposition, CompositionSpec> = {
  mascot_left: {
    headlinePlacement: { "16:9": "In the top-left area", "9:16": "In the upper area, centered" },
    layout: {
      "16:9": (subjects) =>
        `BALANCED TWO-BLOCK COMPOSITION: Left block (~35-40% width) features expressive mascot staged on middle-to-lower left with headline typography positioned prominently above it; Right block (~60-65% width) features ONE oversized hero subject (${subjects}) filling the vertical frame with extreme macro scale and tactile fidelity.`,
      "9:16": (subjects) =>
        `STACKED COMPOSITION: Upper area features headline typography and ONE oversized hero subject (${subjects}), with expressive mascot positioned on the lower left beside it, all essential action above y=1440.`,
    },
    mascotFraming: { "16:9": `Mascot on the left, ${SIDE_MASCOT_FRAMING}.`, "9:16": "Mascot on the lower left, three-quarter body." },
  },
  mascot_right: {
    headlinePlacement: { "16:9": "In the top-right area, above the mascot", "9:16": "In the upper area, centered" },
    layout: {
      "16:9": (subjects) =>
        `MIRRORED TWO-BLOCK COMPOSITION: Left block (~60-65% width) features ONE oversized hero subject (${subjects}) filling the vertical frame with extreme macro scale and tactile fidelity; Right block (~35-40% width) features expressive mascot staged middle-right, turned toward the subject, with headline typography above it. Keep the mascot's face above the bottom 25% of the frame.`,
      "9:16": (subjects) =>
        `STACKED COMPOSITION: Upper area features headline typography and ONE oversized hero subject (${subjects}), with expressive mascot positioned center-right below it but clear of the rightmost 15%, all essential action above y=1440.`,
    },
    mascotFraming: { "16:9": `Mascot on the right, ${SIDE_MASCOT_FRAMING}, facing left toward the subject.`, "9:16": "Mascot center-right, three-quarter body, facing the subject." },
  },
  hero_center: {
    headlinePlacement: { "16:9": "Across the top of the frame, centered", "9:16": "In the upper area, centered" },
    layout: {
      "16:9": (subjects) =>
        `CENTERED HERO COMPOSITION: ONE giant hero subject (${subjects}) sits dead center below the headline, occupying roughly 55-60% of the width and most of the height, symmetrical and monumental. A mascot stands at the base of the subject just right of center, looking up at it in awe. Both sides of the frame stay calm, soft-focus background; leave the bottom-right corner free of essential detail.`,
      "9:16": (subjects) =>
        `CENTERED HERO COMPOSITION: ONE giant hero subject (${subjects}) fills the middle of the frame below the headline; a small mascot stands at its base, center-right but clear of the rightmost 15%, looking up at it, all essential action above y=1440.`,
    },
    mascotFraming: {
      "16:9": "Full-body mascot about 35-40% of the frame height (clearly readable at small sizes, but smaller than the subject), at the base of the subject just right of center; face above the bottom 25% and outside the rightmost 12%. Never on the left edge.",
      "9:16": "Full-body mascot about 25% of the frame height, at the base of the subject.",
    },
  },
  reaction_closeup: {
    headlinePlacement: { "16:9": "In the top-left area", "9:16": "In the upper area, centered" },
    layout: {
      "16:9": (subjects) =>
        `REACTION CLOSE-UP COMPOSITION: Large chest-up close-up of the mascot on the right (~40% width), face in the upper-middle right with a big, readable emotional reaction; ONE oversized hero subject (${subjects}) on the left and center below the headline, the mascot's eyes locked onto it.`,
      "9:16": (subjects) =>
        `REACTION CLOSE-UP COMPOSITION: Headline at top, ONE oversized hero subject (${subjects}) in the middle, and a large chest-up close-up of the mascot's reacting face below it, all essential action above y=1440 and clear of the rightmost 15%.`,
    },
    mascotFraming: {
      "16:9":
        "CHEST-UP CLOSE-UP ONLY: the mascot's head and shoulders fill about 50-60% of the frame height and are cropped at the chest by the bottom and right frame edges. No legs, feet or full body visible; ignore any full-body pose above and express it through face, ears and raised paws. Exaggerated, readable facial reaction (wide eyes, open mouth) aimed at the hero subject.",
      "9:16":
        "CHEST-UP CLOSE-UP ONLY: the mascot's head and shoulders fill about 30% of the frame height, cropped at the chest; no legs or feet visible; exaggerated readable facial reaction.",
    },
  },
};

export function compositionLayoutPrompt(composition: ThumbnailComposition, ratio: ThumbnailAspectRatio, subjects: string): string {
  return COMPOSITIONS[composition].layout[ratio](subjects);
}

export function compositionHeadlinePlacement(composition: ThumbnailComposition, ratio: ThumbnailAspectRatio): string {
  return COMPOSITIONS[composition].headlinePlacement[ratio];
}

export function compositionMascotFraming(composition: ThumbnailComposition, ratio: ThumbnailAspectRatio): string {
  return `MASCOT FRAMING (takes priority over the pose above): ${COMPOSITIONS[composition].mascotFraming[ratio]}`;
}

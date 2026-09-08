import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Returns the Portrait 9:16 fallback guardrail styles for the Mystery Reveal
 * layout. Emits an empty string for landscape aspect ratios.
 */
export function mysteryRevealPortraitStyles(aspectRatio: MascotRenderAspectRatio): string {
  return `${
    aspectRatio === "9:16"
      ? `
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .game-stage {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "stage" "phase";
  row-gap: 20px;
  width: 100%;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .mystery-stage-wrapper {
  width: 100%;
  max-width: 980px;
  height: 1100px;
  border-radius: 36px;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .mystery-stage-wrapper > .answer-grid,
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .mystery-stage-wrapper > .choice-group {
  bottom: 32px;
  width: calc(100% - 40px);
  max-width: 760px;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .choice-card {
  padding: 16px 28px;
  min-height: 80px;
  border-radius: 20px;
}
#stage[data-aspect-ratio="9:16"] .layout-mystery_reveal .choice-text {
  font-size: var(--choice-fitted-font-size, var(--choice-font-size-base, 46px));
}
`
      : ""
  }`;
}

import type { MascotRenderAspectRatio } from "@studio/shared";

/**
 * Returns the Portrait 9:16 fallback guardrail styles for the Clue Deduction
 * layout. Emits an empty string for landscape aspect ratios.
 */
export function clueDeductionPortraitStyles(aspectRatio: MascotRenderAspectRatio): string {
  return `${
    aspectRatio === "9:16"
      ? `
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .game-stage {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "title" "stage" "phase";
  row-gap: 20px;
  width: calc(100% - 72px);
  margin: 184px auto 0;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .clue-deduction-stage-wrapper {
  width: 100%;
  max-width: 980px;
  height: 1100px;
  border-radius: 36px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .clue-deduction-stage-wrapper > .choice-group,
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .clue-deduction-stage-wrapper > .answer-grid {
  bottom: 32px;
  width: calc(100% - 40px);
  max-width: 760px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .choice-card {
  padding: 16px 28px;
  min-height: 80px;
  height: 80px;
  border-radius: 20px;
}
#stage[data-aspect-ratio="9:16"] .layout-clue_deduction .choice-text {
  font-size: var(--choice-fitted-font-size, var(--choice-font-size-base, 46px));
}
`
      : ""
  }`;
}

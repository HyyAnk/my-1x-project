import { CANONICAL_IMAGE_SLOT_DEFINITIONS } from "@studio/shared";

/**
 * Image slot renderer styling helper.
 * Generates CSS rules and dimensions directly from the canonical geometry contract.
 */
export function imageSlotStyles(): string {
  const vc = CANONICAL_IMAGE_SLOT_DEFINITIONS.visual_choices_three;
  const vcp = CANONICAL_IMAGE_SLOT_DEFINITIONS.visual_choices_three_pure;
  const sv = CANONICAL_IMAGE_SLOT_DEFINITIONS.split_versus_two;
  const ml = CANONICAL_IMAGE_SLOT_DEFINITIONS.media_left_choices_right;
  const vtf = CANONICAL_IMAGE_SLOT_DEFINITIONS.verdict_true_false;
  const mr = CANONICAL_IMAGE_SLOT_DEFINITIONS.mystery_reveal;
  const cd = CANONICAL_IMAGE_SLOT_DEFINITIONS.clue_deduction;

  return `
/* Canonical Image Slot Geometry Variables */
.layout-visual_choices_three {
  --slot-card-width: ${vc.cardBorderBox.width}px;
  --slot-card-height: ${vc.cardBorderBox.height}px;
  --slot-media-height: ${vc.mediaBorderBox.height}px;
  --slot-border-width: ${vc.borderEachSide}px;
  --slot-viewport-width: ${vc.viewport.width}px;
  --slot-viewport-height: ${vc.viewport.height}px;
}

.layout-visual_choices_three_pure {
  --slot-card-width: ${vcp.cardBorderBox.width}px;
  --slot-card-height: ${vcp.cardBorderBox.height}px;
  --slot-media-height: ${vcp.mediaBorderBox.height}px;
  --slot-border-width: ${vcp.borderEachSide}px;
  --slot-viewport-width: ${vcp.viewport.width}px;
  --slot-viewport-height: ${vcp.viewport.height}px;
}

.layout-split_versus_two {
  --slot-card-width: ${sv.cardBorderBox.width}px;
  --slot-card-height: ${sv.cardBorderBox.height}px;
  --slot-media-height: ${sv.mediaBorderBox.height}px;
  --slot-border-width: ${sv.borderEachSide}px;
  --slot-viewport-width: ${sv.viewport.width}px;
  --slot-viewport-height: ${sv.viewport.height}px;
}

.layout-media_left_choices_right {
  --slot-hero-width: ${ml.cardBorderBox.width}px;
  --slot-hero-height: ${ml.cardBorderBox.height}px;
  --slot-hero-border-width: ${ml.borderEachSide}px;
  --slot-hero-viewport-width: ${ml.viewport.width}px;
  --slot-hero-viewport-height: ${ml.viewport.height}px;
}

.layout-verdict_true_false {
  --slot-hero-width: ${vtf.cardBorderBox.width}px;
  --slot-hero-height: ${vtf.cardBorderBox.height}px;
  --slot-hero-border-width: ${vtf.borderEachSide}px;
  --slot-hero-viewport-width: ${vtf.viewport.width}px;
  --slot-hero-viewport-height: ${vtf.viewport.height}px;
}

.layout-mystery_reveal {
  --slot-hero-width: ${mr.cardBorderBox.width}px;
  --slot-hero-height: ${mr.cardBorderBox.height}px;
}

.layout-clue_deduction {
  --slot-hero-width: ${cd.cardBorderBox.width}px;
  --slot-hero-height: ${cd.cardBorderBox.height}px;
  --slot-hero-viewport-width: ${cd.viewport.width}px;
  --slot-hero-viewport-height: ${cd.viewport.height}px;
}
`;
}

import { PORTRAIT_MIN_CHOICE_FONT_PX, type QuizChoiceVariantGeometry, type QuizRect } from "@studio/shared";

export const PORTRAIT_CHOICE_FIT_MAX_PX = 72;
const PORTRAIT_CHOICE_LEADING = 1.08;
const MAX_SURFACE_PADDING_Y = 10;
const MIN_SURFACE_PADDING_Y = 0;
/** Thickest border any answer card skin draws around the row surface. */
const MAX_SKIN_BORDER_PX = 7;

/**
 * Vertical padding that still leaves one line of minimum-size answer text inside the row surface,
 * whatever border the active answer card skin draws.
 */
export function portraitSurfacePaddingY(surfaceHeight: number): number {
  const minimumLine = Math.ceil(PORTRAIT_MIN_CHOICE_FONT_PX * PORTRAIT_CHOICE_LEADING) + 1;
  const room = Math.floor((surfaceHeight - 2 * MAX_SKIN_BORDER_PX - minimumLine) / 2);
  return Math.max(MIN_SURFACE_PADDING_Y, Math.min(MAX_SURFACE_PADDING_Y, room));
}

/**
 * Choice typography tokens that never drop under the portrait minimum. Image-card labels (the
 * versus layout) use their own label tiers, which default to 24-32 px on landscape cards.
 */
export function portraitChoiceTypographyTokens(): string {
  const minimum = PORTRAIT_MIN_CHOICE_FONT_PX;
  return [
    `--choice-font-size-base: ${minimum + 8}px`,
    `--choice-font-size-medium: ${minimum + 4}px`,
    `--choice-font-size-long: ${minimum}px`,
    `--choice-font-size-very_long: ${minimum}px`,
    `--choice-font-size-overflow: ${minimum}px`,
    `--choice-fit-min: ${minimum}px`,
    `--choice-fit-max: ${PORTRAIT_CHOICE_FIT_MAX_PX}px`,
    `--choice-fit-max-lines: 2`,
    `--choice-fit-leading: ${PORTRAIT_CHOICE_LEADING}`,
    `--choice-fit-multiline-gain: 6px`,
    `--choice-label-font-size-base: ${minimum + 4}px`,
    `--choice-label-font-size-medium: ${minimum}px`,
    `--choice-label-font-size-long: ${minimum - 6}px`,
    `--choice-label-font-size-very_long: ${minimum - 12}px`,
  ].join("; ");
}

export type StackedRowsCssInput = {
  scope: string;
  arena: QuizRect;
  variant: QuizChoiceVariantGeometry;
  count: number;
};

/**
 * Positions a detached-badge choice group as absolute stacked rows inside the layout arena,
 * deriving every dimension from the shared portrait geometry rather than hand-tuned values.
 */
export function portraitStackedRowsCss(input: StackedRowsCssInput): string {
  const { scope, arena, variant, count } = input;
  const first = variant.outer[0];
  const second = variant.outer[1];
  if (!first) return "";
  const gap = variant.gap ?? (second ? second.y - (first.y + first.height) : 0);
  const badge = variant.badge[0]?.width ?? 0;
  const surfaceHeight = variant.text[0]?.height ?? first.height;
  const overlap = variant.overlap ?? 0;
  const paddingY = portraitSurfacePaddingY(surfaceHeight);
  const group = `${scope} .choice-group.answer-count-${count}, ${scope} .answer-grid.answer-count-${count}`;
  const card = `${scope} .choice-group.answer-count-${count} .choice-card, ${scope} .answer-grid.answer-count-${count} .choice-card`;
  return `
${group} { position: absolute; left: ${first.x - arena.x}px; top: ${first.y - arena.y}px; width: ${first.width}px; height: auto; max-height: ${arena.height}px; margin: 0; padding: 0; box-sizing: border-box; display: flex; flex-direction: column; gap: ${gap}px; }
${card} { width: ${first.width}px; height: ${first.height}px; min-height: ${first.height}px; max-height: ${first.height}px; box-sizing: border-box; --choice-card-height: ${first.height}px; --choice-card-min-height: ${first.height}px; --choice-badge-size: ${badge}px; --choice-badge-font-size: ${Math.round(badge * 0.46)}px; --choice-surface-height: ${surfaceHeight}px; --choice-badge-overlap: ${overlap}px; --choice-surface-padding: ${paddingY}px 28px ${paddingY}px ${overlap + 18}px; }
`;
}

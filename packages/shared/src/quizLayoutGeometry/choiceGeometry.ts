import type { QuizChoiceVariantGeometry, QuizRect } from "./types.js";

export function createStackedRows(config: {
  x: number;
  rowYPositions: readonly number[];
  assemblyWidth: number;
  assemblyHeight: number;
  badgeSize: number;
  textOffsetLeft: number;
  textOffsetTop: number;
  textWidth: number;
  textHeight: number;
  gap?: number;
  overlap?: number;
}): QuizChoiceVariantGeometry {
  const outer: QuizRect[] = [];
  const badge: QuizRect[] = [];
  const text: QuizRect[] = [];

  for (const y of config.rowYPositions) {
    outer.push(
      Object.freeze({
        x: config.x,
        y,
        width: config.assemblyWidth,
        height: config.assemblyHeight,
      }),
    );
    badge.push(
      Object.freeze({
        x: config.x,
        y,
        width: config.badgeSize,
        height: config.badgeSize,
      }),
    );
    text.push(
      Object.freeze({
        x: config.x + config.textOffsetLeft,
        y: y + config.textOffsetTop,
        width: config.textWidth,
        height: config.textHeight,
      }),
    );
  }

  return Object.freeze({
    outer: Object.freeze(outer),
    badge: Object.freeze(badge),
    text: Object.freeze(text),
    gap: config.gap,
    overlap: config.overlap,
  });
}

export function createColumns(config: {
  columnXs: readonly number[];
  y: number;
  assemblyWidth: number;
  assemblyHeight: number;
  badgeSize?: number;
  textOffsetLeft?: number;
  textOffsetTop?: number;
  textWidth?: number;
  textHeight?: number;
  overlap?: number;
}): QuizChoiceVariantGeometry {
  const outer: QuizRect[] = [];
  const badge: QuizRect[] = [];
  const text: QuizRect[] = [];

  for (const x of config.columnXs) {
    outer.push(
      Object.freeze({
        x,
        y: config.y,
        width: config.assemblyWidth,
        height: config.assemblyHeight,
      }),
    );
    if (config.badgeSize !== undefined) {
      badge.push(
        Object.freeze({
          x,
          y: config.y,
          width: config.badgeSize,
          height: config.badgeSize,
        }),
      );
    }
    if (
      config.textWidth !== undefined &&
      config.textHeight !== undefined &&
      config.textOffsetLeft !== undefined &&
      config.textOffsetTop !== undefined
    ) {
      text.push(
        Object.freeze({
          x: x + config.textOffsetLeft,
          y: config.y + config.textOffsetTop,
          width: config.textWidth,
          height: config.textHeight,
        }),
      );
    }
  }

  return Object.freeze({
    outer: Object.freeze(outer),
    badge: Object.freeze(badge),
    text: Object.freeze(text),
    overlap: config.overlap,
  });
}

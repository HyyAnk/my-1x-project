/**
 * Analytical SVG path point interpolation and geometry utilities for offline morphing animations.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Linearly interpolates two 2D points.
 */
export function lerpPoint(p1: Point2D, p2: Point2D, t: number): Point2D {
  return {
    x: Math.round((p1.x + (p2.x - p1.x) * t) * 100) / 100,
    y: Math.round((p1.y + (p2.y - p1.y) * t) * 100) / 100,
  };
}

/**
 * Generates an SVG path data string for a star polygon with given spikes and radii.
 */
export function generateStarPath(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): string {
  const points: Point2D[] = [];
  const step = Math.PI / spikes;

  for (let i = 0; i < 2 * spikes; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  return pointsToSvgPath(points);
}

/**
 * Generates an SVG path data string for a rounded polygon or badge.
 */
export function generateBadgePath(cx: number, cy: number, radius: number, sides = 6): string {
  const points: Point2D[] = [];
  const step = (2 * Math.PI) / sides;

  for (let i = 0; i < sides; i++) {
    const angle = i * step - Math.PI / 2;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }

  return pointsToSvgPath(points);
}

/**
 * Converts an array of 2D coordinates into an SVG 'M... L... Z' polygon path string.
 */
export function pointsToSvgPath(points: Point2D[]): string {
  if (points.length === 0) return "";
  const first = points[0];
  const rest = points.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${rest.join(" ")} Z`;
}

/**
 * Interpolates two SVG polygon point lists of equal length.
 */
export function interpolatePolygonPoints(pointsA: Point2D[], pointsB: Point2D[], t: number): Point2D[] {
  const len = Math.min(pointsA.length, pointsB.length);
  const result: Point2D[] = [];
  for (let i = 0; i < len; i++) {
    result.push(lerpPoint(pointsA[i], pointsB[i], t));
  }
  return result;
}

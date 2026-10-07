/**
 * Deterministic easing curves and polynomial equations for programmatic motion graphics.
 */

export type EasingFunction = (t: number) => number;

/**
 * Clamps numeric value between lower and upper bounds.
 */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between a and b.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Ease In-Out Cubic.
 */
export function easeInOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Ease Out Exponential: rapid explosion, smooth settling.
 */
export function easeOutExpo(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -10 * t);
}

/**
 * Ease Out Back (Overshoot).
 */
export function easeOutBack(t: number, overshoot = 1.70158): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const p = t - 1;
  return p * p * ((overshoot + 1) * p + overshoot) + 1;
}

/**
 * Ease Out Elastic.
 */
export function easeOutElastic(t: number): number {
  const p = clamp(t, 0, 1);
  if (p === 0 || p === 1) return p;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * c4) + 1;
}

/**
 * Numerical cubic bezier evaluation for CSS-equivalent cubic-bezier(x1, y1, x2, y2).
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  return (t: number): number => {
    const p = clamp(t, 0, 1);
    if (p === 0 || p === 1) return p;

    // Newton-Raphson approximation for parameter u where X(u) = p
    let u = p;
    for (let i = 0; i < 5; i++) {
      const currentX = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
      const slope =
        3 * (1 - u) * (1 - u) * x1 +
        6 * (1 - u) * u * (x2 - x1) +
        3 * u * u * (1 - x2);
      if (Math.abs(slope) < 1e-6) break;
      u -= (currentX - p) / slope;
      u = clamp(u, 0, 1);
    }

    return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  };
}

/**
 * Pure closed-form spring physics simulation based on analytical harmonic oscillator step responses.
 * Guarantees zero cumulative error and deterministic evaluation at any time t >= 0.
 */

export interface SpringConfig {
  /** Stiffness of the spring (default: 180) */
  stiffness?: number;
  /** Damping coefficient (default: 12) */
  damping?: number;
  /** Mass of the object (default: 1.0) */
  mass?: number;
  /** Initial displacement offset from equilibrium (default: 0) */
  from?: number;
  /** Target equilibrium value (default: 1) */
  to?: number;
}

export interface SpringSample {
  value: number;
  settled: boolean;
}

const DEFAULT_STIFFNESS = 180;
const DEFAULT_DAMPING = 12;
const DEFAULT_MASS = 1.0;
const SETTLE_EPSILON = 0.001;

/**
 * Computes the exact closed-form analytical position of an underdamped,
 * critically damped, or overdamped spring at time t (in seconds).
 */
export function sampleSpring(tSeconds: number, config: SpringConfig = {}): SpringSample {
  const t = Math.max(0, tSeconds);
  const stiffness = config.stiffness ?? DEFAULT_STIFFNESS;
  const damping = config.damping ?? DEFAULT_DAMPING;
  const mass = config.mass ?? DEFAULT_MASS;
  const from = config.from ?? 0;
  const to = config.to ?? 1;
  const delta = to - from;

  if (delta === 0 || t === 0) {
    return { value: from, settled: delta === 0 };
  }

  // Angular natural frequency and damping ratio
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  let normalizedDisplacement: number;

  if (zeta < 1) {
    // Underdamped (oscillatory with decay)
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega0 * t);
    const cosTerm = Math.cos(omegaD * t);
    const sinTerm = (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * t);
    normalizedDisplacement = 1 - decay * (cosTerm + sinTerm);
  } else if (Math.abs(zeta - 1) < 0.0001) {
    // Critically damped (fastest return without overshoot)
    normalizedDisplacement = 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
  } else {
    // Overdamped (sluggish decay)
    const r1 = -omega0 * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -omega0 * (zeta + Math.sqrt(zeta * zeta - 1));
    normalizedDisplacement = 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }

  const value = from + delta * normalizedDisplacement;
  const settled = Math.abs(value - to) < SETTLE_EPSILON && t > (2 / (zeta * omega0 || 1));

  return { value, settled };
}

/**
 * Interpolates a spring value clamped within a specific time window [startSec, endSec].
 */
export function sampleWindowedSpring(
  currentSec: number,
  startSec: number,
  config: SpringConfig = {},
): SpringSample {
  if (currentSec < startSec) {
    return { value: config.from ?? 0, settled: false };
  }
  return sampleSpring(currentSec - startSec, config);
}

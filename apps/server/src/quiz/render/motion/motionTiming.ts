/**
 * Pure timing utilities for beat synchronization, phase division, and frame quantization.
 */

export interface BeatGrid {
  bpm: number;
  secondsPerBeat: number;
  secondsPerBar: number;
  beatsPerBar: number;
  getBeatTime(beatIndex: number): number;
  getBarTime(barIndex: number): number;
  getClosestBeat(timeSeconds: number): number;
}

export interface MotionClipPhases {
  totalDuration: number;
  entranceDuration: number;
  holdDuration: number;
  exitDuration: number;
  entranceEnd: number;
  exitStart: number;
  getPhase(timeSeconds: number): "pre" | "entrance" | "hold" | "exit" | "post";
  getPhaseProgress(timeSeconds: number): number;
}

/**
 * Creates a deterministic musical beat grid calculated from BPM.
 */
export function createBeatGrid(bpm = 120, beatsPerBar = 4): BeatGrid {
  const safeBpm = Math.max(30, Math.min(300, bpm));
  const secondsPerBeat = 60 / safeBpm;
  const secondsPerBar = secondsPerBeat * beatsPerBar;

  return {
    bpm: safeBpm,
    secondsPerBeat,
    secondsPerBar,
    beatsPerBar,
    getBeatTime(beatIndex: number): number {
      return Math.round(beatIndex * secondsPerBeat * 1000) / 1000;
    },
    getBarTime(barIndex: number): number {
      return Math.round(barIndex * secondsPerBar * 1000) / 1000;
    },
    getClosestBeat(timeSeconds: number): number {
      const beatNum = Math.round(timeSeconds / secondsPerBeat);
      return Math.round(beatNum * secondsPerBeat * 1000) / 1000;
    },
  };
}

/**
 * Partitions a motion clip duration into entrance, hold, and exit phases.
 */
export function partitionMotionPhases(
  totalDurationSeconds: number,
  entranceRatio = 0.25,
  exitRatio = 0.2,
): MotionClipPhases {
  const total = Math.max(0.5, totalDurationSeconds);
  const entranceDuration = Math.round(total * entranceRatio * 1000) / 1000;
  const exitDuration = Math.round(total * exitRatio * 1000) / 1000;
  const holdDuration = Math.max(0, Math.round((total - entranceDuration - exitDuration) * 1000) / 1000);

  const entranceEnd = entranceDuration;
  const exitStart = entranceDuration + holdDuration;

  return {
    totalDuration: total,
    entranceDuration,
    holdDuration,
    exitDuration,
    entranceEnd,
    exitStart,
    getPhase(t: number): "pre" | "entrance" | "hold" | "exit" | "post" {
      if (t < 0) return "pre";
      if (t <= entranceEnd) return "entrance";
      if (t < exitStart) return "hold";
      if (t <= total) return "exit";
      return "post";
    },
    getPhaseProgress(t: number): number {
      if (t <= 0) return 0;
      if (t <= entranceEnd) return t / (entranceDuration || 1);
      if (t < exitStart) return (t - entranceEnd) / (holdDuration || 1);
      if (t <= total) return (t - exitStart) / (exitDuration || 1);
      return 1;
    },
  };
}

/**
 * Quantizes time to rational frames at a given FPS.
 */
export function quantizeToFrame(timeSeconds: number, fps = 30): number {
  const frameIndex = Math.round(timeSeconds * fps);
  return Math.round((frameIndex / fps) * 1000) / 1000;
}

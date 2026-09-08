/**
 * Owns synaptic heat state: per-file heat (0.0 - 3.0) and per-zone heat
 * (0.0 - 5.0) accumulation plus gradual thermodynamic decay each frame.
 * The heatmap view toggle is also owned here; the actual per-neuron gradient
 * colors are applied by FileNeuronAnimator from this state.
 */
export class HeatmapShaderSystem {
  constructor() {
    this.heatmapMode = false;
    this.fileHeatMap = new Map(); // path -> heatNumber (0.0 - 3.0)
    this.zoneHeatMap = new Map(); // zoneId -> heatNumber (0.0 - 5.0)
  }

  /**
   * Toggles or forces the heatmap view mode.
   * @param {boolean} [forceState] Explicit desired state.
   * @returns {boolean} The resulting heatmap mode.
   */
  toggleHeatmap(forceState) {
    this.heatmapMode = typeof forceState === "boolean" ? forceState : !this.heatmapMode;
    return this.heatmapMode;
  }

  /** Accumulates file heat (clamped at 3.0). Returns the new value. */
  bumpFileHeat(file, amount = 1.2) {
    const curFileHeat = (this.fileHeatMap.get(file) || 0) + amount;
    const clamped = Math.min(3.0, curFileHeat);
    this.fileHeatMap.set(file, clamped);
    return clamped;
  }

  /** Accumulates zone heat (clamped at 5.0). Returns the new value. */
  bumpZoneHeat(zoneId, amount = 0.8) {
    const curZoneHeat = (this.zoneHeatMap.get(zoneId) || 0) + amount;
    const clamped = Math.min(5.0, curZoneHeat);
    this.zoneHeatMap.set(zoneId, clamped);
    return clamped;
  }

  /** Gradual thermodynamic heat decay (called once per frame). */
  decayHeat() {
    for (const [k, v] of this.fileHeatMap.entries()) {
      const nv = v - 0.0008;
      if (nv <= 0.02) this.fileHeatMap.delete(k);
      else this.fileHeatMap.set(k, nv);
    }
    for (const [k, v] of this.zoneHeatMap.entries()) {
      const nv = v - 0.0015;
      if (nv <= 0.02) this.zoneHeatMap.delete(k);
      else this.zoneHeatMap.set(k, nv);
    }
  }
}

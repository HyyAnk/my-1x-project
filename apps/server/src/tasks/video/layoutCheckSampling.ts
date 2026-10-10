import { PORTRAIT_FRAME_GEOMETRY } from "@studio/shared";

export type LayoutCheckCanvas = { width: number; height: number };

export type LayoutCheckSampling = {
  samplesCount: number;
  orientation: "landscape" | "portrait";
  /** Fractional caption band (0 to 1 of the canvas height) that portrait content must stay clear of. */
  captionZone: { y0: number; y1: number } | null;
};

export function getOptimalSampleCount(renderQuality?: "draft" | "standard" | "high"): number {
  if (renderQuality === "draft") return 1;
  if (renderQuality === "standard") return 2;
  return 5;
}

/**
 * Resolves how the HyperFrames preflight samples a composition. Portrait (1080x1920) canvases add
 * the reserved bottom band as a caption-zone advisory so Quiz Short content is checked against
 * platform chrome; landscape keeps the historical midpoint sampling.
 */
export function resolveLayoutCheckSampling(input: {
  renderQuality?: "draft" | "standard" | "high";
  canvas?: LayoutCheckCanvas;
}): LayoutCheckSampling {
  const samplesCount = getOptimalSampleCount(input.renderQuality);
  const canvas = input.canvas;
  if (!canvas || canvas.height <= canvas.width) return { samplesCount, orientation: "landscape", captionZone: null };
  const y0 = Number(((canvas.height - PORTRAIT_FRAME_GEOMETRY.reservedBottom) / canvas.height).toFixed(4));
  return { samplesCount, orientation: "portrait", captionZone: { y0, y1: 1 } };
}

/** Builds the `hyperframes check` arguments for one sampling plan. */
export function buildLayoutCheckArgs(sampling: LayoutCheckSampling, timeoutMs: number): string[] {
  const args = ["--json", "--samples", String(sampling.samplesCount), "--timeout", String(timeoutMs)];
  if (sampling.captionZone) {
    args.push("--caption-zone", `x0=0;y0=${sampling.captionZone.y0};x1=1;y1=${sampling.captionZone.y1};severity=warning`);
  }
  return args;
}

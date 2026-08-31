import type { Episode, Scene } from "@studio/shared";
import type { AssessmentCollector } from "./assessmentContext.js";
import { formatDuration } from "./assessmentContext.js";

export function evaluateQualityAndTimingRules(
  episode: Episode,
  scenes: Scene[],
  metrics: {
    overlayCoverageRatio: number;
    targetDurationSeconds: number;
  },
  collector: AssessmentCollector,
): void {
  if (scenes.length === 0) return;

  const { overlayCoverageRatio, targetDurationSeconds } = metrics;

  if (overlayCoverageRatio < 0.2 || overlayCoverageRatio > 0.35) {
    collector.add(
      "overlay_coverage",
      "warning",
      `Editorial overlays cover ${Math.round(overlayCoverageRatio * 100)}% of shots; the target range is 25–30%.`,
      "Use restrained captions, timelines, charts, or map callouts on only the explanatory shots.",
      4,
    );
  }

  const invalidChartOverlays = scenes
    .filter((scene) => ["bar_chart", "line_chart"].includes(scene.editorial_overlay.kind) && scene.editorial_overlay.data.length < 2)
    .map((scene) => scene.scene_number);
  if (invalidChartOverlays.length) {
    collector.add(
      "overlay_data",
      "warning",
      `${invalidChartOverlays.length} chart overlay${invalidChartOverlays.length === 1 ? "" : "s"} lack at least two sourced data points.`,
      "Replace the chart with a caption or provide two or more research-backed data points.",
      Math.min(4, invalidChartOverlays.length),
      invalidChartOverlays,
    );
  }

  if (!episode.narration_asset_path) {
    collector.add(
      "narration_audio",
      "info",
      "Production narration has not been generated.",
      "Generate sequence narration to calibrate the real timeline.",
      3,
    );
  }

  if (episode.narration_duration_seconds) {
    const durationDeltaRatio = Math.abs(episode.narration_duration_seconds - targetDurationSeconds) / targetDurationSeconds;
    if (durationDeltaRatio > 0.12) {
      collector.add(
        "narration_duration",
        "blocker",
        `Master narration is ${formatDuration(episode.narration_duration_seconds)} against a ${formatDuration(targetDurationSeconds)} target.`,
        "Use the measured narrator pace to update the word budget, then regenerate downstream artifacts.",
        15,
      );
    }
  }

  const shortScenes = scenes
    .filter((scene) => scene.duration_seconds < 2.5 && scene.asset_type !== "transition")
    .map((scene) => scene.scene_number);
  if (shortScenes.length) {
    collector.add(
      "short_shots",
      "warning",
      `${shortScenes.length} shots are shorter than 2.5 seconds.`,
      "Combine or lengthen shots unless the rapid cut is intentional.",
      Math.min(6, shortScenes.length),
      shortScenes,
    );
  }
}

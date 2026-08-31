import type { Scene } from "@studio/shared";
import type { AssessmentCollector } from "./assessmentContext.js";
import { duplicatePromptScenes } from "./assessmentContext.js";

export function evaluateShotAndContinuityRules(
  scenes: Scene[],
  metrics: {
    sequenceCount: number;
    uniquePromptRatio: number;
    structuredPromptRatio: number;
    continuityCoverageRatio: number;
    sourceCoverageRatio: number;
    narrationCoverageRatio: number;
  },
  collector: AssessmentCollector,
): void {
  if (scenes.length === 0) {
    collector.add(
      "scene_plan",
      "blocker",
      "No production shots exist.",
      "Generate the shot breakdown after the visual bible is ready.",
      25,
    );
    return;
  }

  const { sequenceCount, uniquePromptRatio, structuredPromptRatio, continuityCoverageRatio, sourceCoverageRatio, narrationCoverageRatio } =
    metrics;

  if (sequenceCount < 5) {
    collector.add(
      "sequence_count",
      "warning",
      `The breakdown uses ${sequenceCount} sequence${sequenceCount === 1 ? "" : "s"}.`,
      "Organize the episode into at least five purposeful sequences.",
      8,
    );
  }

  if (uniquePromptRatio < 0.9) {
    collector.add(
      "duplicate_prompts",
      "blocker",
      `${Math.round((1 - uniquePromptRatio) * 100)}% of prompts are exact duplicates.`,
      "Regenerate repeated shots with distinct visible action and framing.",
      14,
      duplicatePromptScenes(scenes),
    );
  }

  if (structuredPromptRatio < 0.95) {
    collector.add(
      "prompt_structure",
      "warning",
      `${Math.round(structuredPromptRatio * 100)}% of prompts contain the required production sections.`,
      "Complete CAMERA, ACTION, LIGHTING, ATMOSPHERE, and CONTINUITY for every generated shot.",
      8,
    );
  }

  if (continuityCoverageRatio < 0.95) {
    collector.add(
      "continuity_coverage",
      "blocker",
      `${Math.round(continuityCoverageRatio * 100)}% of shots are connected to a continuity bundle.`,
      "Assign every shot to a visual-bible continuity bundle.",
      12,
    );
  }

  if (sourceCoverageRatio < 0.75) {
    collector.add(
      "source_coverage",
      "warning",
      `${Math.round(sourceCoverageRatio * 100)}% of shots carry source IDs.`,
      "Link shots to research claims or evidence sources, including reconstructions.",
      8,
    );
  }

  if (narrationCoverageRatio < 0.975) {
    collector.add(
      "narration_coverage",
      "blocker",
      `${(narrationCoverageRatio * 100).toFixed(1)}% of script words are represented in the shot timeline.`,
      "Regenerate the affected sequence without paraphrasing or omitting narration.",
      15,
    );
  }

  const types = new Set(scenes.map((scene) => scene.asset_type));
  if (types.size < 3) {
    collector.add(
      "visual_mix",
      "warning",
      `The plan uses only ${types.size} visual asset type${types.size === 1 ? "" : "s"}.`,
      "Mix evidence, diagrams, maps, contemporary footage, and reconstruction where appropriate.",
      6,
    );
  }
}

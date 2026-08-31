import { ProductionAssessmentSchema, SceneSchema, type Episode, type ProductionAssessment, type Scene } from "@studio/shared";
import { calibratedScriptTargetWords, countWords } from "./speechChunker.js";
import { extractNarration } from "./narrationExtractor.js";
import { AssessmentCollector, countFactualAnchors, normalize, ratio, wordCoverage } from "./assessment/assessmentContext.js";
import { evaluatePreproductionRules } from "./assessment/preproductionRules.js";
import { evaluateShotAndContinuityRules } from "./assessment/shotAndContinuityRules.js";
import { evaluateQualityAndTimingRules } from "./assessment/qualityAndTimingRules.js";

export function assessProduction(input: {
  episode: Episode;
  research: string;
  treatment: string;
  visualBible: string;
  script: string;
  scenes: Scene[];
  fallbackWordsPerSecond: number;
}): ProductionAssessment {
  const { episode, research, script, scenes: inputScenes } = input;
  const scenes = inputScenes.map((scene) => SceneSchema.parse(scene));
  const narration = extractNarration(script);
  const narrationWords = countWords(narration);
  const pace = episode.measured_narration_words_per_second ?? input.fallbackWordsPerSecond;
  const estimatedNarrationSeconds = narrationWords / Math.max(0.1, pace);
  const targetDurationSeconds = episode.target_duration_minutes * 60;
  const calibratedTargetWords = calibratedScriptTargetWords(episode, input.fallbackWordsPerSecond);
  const researchSourceCount = new Set(research.match(/https?:\/\/[^\s)>\]]+/g) ?? []).size;
  const factualAnchorCount = countFactualAnchors(narration, script);
  const sequenceCount = new Set(scenes.map((scene) => scene.sequence_id).filter(Boolean)).size;
  const uniquePromptRatio = ratio(new Set(scenes.map((scene) => normalize(scene.visual_prompt))).size, scenes.length);
  const structuredPromptRatio = ratio(
    scenes.filter((scene) =>
      ["CAMERA", "ACTION", "LIGHTING", "ATMOSPHERE", "CONTINUITY"].every((label) => scene.visual_prompt.toUpperCase().includes(label)),
    ).length,
    scenes.length,
  );
  const continuityCoverageRatio = ratio(
    scenes.filter((scene) => scene.continuity_bundle_id.trim() && scene.continuity_note.trim()).length,
    scenes.length,
  );
  const sourceCoverageRatio = ratio(
    scenes.filter((scene) => scene.asset_type === "transition" || scene.source_ids.length > 0).length,
    scenes.length,
  );
  const narrationCoverageRatio = wordCoverage(narration, scenes.map((scene) => scene.dialogue).join(" "));
  const overlayCoverageRatio = ratio(scenes.filter((scene) => scene.editorial_overlay.kind !== "none").length, scenes.length);

  const collector = new AssessmentCollector();

  // 1. Preproduction rules (Research, Treatment, Visual Bible, Humor, Script bounds, Facts)
  evaluatePreproductionRules(input, { researchSourceCount, factualAnchorCount, narrationWords, pace, calibratedTargetWords }, collector);

  // 2. Shot & Continuity rules (Scene plan, Sequences, Duplicate prompts, Structure, Continuity, Sources, Narration, Visual mix)
  evaluateShotAndContinuityRules(
    scenes,
    { sequenceCount, uniquePromptRatio, structuredPromptRatio, continuityCoverageRatio, sourceCoverageRatio, narrationCoverageRatio },
    collector,
  );

  // 3. Quality & Timing rules (Overlay coverage, Chart data, Narration audio, Narration duration, Short shots)
  evaluateQualityAndTimingRules(episode, scenes, { overlayCoverageRatio, targetDurationSeconds }, collector);

  return ProductionAssessmentSchema.parse({
    score: collector.finalScore,
    rating: collector.rating,
    assessed_at: new Date().toISOString(),
    metrics: {
      target_duration_seconds: targetDurationSeconds,
      estimated_narration_seconds: Number(estimatedNarrationSeconds.toFixed(1)),
      narration_word_count: narrationWords,
      target_word_count: episode.target_word_count,
      calibrated_word_target_count: calibratedTargetWords,
      scene_count: scenes.length,
      sequence_count: sequenceCount,
      unique_prompt_ratio: uniquePromptRatio,
      structured_prompt_ratio: structuredPromptRatio,
      continuity_coverage_ratio: continuityCoverageRatio,
      source_coverage_ratio: sourceCoverageRatio,
      narration_coverage_ratio: narrationCoverageRatio,
      overlay_coverage_ratio: overlayCoverageRatio,
      factual_anchor_count: factualAnchorCount,
      research_source_count: researchSourceCount,
    },
    issues: collector.issues,
  });
}

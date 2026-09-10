import type { GenerateShortReelRequest, ShortReelRecord } from "@studio/shared";
import { PackageServiceError } from "./packageAttempt.js";
import { computeDependencyFingerprint } from "./dependencyPolicy.js";
import type { PlannedReelStage, ReelGenerationMode } from "./generation.types.js";

/**
 * Pure planner that computes an ordered execution plan for Short-Reel generation.
 * Zero I/O, zero database queries, zero mutations of the input record.
 *
 * Normalizes request mode:
 * - "package" defaults to "repair"
 * - individual targets default to "regenerate"
 *
 * In "repair" mode, units with state === "ready" and matching dependency fingerprints are reused.
 * Downstream stages are automatically marked "run" if an upstream dependency runs.
 */
export function planReelGeneration(record: ShortReelRecord, request: GenerateShortReelRequest): PlannedReelStage[] {
  const target = request.target;
  const mode: ReelGenerationMode = request.mode ?? (target === "package" ? "repair" : "regenerate");

  if (target === "package") {
    return planPackageGeneration(record, mode);
  }

  return planIndividualTarget(record, target);
}

function planPackageGeneration(record: ShortReelRecord, mode: ReelGenerationMode): PlannedReelStage[] {
  if (mode === "regenerate") {
    return [
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "script", action: "run", dependsOn: ["preflight"] },
      { stage: "style", action: "run", dependsOn: ["script"] },
      { stage: "cover", action: "run", dependsOn: ["style"] },
      { stage: "publishing", action: "run", dependsOn: ["script"] },
      { stage: "finalize", action: "run", dependsOn: ["cover", "publishing"] },
    ];
  }

  // Repair mode: determine reuse vs run based on readiness and dependency fingerprints
  const isScriptReady =
    record.units.script.state === "ready" &&
    !!record.script &&
    (!record.stale_segments || record.stale_segments.length === 0) &&
    (record.units.script.accepted_dependency_fingerprint === null ||
      record.units.script.accepted_dependency_fingerprint === computeDependencyFingerprint("script", record));

  const scriptAction: "run" | "reuse" = isScriptReady ? "reuse" : "run";

  // Style (references) depends on script
  const isStyleReady =
    scriptAction === "reuse" &&
    record.units.references.state === "ready" &&
    !!record.units.references.last_accepted_payload &&
    (record.units.references.accepted_dependency_fingerprint === null ||
      record.units.references.accepted_dependency_fingerprint === computeDependencyFingerprint("references", record));

  const styleAction: "run" | "reuse" = isStyleReady ? "reuse" : "run";

  // Cover depends on style
  const isCoverReady =
    styleAction === "reuse" &&
    record.units.cover.state === "ready" &&
    !!record.units.cover.last_accepted_payload &&
    (record.units.cover.accepted_dependency_fingerprint === null ||
      record.units.cover.accepted_dependency_fingerprint === computeDependencyFingerprint("cover", record));

  const coverAction: "run" | "reuse" = isCoverReady ? "reuse" : "run";

  // Publishing depends on script
  const isPublishingReady =
    scriptAction === "reuse" &&
    record.units.publishing.state === "ready" &&
    !!record.units.publishing.last_accepted_payload &&
    (record.units.publishing.accepted_dependency_fingerprint === null ||
      record.units.publishing.accepted_dependency_fingerprint === computeDependencyFingerprint("publishing", record));

  const publishingAction: "run" | "reuse" = isPublishingReady ? "reuse" : "run";

  const allReused = scriptAction === "reuse" && styleAction === "reuse" && coverAction === "reuse" && publishingAction === "reuse";

  const preflightAction: "run" | "reuse" = allReused ? "reuse" : "run";
  const finalizeAction: "run" | "reuse" = allReused ? "reuse" : "run";

  return [
    { stage: "preflight", action: preflightAction, dependsOn: [] },
    { stage: "script", action: scriptAction, dependsOn: ["preflight"] },
    { stage: "style", action: styleAction, dependsOn: ["script"] },
    { stage: "cover", action: coverAction, dependsOn: ["style"] },
    { stage: "publishing", action: publishingAction, dependsOn: ["script"] },
    { stage: "finalize", action: finalizeAction, dependsOn: ["cover", "publishing"] },
  ];
}

function planIndividualTarget(record: ShortReelRecord, target: GenerateShortReelRequest["target"]): PlannedReelStage[] {
  const isScriptCurrent =
    record.units.script.state === "ready" &&
    !!record.script &&
    (!record.stale_segments || record.stale_segments.length === 0) &&
    (record.units.script.accepted_dependency_fingerprint === null ||
      record.units.script.accepted_dependency_fingerprint === computeDependencyFingerprint("script", record));

  switch (target) {
    case "script": {
      return [
        { stage: "preflight", action: "run", dependsOn: [] },
        { stage: "script", action: "run", dependsOn: ["preflight"] },
      ];
    }

    case "segment_1":
    case "segment_2":
    case "segment_3": {
      if (!record.script) {
        throw new PackageServiceError("VALIDATION_FAILED", "Generate a complete script before regenerating one segment.");
      }
      return [
        { stage: "preflight", action: "run", dependsOn: [] },
        { stage: "script", action: "run", dependsOn: ["preflight"] },
      ];
    }

    case "references": {
      if (!isScriptCurrent) {
        throw new PackageServiceError("VALIDATION_FAILED", "A current script is required before generating references.");
      }
      return [
        { stage: "preflight", action: "run", dependsOn: [] },
        { stage: "style", action: "run", dependsOn: ["preflight"] },
      ];
    }

    case "cover": {
      if (!isScriptCurrent) {
        throw new PackageServiceError("VALIDATION_FAILED", "A current script is required before generating a cover.");
      }
      const isReferencesCurrent =
        record.units.references.state === "ready" &&
        !!record.units.references.last_accepted_payload &&
        (record.units.references.accepted_dependency_fingerprint === null ||
          record.units.references.accepted_dependency_fingerprint === computeDependencyFingerprint("references", record));

      if (!isReferencesCurrent) {
        throw new PackageServiceError("VALIDATION_FAILED", "Ready references are required before generating a cover.");
      }

      return [
        { stage: "preflight", action: "run", dependsOn: [] },
        { stage: "cover", action: "run", dependsOn: ["preflight"] },
      ];
    }

    case "publishing": {
      if (!isScriptCurrent) {
        throw new PackageServiceError("VALIDATION_FAILED", "A current script is required before generating publishing.");
      }
      return [
        { stage: "preflight", action: "run", dependsOn: [] },
        { stage: "publishing", action: "run", dependsOn: ["preflight"] },
      ];
    }

    default: {
      throw new PackageServiceError("VALIDATION_FAILED", `Unknown generation target: ${target as string}`);
    }
  }
}

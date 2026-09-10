import {
  ShortReelSourceSnapshotSchema,
  validateReelScript,
  type ShortReelEditCommand,
  type ShortReelRecord,
  type ReelScript,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { affectedReelUnits, computeDependencyFingerprint, invalidatedDownstreamSegments } from "../shortReel/dependencyPolicy.js";
import { refreshCompiledReelPrompts } from "../shortReel/compiledPromptRefresh.js";

export function applyShortReelEdit(updated: ShortReelRecord, validatedCommand: ShortReelEditCommand): void {
  // Retire in-flight attempts for affected units per the Dependency Matrix
  const affected = affectedReelUnits(validatedCommand);
  for (const key of affected) {
    const unit = updated.units[key];
    unit.current_attempt = null;
    if (unit.state === "pending") {
      unit.state = unit.last_accepted_payload ? "stale" : "missing";
    }
  }

  switch (validatedCommand.kind) {
    case "update_model_note": {
      updated.model_note = validatedCommand.model_note;
      refreshCompiledReelPrompts(updated);
      break;
    }

    case "update_script": {
      const validation = validateReelScript(validatedCommand.script, updated.source, [], validatedCommand.display_projection);
      if (!validation.valid) {
        throw new RepositoryError(`Invalid script: ${validation.errors.join("; ")}`, "INVALID_SCRIPT");
      }
      updated.script = validatedCommand.script;
      updated.stale_segments = [];
      updated.units.script.state = "ready";
      updated.units.script.last_accepted_payload = {
        script: validatedCommand.script,
        compiled_prompts: null,
      };
      updated.units.script.accepted_dependency_fingerprint = computeDependencyFingerprint("script", updated);

      // Downstream invalidation: script change invalidates references, cover, and publishing
      for (const downstreamKey of ["references", "cover", "publishing"] as const) {
        const unit = updated.units[downstreamKey];
        unit.current_attempt = null;
        if (unit.state === "ready") {
          unit.state = "stale";
        }
      }

      refreshCompiledReelPrompts(updated);
      break;
    }

    case "update_segment": {
      if (!updated.script) {
        throw new RepositoryError("Cannot update segment on draft without script", "INVALID_STATE");
      }
      const candidateScript: ReelScript = structuredClone(updated.script);
      candidateScript.segments[validatedCommand.segment_index - 1] = validatedCommand.segment;
      const stale = [
        ...new Set([
          ...(updated.stale_segments ?? []).filter((index) => index !== validatedCommand.segment_index),
          ...invalidatedDownstreamSegments(validatedCommand.segment_index),
        ]),
      ];
      const validation = validateReelScript(candidateScript, updated.source, stale, validatedCommand.display_projection);
      if (!validation.valid) {
        throw new RepositoryError(`Invalid script after segment update: ${validation.errors.join("; ")}`, "INVALID_SCRIPT");
      }
      updated.script = candidateScript;
      updated.stale_segments = stale;
      updated.units.script.state = stale.length ? "stale" : "ready";
      updated.units.script.last_accepted_payload = {
        script: candidateScript,
        compiled_prompts: null,
      };
      updated.units.script.accepted_dependency_fingerprint = computeDependencyFingerprint("script", updated);

      // Downstream invalidation: script segment change invalidates references, cover, and publishing
      for (const downstreamKey of ["references", "cover", "publishing"] as const) {
        const unit = updated.units[downstreamKey];
        unit.current_attempt = null;
        if (unit.state === "ready") {
          unit.state = "stale";
        }
      }

      refreshCompiledReelPrompts(updated);
      break;
    }

    case "update_references": {
      updated.units.references.state = "ready";
      updated.units.references.last_accepted_payload = validatedCommand.references;
      updated.units.references.accepted_dependency_fingerprint = computeDependencyFingerprint("references", updated);

      // Downstream invalidation: style reference change invalidates cover only (script & publishing remain unchanged)
      const coverUnit = updated.units.cover;
      coverUnit.current_attempt = null;
      if (coverUnit.state === "ready") {
        coverUnit.state = "stale";
      }

      refreshCompiledReelPrompts(updated);
      break;
    }

    case "update_cover": {
      updated.units.cover.state = "ready";
      updated.units.cover.last_accepted_payload = validatedCommand.cover;
      updated.units.cover.accepted_dependency_fingerprint = computeDependencyFingerprint("cover", updated);
      break;
    }

    case "update_publishing": {
      updated.units.publishing.state = "ready";
      updated.units.publishing.last_accepted_payload = validatedCommand.publishing;
      updated.units.publishing.accepted_dependency_fingerprint = computeDependencyFingerprint("publishing", updated);
      break;
    }

    case "replace_source_question": {
      const parsedSource = ShortReelSourceSnapshotSchema.parse(validatedCommand.source);
      updated.source = parsedSource;
      updated.script = null;
      updated.stale_segments = [];
      for (const unitKey of ["references", "script", "cover", "publishing"] as const) {
        const unit = updated.units[unitKey];
        unit.current_attempt = null;
        unit.state = unit.last_accepted_payload ? "stale" : "missing";
      }
      break;
    }
  }
}

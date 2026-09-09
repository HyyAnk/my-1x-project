import {
  ShortReelSourceSnapshotSchema,
  validateReelScript,
  type ShortReelEditCommand,
  type ShortReelRecord,
  type ReelScript,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { invalidatedDownstreamSegments } from "../shortReel/dependencyPolicy.js";

export function applyShortReelEdit(updated: ShortReelRecord, validatedCommand: ShortReelEditCommand): void {
  const retired =
    validatedCommand.kind === "replace_source_question"
      ? (["references", "script", "cover", "publishing"] as const)
      : validatedCommand.kind === "update_references"
        ? (["references", "script", "cover"] as const)
        : validatedCommand.kind === "update_script" || validatedCommand.kind === "update_segment"
          ? (["script"] as const)
          : validatedCommand.kind === "update_cover"
            ? (["cover"] as const)
            : validatedCommand.kind === "update_publishing"
              ? (["publishing"] as const)
              : [];
  for (const key of retired) {
    const unit = updated.units[key];
    unit.current_attempt = null;
    if (unit.state === "pending") unit.state = unit.last_accepted_payload ? "stale" : "missing";
  }
  switch (validatedCommand.kind) {
    case "update_model_note": {
      updated.model_note = validatedCommand.model_note;
      if (updated.units.script.last_accepted_payload) updated.units.script.last_accepted_payload.compiled_prompts = null;
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
      break;
    }
    case "update_references": {
      updated.units.references.state = "ready";
      updated.units.references.last_accepted_payload = validatedCommand.references;
      if (updated.units.script.state === "ready") updated.units.script.state = "stale";
      if (updated.units.cover.state === "ready") updated.units.cover.state = "stale";
      break;
    }
    case "update_publishing": {
      updated.units.publishing.state = "ready";
      updated.units.publishing.last_accepted_payload = validatedCommand.publishing;
      break;
    }
    case "update_cover": {
      updated.units.cover.state = "ready";
      updated.units.cover.last_accepted_payload = validatedCommand.cover;
      break;
    }
    case "replace_source_question": {
      const parsedSource = ShortReelSourceSnapshotSchema.parse(validatedCommand.source);
      updated.source = parsedSource;
      updated.script = null;
      updated.stale_segments = [];
      updated.units.references.state = updated.units.references.last_accepted_payload ? "stale" : "missing";
      updated.units.script.state = updated.units.script.last_accepted_payload ? "stale" : "missing";
      updated.units.cover.state = updated.units.cover.last_accepted_payload ? "stale" : "missing";
      updated.units.publishing.state = updated.units.publishing.last_accepted_payload ? "stale" : "missing";
      break;
    }
  }
}

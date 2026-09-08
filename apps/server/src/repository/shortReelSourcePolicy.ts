import { CompleteShortReelSourceSnapshotSchema, type ShortReelEditCommand, type ShortReelSourceSnapshot } from "@studio/shared";
import { RepositoryError } from "./errors.js";

export function requireCompleteShortReelSource(source: ShortReelSourceSnapshot) {
  if (source.fidelity === "incomplete" || !source.original_question) {
    throw new RepositoryError("Repair the incomplete source before creating or updating creative content", "INCOMPLETE_SOURCE");
  }
  const parsed = CompleteShortReelSourceSnapshotSchema.safeParse(source);
  if (!parsed.success) throw new RepositoryError("Source provenance or canonical content is invalid", "INVALID_SOURCE");
  return parsed.data;
}

export function assertShortReelSourceMutation(source: ShortReelSourceSnapshot, command: ShortReelEditCommand): void {
  if (command.kind !== "update_model_note" && command.kind !== "replace_source_question") {
    requireCompleteShortReelSource(source);
  }
}

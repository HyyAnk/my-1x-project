import { nowIso, type IntroOutroClipKind, type IntroOutroScriptProvenance } from "@studio/shared";
import { IntroOutroScriptError } from "../../introOutroScripts/errors.js";
import type { IntroOutroScriptRepository } from "../../introOutroScripts/repository.js";

export async function validateUploadScriptProvenance(input: {
  scripts: IntroOutroScriptRepository;
  channelId: string;
  stylePresetId: string | undefined;
  clipKind: IntroOutroClipKind;
  provenance: { project_id: string; revision_id: string } | undefined;
}): Promise<IntroOutroScriptProvenance | undefined> {
  if (!input.provenance) return undefined;
  const project = await input.scripts.getProject(input.channelId, input.provenance.project_id);
  const revision = await input.scripts.getRevision(input.channelId, input.provenance.project_id, input.provenance.revision_id);
  if (revision.channel_id !== input.channelId || revision.clip_kind !== input.clipKind) {
    throw new IntroOutroScriptError("The linked script revision does not match this upload clip", "UPLOAD_PROVENANCE_INVALID");
  }
  if (project.approved_revision_ids[input.clipKind] !== revision.revision_id) {
    throw new IntroOutroScriptError("Only the approved script revision can be linked to an upload", "UPLOAD_REVISION_NOT_APPROVED");
  }
  if (!input.stylePresetId || project.style_preset_id !== input.stylePresetId || revision.style_preset_id !== input.stylePresetId) {
    throw new IntroOutroScriptError("The linked script revision belongs to another Intro & Outro category", "UPLOAD_CATEGORY_MISMATCH");
  }
  return {
    project_id: project.project_id,
    revision_id: revision.revision_id,
    style_preset_id: revision.style_preset_id,
    context_fingerprint: revision.context_fingerprint,
    linked_at: nowIso(),
  };
}

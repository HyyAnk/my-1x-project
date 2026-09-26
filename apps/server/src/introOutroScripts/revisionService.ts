import path from "node:path";
import {
  IntroOutroScriptRevisionSchema,
  makeId,
  nowIso,
  type CreativeSeed,
  type IntroOutroClipKind,
  type IntroOutroScriptContent,
  type IntroOutroScriptProject,
  type IntroOutroScriptRevision,
} from "@studio/shared";
import type { ResolvedIntroOutroContext, ResolvedReference } from "./contextResolver.js";
import { IntroOutroScriptError } from "./errors.js";
import { fingerprint } from "./fingerprint.js";
import { INTRO_OUTRO_TEMPLATE_VERSION } from "./promptCompiler.js";
import type { IntroOutroScriptRepository } from "./repository.js";
import { hasBlockingIssues, validateScriptContent } from "./validation.js";

type CheckpointInput = {
  scripts: IntroOutroScriptRepository;
  context: ResolvedIntroOutroContext;
  project: IntroOutroScriptProject;
  clipKind: IntroOutroClipKind;
  content: IntroOutroScriptContent;
  seeds: CreativeSeed[];
  warningAcknowledgements: string[];
  requestedModel: string;
};

function revisionReferences(context: ResolvedIntroOutroContext): IntroOutroScriptRevision["references"] {
  return [
    toReference("mascot_subject", context.mascotReference),
    ...(context.logoReference ? [toReference("channel_logo", context.logoReference)] : []),
  ];
}

function toReference(
  role: "mascot_subject" | "channel_logo",
  reference: ResolvedReference,
): IntroOutroScriptRevision["references"][number] {
  return {
    role,
    asset_id: reference.assetId,
    url: reference.url,
    sha256: reference.sha256,
    mime_type: reference.mimeType,
  };
}

export async function retainContextReferenceSnapshots(input: {
  scripts: IntroOutroScriptRepository;
  context: ResolvedIntroOutroContext;
  channelId: string;
  projectId: string;
}): Promise<void> {
  const references = [
    { role: "mascot_subject", value: input.context.mascotReference },
    ...(input.context.logoReference ? [{ role: "channel_logo", value: input.context.logoReference }] : []),
  ];
  await Promise.all(
    references.map(({ role, value }) =>
      input.scripts.snapshotReference(
        input.channelId,
        input.projectId,
        value.absolutePath,
        `${role}-${value.sha256}${path.extname(value.absolutePath).toLowerCase()}`,
      ),
    ),
  );
}

export async function checkpointDraft(input: CheckpointInput): Promise<IntroOutroScriptRevision> {
  const identity = input.context.identity;
  if (!identity || !["reviewed", "ready"].includes(input.context.publicContext.identity_status)) {
    throw new IntroOutroScriptError("Review the current mascot style identity before saving a revision", "IDENTITY_REVIEW_REQUIRED");
  }
  const draft = input.project.drafts[input.clipKind];
  if (!draft.seed_selection) {
    throw new IntroOutroScriptError("Select creative seeds before saving a revision", "SEED_COMBINATION_INVALID");
  }
  const directions = input.content.production_directions;
  if (!directions || (!input.context.logoReference && directions.logo_mode !== "none")) {
    throw new IntroOutroScriptError("Production directions must match the supplied logo reference", "SCRIPT_VALIDATION_FAILED");
  }
  const companionKind = input.clipKind === "intro" ? "outro" : "intro";
  const companionContent = input.project.drafts[companionKind].content;
  const companion = companionContent?.identity.profile_id === identity.profile_id ? companionContent : undefined;
  if (
    companion &&
    (JSON.stringify(input.content.style) !== JSON.stringify(companion.style) ||
      (companion.production_directions &&
        (directions.logo_mode !== companion.production_directions.logo_mode ||
          directions.logo_placement !== companion.production_directions.logo_placement)))
  ) {
    throw new IntroOutroScriptError("Intro and Outro must share their stage, style and logo placement", "SCRIPT_VALIDATION_FAILED");
  }
  const issues = validateScriptContent(input.content, identity, input.seeds);
  if (hasBlockingIssues(issues)) {
    throw new IntroOutroScriptError("Resolve blocking validation errors before saving a revision", "SCRIPT_VALIDATION_FAILED");
  }

  await retainContextReferenceSnapshots({
    scripts: input.scripts,
    context: input.context,
    channelId: input.project.channel_id,
    projectId: input.project.project_id,
  });
  const revisions = await input.scripts.listRevisions(input.project.channel_id, input.project.project_id);
  const references = revisionReferences(input.context);
  return IntroOutroScriptRevisionSchema.parse({
    schema_version: 1,
    revision_id: makeId(`script_${input.clipKind}`),
    project_id: input.project.project_id,
    channel_id: input.project.channel_id,
    style_preset_id: input.project.style_preset_id,
    clip_kind: input.clipKind,
    revision_number: revisions.filter((item) => item.clip_kind === input.clipKind).length + 1,
    origin: "edited",
    content: input.content,
    identity_snapshot: identity,
    seed_selection: draft.seed_selection,
    seed_snapshot: input.seeds,
    references,
    context_fingerprint: fingerprint({
      identity,
      references,
      seeds: input.seeds,
      duration: input.content.production.target_duration_seconds,
      template: INTRO_OUTRO_TEMPLATE_VERSION,
    }),
    template_version: INTRO_OUTRO_TEMPLATE_VERSION,
    requested_model: input.requestedModel,
    effective_model: null,
    validation_issues: issues,
    warning_acknowledgements: input.warningAcknowledgements,
    created_at: nowIso(),
  });
}

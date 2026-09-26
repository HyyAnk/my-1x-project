import {
  IntroOutroScriptContentSchema,
  IntroOutroScriptRevisionSchema,
  makeId,
  nowIso,
  type IntroOutroScriptRevision,
} from "@studio/shared";
import type { ScriptGenerationInput } from "./generation.types.js";
import { fingerprint } from "./fingerprint.js";
import { INTRO_OUTRO_TEMPLATE_VERSION } from "./promptCompiler.js";
import type { validateScriptContent } from "./validation.js";

type GeneratedRevisionInput = Omit<ScriptGenerationInput, "clips"> & ScriptGenerationInput["clips"][number];

export function buildGeneratedRevision(
  params: GeneratedRevisionInput,
  content: ReturnType<typeof IntroOutroScriptContentSchema.parse>,
  validationIssues: ReturnType<typeof validateScriptContent>,
): IntroOutroScriptRevision {
  const references = [
    {
      role: "mascot_subject" as const,
      asset_id: params.context.mascotReference.assetId,
      url: params.context.mascotReference.url,
      sha256: params.context.mascotReference.sha256,
      mime_type: params.context.mascotReference.mimeType,
    },
    ...(params.context.logoReference
      ? [
          {
            role: "channel_logo" as const,
            asset_id: params.context.logoReference.assetId,
            url: params.context.logoReference.url,
            sha256: params.context.logoReference.sha256,
            mime_type: params.context.logoReference.mimeType,
          },
        ]
      : []),
  ];
  return IntroOutroScriptRevisionSchema.parse({
    schema_version: 1,
    revision_id: makeId(`script_${params.clipKind}`),
    project_id: params.projectId,
    channel_id: params.context.channel.channel_id,
    style_preset_id: params.context.publicContext.style_preset_id,
    clip_kind: params.clipKind,
    revision_number: params.revisionNumber,
    origin: "generated",
    content,
    identity_snapshot: params.identity,
    seed_selection: params.seedSelection,
    seed_snapshot: params.seeds,
    references,
    context_fingerprint: fingerprint({
      identity: params.identity,
      references,
      seeds: params.seeds,
      duration: params.durationSeconds,
      template: INTRO_OUTRO_TEMPLATE_VERSION,
    }),
    template_version: INTRO_OUTRO_TEMPLATE_VERSION,
    requested_model: params.model,
    effective_model: null,
    validation_issues: validationIssues,
    warning_acknowledgements: [],
    created_at: nowIso(),
  });
}

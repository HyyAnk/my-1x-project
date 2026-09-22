import {
  MascotCapabilityIdSchema,
  MascotStyleIdentityProfileSchema,
  makeId,
  nowIso,
  type MascotCapabilityId,
  type MascotStyleIdentityProfile,
} from "@studio/shared";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { executeSinglePromptText } from "../utils/promptSanitizer.js";
import type { ResolvedIntroOutroContext } from "./contextResolver.js";
import { parseLlmJson } from "./jsonOutput.js";

const ANALYSIS_VERSION = "mascot-style-identity-v2";

export async function analyzeMascotStyleIdentity(params: {
  client: LLMClient;
  context: ResolvedIntroOutroContext;
  model: string;
  signal: AbortSignal;
}): Promise<MascotStyleIdentityProfile> {
  const { client, context, model, signal } = params;
  const prompt = buildIdentityPrompt(context);
  const raw = await executeSinglePromptText(client, prompt, {
    modelOverride: model,
    signal,
    timeoutMs: 180_000,
    requireCompleteOutput: true,
    imageAttachments: [
      {
        path: context.mascotReference.absolutePath,
        mimeType: context.mascotReference.mimeType,
        role: "mascot_subject",
      },
    ],
  });
  const parsed = parseLlmJson(raw);
  const now = nowIso();
  const capabilities = Object.fromEntries(
    MascotCapabilityIdSchema.options.map((id) => {
      const value = (parsed.capabilities as Record<string, unknown> | undefined)?.[id];
      return [id, value === "supported" || value === "unsupported" ? value : "unknown"];
    }),
  ) as Record<MascotCapabilityId, "supported" | "unsupported" | "unknown">;

  return MascotStyleIdentityProfileSchema.parse({
    schema_version: 1,
    profile_id: makeId("mascot_identity"),
    mascot_id: context.mascot.id,
    mascot_style_id: context.style.id,
    style_preset_id: context.publicContext.style_preset_id,
    style_revision: context.style.style_revision ?? 1,
    reference_asset_url: context.mascotReference.url,
    reference_sha256: context.mascotReference.sha256,
    reference_mime_type: context.mascotReference.mimeType,
    summary: parsed.summary,
    morphology: parsed.morphology ?? [],
    features: parsed.features ?? [],
    capabilities,
    motion_constraints: parsed.motion_constraints ?? [],
    palette: parsed.palette ?? [],
    style_description: parsed.style_description ?? context.style.keyword,
    allowed_accessories: parsed.allowed_accessories ?? [],
    status: "needs_review",
    source: "antigravity_vision",
    analysis_model: model,
    analysis_version: ANALYSIS_VERSION,
    created_at: now,
    updated_at: now,
    reviewed_at: null,
  });
}

function buildIdentityPrompt(context: ResolvedIntroOutroContext): string {
  return `You are analyzing one mascot reference image for reusable short-form animation scripting.

Inspect the attached mascot_subject image. Describe only visible evidence. Do not assume humanoid anatomy, gender, personality, speech, hands, feet, wings, a tail, clothing, or material properties that are not visible. Mark uncertain capabilities as "unknown". Permanent visual details must be separate features. Use stable snake_case feature IDs. Return JSON only.
Separate visible surface construction from inferred internal biology. Do not claim cartilage, mechanical hinge axes, aerodynamic lift or hidden joints from a single image. Use unknown for uncertain material/rigidity. Rigid surfaces can have articulated joints; flexible does not imply unlimited stretching. Do not infer ride_vehicle from legs or grasping, speech from a mouth, or flight from wings. Left/right is character-relative; include screen-side evidence for asymmetrical features. Include supporting surface markings and pattern placement. Visibility rules describe natural occlusion, not mandatory visibility from every angle.

Selected style: ${context.style.name}
Style keyword supplied by the creator: ${context.style.keyword || "none"}

Required JSON shape:
{
  "summary": "concise identity-preserving description",
  "morphology": ["observable fact"],
  "features": [{"id":"feature_id","description":"...","body_anchor":"...","material":"...","rigidity":"rigid|flexible|unknown","importance":"signature|important|supporting","visibility_rule":"..."}],
  "capabilities": {"locomotion":"supported|unsupported|unknown","grasping":"...","pointing":"...","waving":"...","flight":"...","facial_expression":"...","speech":"...","ride_vehicle":"...","hold_props":"..."},
  "motion_constraints": ["constraint grounded in visible construction"],
  "palette": ["#RRGGBB"],
  "style_description": "visual medium, rendering, and motion language",
  "allowed_accessories": ["only clearly removable accessories already visible"]
}`;
}

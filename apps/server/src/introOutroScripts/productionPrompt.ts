import type { IntroOutroReferenceAsset, IntroOutroScriptRevision } from "@studio/shared";
import { compileCompactProductionPrompt } from "./compactProductionPrompt.js";

export function referenceFilename(reference: IntroOutroReferenceAsset): string {
  const extension = reference.mime_type === "image/jpeg" ? "jpg" : reference.mime_type === "image/webp" ? "webp" : "png";
  return `${reference.role}.${extension}`;
}

export function compileProductionPrompt(revision: IntroOutroScriptRevision): string {
  if (revision.content.production_policy && revision.content.production_directions) return compileCompactProductionPrompt(revision);
  const { content, identity_snapshot: identity } = revision;
  const directions = content.production_directions;
  const logoOverlay = directions?.logo_mode === "post_overlay";
  const logoSupplied = directions?.logo_mode === "supplied_reference";
  const identityText = identity
    ? [
        identity.summary,
        ...identity.features.map(
          (feature) =>
            `- ${feature.importance}: ${feature.description}; anchor: ${feature.body_anchor}; material: ${feature.material}; rigidity: ${feature.rigidity}; visibility: ${feature.visibility_rule}.`,
        ),
        ...identity.motion_constraints.map((constraint) => `- Motion constraint: ${constraint}`),
      ].join("\n")
    : "Follow the attached mascot exactly. This legacy revision has no identity snapshot; manually verify its identity before production.";
  const references = revision.references
    .map((reference) => {
      const filename = referenceFilename(reference);
      if (reference.role === "channel_logo") {
        if (logoOverlay) return `${filename}: editor-only overlay; do not send as a generated scene subject`;
        if (logoSupplied)
          return `${filename}: supplied_reference (EXACT official channel logo asset to be revealed as an in-scene 3D element)`;
        return `${filename}: intact supplied logo reference`;
      }
      if (reference.role === "mascot_subject") {
        return `${filename}: ${directions?.reference_mode ?? "character_reference (EXACT character design)"}`;
      }
      return `${filename}: intact supplied reference`;
    })
    .join("\n");
  return `Create one continuous ${content.production.clip_kind}

REFERENCE ASSETS
Attach the actual files from the export package. Local URLs, IDs and hashes are not image attachments.
${references}

IDENTITY
${identityText}
Preserve all markings, proportions, colors and accessories visible in the reference. Anatomical left/right must not swap. Rigid surfaces keep their shape; only evidenced joints articulate. Natural occlusion is allowed, deletion is not.
${identity ? `Identity palette: ${identity.palette.join(", ")}.` : ""}

SCENE
${content.style.description}
${content.style.staging}
${content.style.motion_language}
${directions ? `Opening: ${directions.opening_state}\nClosing: ${directions.closing_state}\nHold the final composition for ${directions.end_hold_seconds}s.\nLogo: ${directions.logo_mode}; ${directions.logo_placement}.` : "Confirm opening pose, final hold and logo handling before production."}
${logoOverlay ? "Keep the reserved logo region clear. Any logo reveal described below is performed in post-production, not by the video model." : logoSupplied ? "In-scene brand reveal: The official logo is revealed dynamically as an intact 3D element in the scene. Maintain 100% brand fidelity without altering or regenerating the typography." : ""}

ACTION
${content.timeline.map((beat) => `[${beat.start_seconds.toFixed(2)}-${beat.end_seconds.toFixed(2)}s] ${beat.action}`).join("\n")}

CAMERA
${content.camera.map((shot) => `[${shot.start_seconds}-${shot.end_seconds}s] ${shot.framing}; ${shot.movement}`).join("\n")}

AUDIO
${content.voiceover.enabled ? `Voice source: ${directions?.voice_source ?? "confirm speaker"}. ${directions?.voice_source === "narrator" ? "Off-screen narration; no mascot lip-sync." : ""}\n${content.voiceover.lines.map((line) => `[${line.start_seconds}-${line.end_seconds}s] "${line.text}" (${line.delivery})`).join("\n")}` : "No speech or lip-sync."}
Music: ${content.audio.music_direction || "None"}
${content.audio.events.map((event) => `[${event.at_seconds}s] ${event.direction}`).join("\n")}
All audio must finish within the clip. If the video tool does not support audio, create these tracks separately in editing.

CONTINUITY
${content.consistency.restrictions.map((restriction) => `- ${restriction}`).join("\n")}
- Generated visible text: ${content.consistency.allowed_visible_text.join(", ") || (logoSupplied ? "none except the supplied official intact logo" : "none")}.${logoOverlay ? " The original logo text is preserved by the editor-only overlay." : ""}
${logoSupplied ? "- The ONLY text visible is the supplied official logo. No subtitles, no random letters, no watermark." : ""}`;
}

import type { IntroOutroScriptRevision } from "@studio/shared";
import { MASCOT_SPEECH_DIRECTION } from "./mascotDialogue.js";

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim().replace(/[.;]+$/, "")).filter(Boolean))];

export function compileCompactProductionPrompt(revision: IntroOutroScriptRevision): string {
  const { content: c, identity_snapshot: identity } = revision;
  const directions = c.production_directions!;
  const features =
    identity?.features
      .filter((feature) => feature.importance === "signature")
      .slice(0, 4)
      .map((feature) => feature.description) ?? [];
  const logo =
    directions.logo_mode === "supplied_reference"
      ? "Attach channel_logo as the exact official in-scene logo; never redraw, distort or respell its typography."
      : directions.logo_mode === "post_overlay"
        ? "Logo is editor-only: reserve its area; never generate or physically touch it."
        : "No logo.";
  return [
    `Create one continuous ${c.production.clip_kind}`,
    `REFERENCE ASSETS\nAttach mascot_subject as ${directions.reference_mode}. ${logo}`,
    `IDENTITY\n${unique(features).join("; ") || "Match the attached mascot exactly."} Preserve reference anatomy, markings, proportions, colors and accessories; never swap anatomical left/right. Natural occlusion is allowed. Rigid surfaces must not deform.`,
    identity?.motion_constraints.length ? `Motion limits: ${unique(identity.motion_constraints).join("; ")}` : "",
    `SCENE\n${unique([c.style.description, c.style.staging, c.style.motion_language]).join(" ")}\nOpening: ${directions.opening_state}\nLogo placement: ${directions.logo_placement}`,
    `ACTION\n${c.timeline.map((beat) => `[${beat.start_seconds}-${beat.end_seconds}s] ${beat.action} Expression: ${beat.choreography?.expression}. Pose: ${beat.choreography?.end_pose.replaceAll("_", " ")}.${beat.choreography?.secondary_motion === "natural_follow_through" ? " Passive natural follow-through only." : ""}`).join("\n")}`,
    `CAMERA\n${c.camera.map((shot) => `[${shot.start_seconds}-${shot.end_seconds}s] ${shot.framing}; ${shot.movement}`).join("\n")}`,
    c.dialogue_policy ? `CHARACTER PERFORMANCE\n${MASCOT_SPEECH_DIRECTION}` : "",
    `AUDIO\n${c.voiceover.enabled ? `${directions.voice_source === "narrator" ? "Off-screen narrator; no mascot lip-sync." : "Mascot voice."} ${c.voiceover.lines.map((line) => `[${line.start_seconds}-${line.end_seconds}s] "${line.text}" (${line.delivery})`).join(" ")}` : "No speech or lip-sync."}\nMusic: ${c.audio.music_direction || "None"}. ${c.audio.events.map((event) => `[${event.at_seconds}s] ${event.direction}`).join(" ")} End audio within the clip; produce separately if unsupported by the video tool.`,
    `CONTINUITY\n${unique(c.consistency.restrictions).join(" ")} No subtitles or watermark. Additional visible text: ${c.consistency.allowed_visible_text.join(", ") || "none"}. Keep pose and camera still for the last second.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

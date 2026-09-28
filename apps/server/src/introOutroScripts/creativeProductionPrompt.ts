import type { IntroOutroScriptRevision } from "@studio/shared";

/** Export authored directions without injecting a second, code-owned performance. */
export function compileCreativeProductionPrompt(revision: IntroOutroScriptRevision): string {
  const { content: c, identity_snapshot: identity } = revision;
  const directions = c.production_directions!;
  const logo =
    directions.logo_mode === "supplied_reference"
      ? "Attach channel_logo as the exact official in-scene logo; never redraw, distort or respell its typography."
      : directions.logo_mode === "post_overlay"
        ? "Keep the logo area clear for the editor-only overlay; do not generate or physically interact with logo text."
        : "No logo.";
  return [
    `Create one continuous ${c.production.clip_kind}`,
    `REFERENCE ASSETS\nAttach mascot_subject as ${directions.reference_mode}. ${logo}`,
    `IDENTITY\n${identity?.summary ?? "Match the attached mascot exactly."}\n${identity?.features.map((feature) => feature.description).join("; ") ?? ""}\nPreserve anatomy, markings, colors, accessories and anatomical left/right. Rigid surfaces retain their shape; natural occlusion is allowed.`,
    identity?.motion_constraints.length ? `Motion limits: ${identity.motion_constraints.join("; ")}` : "",
    `SCENE\n${c.style.description}\n${c.style.staging}\n${c.style.motion_language}\nPalette: ${c.style.palette.join(", ") || "Match reference"}\nOpening: ${directions.opening_state}\nClosing: ${directions.closing_state}\nLogo placement: ${directions.logo_placement}`,
    `ACTION\n${c.timeline.map((beat) => `[${beat.start_seconds}-${beat.end_seconds}s] ${beat.action}`).join("\n")}`,
    `CAMERA\n${c.camera.map((shot) => `[${shot.start_seconds}-${shot.end_seconds}s] ${shot.framing}; ${shot.movement}`).join("\n")}`,
    c.voiceover.enabled
      ? "CHARACTER PERFORMANCE\nThe visible mascot performs the scheduled speech with synchronized mouth movement. Follow each event's speaker and delivery. Each timed entry is one utterance; repeated wording in different entries is intentional. References in action or sound directions describe the same event, not an extra utterance. Do not add unscheduled speech."
      : "CHARACTER PERFORMANCE\nNo speech or lip-sync.",
    `AUDIO\nGenerate picture, music, SFX and scheduled speech together as one synchronized audiovisual clip.\n${c.voiceover.lines.map((line) => `[${line.start_seconds}-${line.end_seconds}s] "${line.text}" (${line.delivery})`).join("\n")}\nBGM [0-${c.production.target_duration_seconds}s]: ${c.audio.music_direction || "No music"}\n${c.audio.events.map((event) => `[${event.at_seconds}s] ${event.direction}`).join("\n")}\nKeep speech clear above the music and SFX. Sound names are directions, not spoken words. Follow the authored entrance, accents and ending; finish audio within the clip.`,
    `CONTINUITY\n${c.consistency.restrictions.join("\n")}\nNo subtitles or watermark. Additional visible text: ${c.consistency.allowed_visible_text.join(", ") || "none"}.\n${directions.end_hold_seconds > 0 ? `Reserve the authored ${directions.end_hold_seconds}s final non-speaking hold with living follow-through.` : "No mandatory final hold; follow the authored ending."}${c.production.clip_kind === "intro" ? " Hard cut into the quiz at the clip boundary." : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

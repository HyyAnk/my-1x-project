import type { IntroOutroScriptContent, IntroOutroScriptRevision } from "@studio/shared";
import { resolveTransitionArchetype } from "./transitions/transitionArchetypes.js";

function compileFixedSceneEnvironment(content: IntroOutroScriptContent): string {
  const { style } = content;
  const lines: string[] = ["FIXED SCENE ENVIRONMENT (MANDATORY CONSISTENCY)"];

  if (style.description) {
    lines.push(`Stage & Architecture: ${style.description}`);
  }
  if (style.staging) {
    lines.push(`Staging & Spatial Depth: ${style.staging}`);
  }
  if (style.motion_language) {
    lines.push(`Atmosphere & Lighting Dynamics: ${style.motion_language}`);
  }
  if (style.palette && style.palette.length > 0) {
    const validColors = style.palette.map((color) => color.trim()).filter(Boolean);
    if (validColors.length > 0) {
      lines.push(`Visual Color Scheme & Lighting Tones: ${validColors.join(", ")}`);
    }
  }

  return lines.join("\n");
}

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
  if (c.production.clip_kind === "outro" && c.production.target_duration_seconds >= 12) {
    const midpoint = Number((c.production.target_duration_seconds / 2).toFixed(1));
    const archetype = resolveTransitionArchetype(directions.transition_style);
    const fixedEnvironment = compileFixedSceneEnvironment(c);
    const p1Beats = c.timeline.filter((b) => b.start_seconds < midpoint);
    const p2Beats = c.timeline.filter((b) => b.end_seconds > midpoint);
    const p1Voice = c.voiceover.lines.filter((l) => l.start_seconds < midpoint);
    const p2Voice = c.voiceover.lines.filter((l) => l.end_seconds > midpoint);
    const p1Camera = c.camera.filter((s) => s.start_seconds < midpoint);
    const p2Camera = c.camera.filter((s) => s.end_seconds > midpoint);

    return [
      `Create one continuous ${c.production.clip_kind}`,
      `================================================================================
${archetype.part1Title} (0.0s - ${midpoint}s)
================================================================================
REFERENCE ASSETS
Attach mascot_subject as ${directions.reference_mode}.
In-scene logo is not visible yet; reserve upper area for Part 2.

${fixedEnvironment}
Stage Opening: ${directions.opening_state}

ACTION & CAMERA (OVERLAPPING FAST PACING)
${p1Beats.map((beat) => `[${beat.start_seconds}-${Math.min(beat.end_seconds, midpoint)}s] ${beat.action}`).join("\n")}
Camera:
${p1Camera.map((shot) => `[${shot.start_seconds}-${Math.min(shot.end_seconds, midpoint)}s] ${shot.framing}; ${shot.movement}`).join("\n")}

AUDIO & VOICEOVER
${p1Voice.length ? p1Voice.map((line) => `[${line.start_seconds}-${Math.min(line.end_seconds, midpoint)}s] "${line.text}" (${line.delivery})`).join("\n") : "No speech in Part 1."}
Music & SFX:
BGM [0-${midpoint}s]: ${c.audio.music_direction || "High-energy upbeat theme"}.
${c.audio.events.filter((e) => e.at_seconds < midpoint).map((e) => `[${e.at_seconds}s] ${e.direction}`).join("\n")}

CONTINUITY
${archetype.part1Continuity}

================================================================================
${archetype.part2Title} (${midpoint}s - ${c.production.target_duration_seconds}s)
================================================================================
REFERENCE ASSETS
Attach mascot_subject as ${directions.reference_mode}. ${logo}
${archetype.part2StartingState}

${fixedEnvironment}
Logo Placement: ${directions.logo_placement}

ACTION & CAMERA (SNAPPY RECOVERY & INSTANT SPEECH)
${p2Beats.map((beat) => `[${Math.max(beat.start_seconds, midpoint)}-${beat.end_seconds}s] ${beat.action}`).join("\n")}
Camera:
${p2Camera.map((shot) => `[${Math.max(shot.start_seconds, midpoint)}-${shot.end_seconds}s] ${shot.framing}; ${shot.movement}`).join("\n")}

AUDIO & VOICEOVER
${p2Voice.length ? p2Voice.map((line) => `[${line.start_seconds}-${line.end_seconds}s] "${line.text}" (${line.delivery})`).join("\n") : "No speech in Part 2."}
Music & SFX:
BGM [${midpoint}-${c.production.target_duration_seconds}s]: Continuing without interruption, resolving smoothly into the end.
${c.audio.events.filter((e) => e.at_seconds >= midpoint).map((e) => `[${e.at_seconds}s] ${e.direction}`).join("\n")}

CONTINUITY
${archetype.part2Continuity}
Keep the official logo intact.
No subtitles or watermark.
${directions.end_hold_seconds > 0 ? `Reserve the authored ${directions.end_hold_seconds}s final non-speaking hold with living follow-through.` : "No mandatory final hold; follow the authored ending."}`,
    ].join("\n\n");
  }

  return [
    `Create one continuous ${c.production.clip_kind}`,
    `REFERENCE ASSETS\nAttach mascot_subject as ${directions.reference_mode}. ${logo}`,
    `IDENTITY\n${identity?.summary ?? "Match the attached mascot exactly."}\n${identity?.features.map((feature) => feature.description).join("; ") ?? ""}\nPreserve anatomy, markings, colors, accessories and anatomical left/right. Rigid surfaces retain their shape; natural occlusion is allowed.`,
    identity?.motion_constraints.length ? `Motion limits: ${identity.motion_constraints.join("; ")}` : "",
    `SCENE\n${c.style.description}\n${c.style.staging}\n${c.style.motion_language}\nPalette: ${c.style.palette.join(", ") || "Match reference"}\nOpening: ${directions.opening_state}\nClosing: ${directions.closing_state}\nLogo placement: ${directions.logo_placement}`,
    `ACTION\n${c.timeline.map((beat) => `[${beat.start_seconds}-${beat.end_seconds}s] ${beat.action}`).join("\n")}`,
    c.production.clip_kind === "intro" || (c.production.clip_kind === "outro" && c.production.target_duration_seconds < 12)
      ? `CAMERA\n[0-${c.production.target_duration_seconds}s] Single unbroken continuous take, zero camera cuts: ${c.camera.map((shot) => `${shot.framing}; ${shot.movement}`).join(" -> seamlessly continuing into ")}`
      : `CAMERA\n${c.camera.map((shot) => `[${shot.start_seconds}-${shot.end_seconds}s] ${shot.framing}; ${shot.movement}`).join("\n")}`,
    c.voiceover.enabled
      ? "CHARACTER PERFORMANCE\nThe visible mascot performs the scheduled speech with synchronized mouth movement. Follow each event's speaker and delivery. Each timed entry is one utterance; repeated wording in different entries is intentional. References in action or sound directions describe the same event, not an extra utterance. Do not add unscheduled speech."
      : "CHARACTER PERFORMANCE\nNo speech or lip-sync.",
    `AUDIO\nGenerate picture, music, SFX and scheduled speech together as one synchronized audiovisual clip.\n${c.voiceover.lines.map((line) => `[${line.start_seconds}-${line.end_seconds}s] "${line.text}" (${line.delivery})`).join("\n")}\nBGM [0-${c.production.target_duration_seconds}s]: ${c.audio.music_direction || "No music"}\n${c.audio.events.map((event) => `[${event.at_seconds}s] ${event.direction}`).join("\n")}\nKeep speech clear above the music and SFX. Sound names are directions, not spoken words. Follow the authored entrance, accents and ending; finish audio within the clip.`,
    `CONTINUITY\n${c.consistency.restrictions.join("\n")}\n${
      c.production.clip_kind === "intro" || (c.production.clip_kind === "outro" && c.production.target_duration_seconds < 12)
        ? "Single continuous unbroken camera take: absolute zero camera cuts, zero scene transitions, and zero shot edits. The entire " +
          c.production.target_duration_seconds +
          "s video must remain in one uninterrupted take.\n"
        : ""
    }No subtitles or watermark. Additional visible text: ${c.consistency.allowed_visible_text.join(", ") || "none"}.\n${directions.end_hold_seconds > 0 ? `Reserve the authored ${directions.end_hold_seconds}s final non-speaking hold with living follow-through.` : "No mandatory final hold; follow the authored ending."}${c.production.clip_kind === "intro" ? " Hard cut into the quiz occurs outside this clip during final timeline editing." : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

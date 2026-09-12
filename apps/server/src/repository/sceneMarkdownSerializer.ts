import { SceneSchema, type Scene } from "@studio/shared";
import { stripEditorialOverlayInstructions } from "../visualPrompt.js";

function formatAudioMetadata(scene: Scene): string {
  if (!scene.audio_asset_path) return "";
  return `<!-- Audio asset: ${scene.audio_asset_path} -->\n<!-- Audio generated at: ${scene.audio_generated_at ?? ""} -->\n<!-- Audio duration: ${scene.audio_duration_seconds ?? ""} -->`;
}

export function serializeSingleScene(scene: Scene): string {
  const parts = [
    `# Scene ${scene.scene_number}`,
    `**Duration:** ${scene.duration_seconds} seconds`,
    "## Dialogue",
    scene.dialogue.trim(),
    "## Video Prompt",
    stripEditorialOverlayInstructions(scene.visual_prompt.trim()),
    "## Notes",
    `- Transition: ${scene.transition_note.trim()}`,
    `- Continuity: ${stripEditorialOverlayInstructions(scene.continuity_note.trim())}`,
    `- Sequence: ${scene.sequence_id.trim()} | ${scene.sequence_title.trim()}`,
    `- Shot: ${scene.shot_id.trim() || `shot-${scene.scene_number}`}`,
    `- Asset type: ${scene.asset_type}`,
    `- Continuity bundle: ${scene.continuity_bundle_id.trim()}`,
    `- Reference assets: ${scene.reference_asset_ids.join(", ")}`,
    `- Source IDs: ${scene.source_ids.join(", ")}`,
    `- Reconstruction: ${scene.reconstruction ? "yes" : "no"}`,
    `- Sound: ${scene.sound_cue.trim()}`,
    `- Overlay kind: ${scene.editorial_overlay.kind}`,
    `- Overlay text: ${scene.editorial_overlay.text.replace(/\s+/g, " ").trim()}`,
    `- Overlay motion: ${scene.editorial_overlay.motion}`,
    `- Overlay placement: ${scene.editorial_overlay.placement}`,
    `- Overlay duration: ${scene.editorial_overlay.duration_seconds ?? ""}`,
    `- Overlay data: ${JSON.stringify(scene.editorial_overlay.data)}`,
    `- Overlay sources: ${scene.editorial_overlay.source_ids.join(", ")}`,
    `- Quiz data: ${JSON.stringify(scene.quiz)}`,
    formatAudioMetadata(scene),
  ];

  return `${parts.join("\n\n")}\n`;
}

export function serializeScenes(scenes: Scene[]): string {
  const parsed = scenes.map((scene) => SceneSchema.parse(scene));
  return parsed.map((scene) => serializeSingleScene(scene)).join("\n");
}

export function serializeDialogue(scenes: Scene[]): string {
  const parsed = scenes.map((scene) => SceneSchema.parse(scene));
  return `# Narration Timeline\n\n${parsed
    .map(
      (scene) =>
        `## Shot ${scene.scene_number} — ${scene.sequence_title}\n\n**Duration:** ${scene.duration_seconds}s\n\n${scene.dialogue.trim()}`,
    )
    .join("\n\n")}\n`;
}

export function serializePrompts(scenes: Scene[]): string {
  const parsed = scenes.map((scene) => SceneSchema.parse(scene));
  return `# Video Prompts\n\n${parsed
    .map(
      (scene) =>
        `## Shot ${scene.scene_number} — ${scene.sequence_title}\n\n- Asset type: ${scene.asset_type}\n- Continuity bundle: ${scene.continuity_bundle_id}\n- Reference assets: ${scene.reference_asset_ids.join(", ")}\n- Source IDs: ${scene.source_ids.join(", ")}\n- Editorial overlay: ${scene.editorial_overlay.kind} / ${scene.editorial_overlay.motion} / ${scene.editorial_overlay.placement}\n- Overlay text: ${scene.editorial_overlay.text.replace(/\s+/g, " ").trim()}\n- Overlay data: ${JSON.stringify(scene.editorial_overlay.data)}\n\n${stripEditorialOverlayInstructions(scene.visual_prompt.trim())}`,
    )
    .join("\n\n")}\n`;
}

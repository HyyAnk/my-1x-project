import { SceneSchema, type Scene } from "@studio/shared";
import { stripEditorialOverlayInstructions } from "../visualPrompt.js";

export function parseScenes(markdown: string, episodeId: string): Scene[] {
  const blocks = markdown.split(/^# Scene\s+\d+\s*$/gim).slice(1);
  return blocks.map((block, index) => {
    const duration = Number(block.match(/\*\*Duration:\*\*\s*([\d.]+)/i)?.[1] ?? 6);
    const dialogue = block.match(/## Dialogue\s*\n([\s\S]*?)(?=\n## Video Prompt|$)/i)?.[1]?.trim() ?? "";
    const prompt = block.match(/## Video Prompt\s*\n([\s\S]*?)(?=\n## Notes|$)/i)?.[1]?.trim() ?? "";
    const notes = block.match(/## Notes\s*\n([\s\S]*?)(?=\n<!--|$)/i)?.[1] ?? "";
    const transition = notes.match(/- Transition:[ \t]*(.*)/i)?.[1]?.trim() ?? "";
    const continuity = stripEditorialOverlayInstructions(notes.match(/- Continuity:[ \t]*(.*)/i)?.[1]?.trim() ?? "");
    const sequenceLine = notes.match(/- Sequence:[ \t]*(.*)/i)?.[1]?.trim() ?? "sequence-1 | Sequence 1";
    const [sequenceId, ...sequenceTitleParts] = sequenceLine.split("|").map((value) => value.trim());
    const listValue = (label: string) => (notes.match(new RegExp(`- ${label}:[ \\t]*(.*)`, "i"))?.[1] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const audioAssetPath = block.match(/<!--\s*Audio asset:\s*(.*?)\s*-->/i)?.[1]?.trim() || null;
    const audioGeneratedAt = block.match(/<!--\s*Audio generated at:\s*(.*?)\s*-->/i)?.[1]?.trim() || null;
    const audioDuration = block.match(/<!--\s*Audio duration:\s*([\d.]+)\s*-->/i)?.[1];
    const overlayData = parseOverlayData(notes.match(/- Overlay data:[ \t]*(.*)/i)?.[1] ?? "");
    const quizData = parseQuizData(notes.match(/- Quiz data:[ \t]*(.*)/i)?.[1] ?? "");
    return SceneSchema.parse({
      scene_id: `${episodeId}_scene_${index + 1}`,
      episode_id: episodeId,
      scene_number: index + 1,
      duration_seconds: duration,
      dialogue,
      visual_prompt: stripEditorialOverlayInstructions(prompt),
      transition_note: transition,
      continuity_note: continuity,
      sequence_id: sequenceId || "sequence-1",
      sequence_title: sequenceTitleParts.join(" | ") || "Sequence 1",
      shot_id: notes.match(/- Shot:[ \t]*(.*)/i)?.[1]?.trim() ?? `shot-${index + 1}`,
      asset_type: notes.match(/- Asset type:[ \t]*(.*)/i)?.[1]?.trim() || "ai_reconstruction",
      continuity_bundle_id: notes.match(/- Continuity bundle:[ \t]*(.*)/i)?.[1]?.trim() ?? "",
      reference_asset_ids: listValue("Reference assets"),
      source_ids: listValue("Source IDs"),
      reconstruction: !/^no$/i.test(notes.match(/- Reconstruction:[ \t]*(.*)/i)?.[1]?.trim() ?? "yes"),
      sound_cue: notes.match(/- Sound:[ \t]*(.*)/i)?.[1]?.trim() ?? "",
      editorial_overlay: {
        kind: notes.match(/- Overlay kind:[ \t]*(.*)/i)?.[1]?.trim() || "none",
        text: notes.match(/- Overlay text:[ \t]*(.*)/i)?.[1]?.trim() ?? "",
        motion: notes.match(/- Overlay motion:[ \t]*(.*)/i)?.[1]?.trim() || "none",
        placement: notes.match(/- Overlay placement:[ \t]*(.*)/i)?.[1]?.trim() || "lower_third",
        duration_seconds: Number(notes.match(/- Overlay duration:[ \t]*([\d.]+)/i)?.[1] ?? 0) || null,
        data: overlayData,
        source_ids: listValue("Overlay sources"),
      },
      quiz: quizData,
      audio_asset_path: audioAssetPath,
      audio_generated_at: audioGeneratedAt,
      audio_duration_seconds: audioDuration ? Number(audioDuration) : null,
    });
  });
}

export function serializeScenes(scenes: Scene[]): string {
  scenes = scenes.map((scene) => SceneSchema.parse(scene));
  return scenes.map((scene) => `${[
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
    scene.audio_asset_path ? `<!-- Audio asset: ${scene.audio_asset_path} -->\n<!-- Audio generated at: ${scene.audio_generated_at ?? ""} -->\n<!-- Audio duration: ${scene.audio_duration_seconds ?? ""} -->` : "",
  ].join("\n\n")}\n`).join("\n");
}

export function serializeDialogue(scenes: Scene[]): string {
  scenes = scenes.map((scene) => SceneSchema.parse(scene));
  return `# Narration Timeline\n\n${scenes.map((scene) => `## Shot ${scene.scene_number} — ${scene.sequence_title}\n\n**Duration:** ${scene.duration_seconds}s\n\n${scene.dialogue.trim()}`).join("\n\n")}\n`;
}

export function serializePrompts(scenes: Scene[]): string {
  scenes = scenes.map((scene) => SceneSchema.parse(scene));
  return `# Video Prompts\n\n${scenes.map((scene) => `## Shot ${scene.scene_number} — ${scene.sequence_title}\n\n- Asset type: ${scene.asset_type}\n- Continuity bundle: ${scene.continuity_bundle_id}\n- Reference assets: ${scene.reference_asset_ids.join(", ")}\n- Source IDs: ${scene.source_ids.join(", ")}\n- Editorial overlay: ${scene.editorial_overlay.kind} / ${scene.editorial_overlay.motion} / ${scene.editorial_overlay.placement}\n- Overlay text: ${scene.editorial_overlay.text.replace(/\s+/g, " ").trim()}\n- Overlay data: ${JSON.stringify(scene.editorial_overlay.data)}\n\n${stripEditorialOverlayInstructions(scene.visual_prompt.trim())}`).join("\n\n")}\n`;
}

function parseOverlayData(value: string): Array<{ label: string; value: string | number; unit: string }> {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { label?: unknown; value?: unknown; unit?: unknown } => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map((item) => ({ label: String(item.label ?? ""), value: typeof item.value === "number" ? item.value : String(item.value ?? ""), unit: String(item.unit ?? "") }))
      .filter((item) => item.label && item.value !== "");
  } catch {
    return [];
  }
}

function parseQuizData(value: string): Scene["quiz"] {
  if (!value.trim() || value.trim() === "null") return null;
  try { return SceneSchema.shape.quiz.parse(JSON.parse(value)); } catch { return null; }
}

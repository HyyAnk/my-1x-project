import { SceneSchema, type Scene } from "@studio/shared";
import { stripEditorialOverlayInstructions } from "../visualPrompt.js";

function matchField(text: string, regex: RegExp, fallback = ""): string {
  const match = regex.exec(text);
  return match && match[1] ? match[1].trim() : fallback;
}

export function parseOverlayData(value: string): Array<{ label: string; value: string | number; unit: string }> {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is { label?: unknown; value?: unknown; unit?: unknown } =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
      .map((item) => {
        const label = typeof item.label === "string" ? item.label : typeof item.label === "number" ? String(item.label) : "";
        const rawVal = item.value;
        const value = typeof rawVal === "number" ? rawVal : typeof rawVal === "string" ? rawVal : "";
        const unit = typeof item.unit === "string" ? item.unit : typeof item.unit === "number" ? String(item.unit) : "";
        return { label, value, unit };
      })
      .filter((item) => item.label && item.value !== "");
  } catch {
    return [];
  }
}

export function parseQuizData(value: string): Scene["quiz"] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null") return null;
  try {
    return SceneSchema.shape.quiz.parse(JSON.parse(trimmed));
  } catch {
    return null;
  }
}

function extractListValue(notes: string, label: string): string[] {
  const raw = matchField(notes, new RegExp(`- ${label}:[ \\t]*(.*)`, "i"));
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseSequenceInfo(notes: string): { sequenceId: string; sequenceTitle: string } {
  const sequenceLine = matchField(notes, /- Sequence:[ \t]*(.*)/i, "sequence-1 | Sequence 1");
  const [sequenceId, ...sequenceTitleParts] = sequenceLine.split("|").map((value) => value.trim());
  return {
    sequenceId: sequenceId || "sequence-1",
    sequenceTitle: sequenceTitleParts.join(" | ") || "Sequence 1",
  };
}

function parseEditorialOverlay(notes: string): Scene["editorial_overlay"] {
  const overlayData = parseOverlayData(matchField(notes, /- Overlay data:[ \t]*(.*)/i));
  const durStr = matchField(notes, /- Overlay duration:[ \t]*([\d.]+)/i);
  return {
    kind: (matchField(notes, /- Overlay kind:[ \t]*(.*)/i, "none")) as Scene["editorial_overlay"]["kind"],
    text: matchField(notes, /- Overlay text:[ \t]*(.*)/i),
    motion: (matchField(notes, /- Overlay motion:[ \t]*(.*)/i, "none")) as Scene["editorial_overlay"]["motion"],
    placement: (matchField(notes, /- Overlay placement:[ \t]*(.*)/i, "lower_third")) as Scene["editorial_overlay"]["placement"],
    duration_seconds: durStr ? Number(durStr) || null : null,
    data: overlayData,
    source_ids: extractListValue(notes, "Overlay sources"),
  };
}

function parseAudioMetadata(block: string): {
  audioAssetPath: string | null;
  audioGeneratedAt: string | null;
  audioDurationSeconds: number | null;
} {
  const audioAssetPath = matchField(block, /<!--\s*Audio asset:\s*(.*?)\s*-->/i) || null;
  const audioGeneratedAt = matchField(block, /<!--\s*Audio generated at:\s*(.*?)\s*-->/i) || null;
  const durStr = matchField(block, /<!--\s*Audio duration:\s*([\d.]+)\s*-->/i);
  return {
    audioAssetPath,
    audioGeneratedAt,
    audioDurationSeconds: durStr ? Number(durStr) : null,
  };
}

function parseNotesMetadata(notes: string, index: number) {
  const { sequenceId, sequenceTitle } = parseSequenceInfo(notes);
  return {
    transition: matchField(notes, /- Transition:[ \t]*(.*)/i),
    continuity: stripEditorialOverlayInstructions(matchField(notes, /- Continuity:[ \t]*(.*)/i)),
    sequenceId,
    sequenceTitle,
    shotId: matchField(notes, /- Shot:[ \t]*(.*)/i, `shot-${index + 1}`),
    assetType: matchField(notes, /- Asset type:[ \t]*(.*)/i, "ai_reconstruction"),
    continuityBundleId: matchField(notes, /- Continuity bundle:[ \t]*(.*)/i),
    reconstruction: !/^no$/i.test(matchField(notes, /- Reconstruction:[ \t]*(.*)/i, "yes")),
    soundCue: matchField(notes, /- Sound:[ \t]*(.*)/i),
  };
}

export function parseSceneBlock(block: string, index: number, episodeId: string): Scene {
  const durationStr = matchField(block, /\*\*Duration:\*\*\s*([\d.]+)/i, "6");
  const dialogue = matchField(block, /## Dialogue\s*\n([\s\S]*?)(?=\n## Video Prompt|$)/i);
  const prompt = matchField(block, /## Video Prompt\s*\n([\s\S]*?)(?=\n## Notes|$)/i);
  const notesMatch = block.match(/## Notes\s*\n([\s\S]*?)(?=\n<!--|$)/i);
  const notes = notesMatch ? notesMatch[1] : "";

  const notesMeta = parseNotesMetadata(notes, index);
  const audioMeta = parseAudioMetadata(block);

  return SceneSchema.parse({
    scene_id: `${episodeId}_scene_${index + 1}`,
    episode_id: episodeId,
    scene_number: index + 1,
    duration_seconds: Number(durationStr) || 6,
    dialogue,
    visual_prompt: stripEditorialOverlayInstructions(prompt),
    transition_note: notesMeta.transition,
    continuity_note: notesMeta.continuity,
    sequence_id: notesMeta.sequenceId,
    sequence_title: notesMeta.sequenceTitle,
    shot_id: notesMeta.shotId,
    asset_type: notesMeta.assetType,
    continuity_bundle_id: notesMeta.continuityBundleId,
    reference_asset_ids: extractListValue(notes, "Reference assets"),
    source_ids: extractListValue(notes, "Source IDs"),
    reconstruction: notesMeta.reconstruction,
    sound_cue: notesMeta.soundCue,
    editorial_overlay: parseEditorialOverlay(notes),
    quiz: parseQuizData(matchField(notes, /- Quiz data:[ \t]*(.*)/i)),
    audio_asset_path: audioMeta.audioAssetPath,
    audio_generated_at: audioMeta.audioGeneratedAt,
    audio_duration_seconds: audioMeta.audioDurationSeconds,
  });
}

export function parseScenes(markdown: string, episodeId: string): Scene[] {
  const blocks = markdown.split(/^# Scene\s+\d+\s*$/gim).slice(1);
  return blocks.map((block, index) => parseSceneBlock(block, index, episodeId));
}

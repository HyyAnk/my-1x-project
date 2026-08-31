import { EditorialOverlaySchema, estimateSpokenSeconds, type Scene } from "@studio/shared";
import {
  type Beat,
  type PackedBeat,
  packBeatsIntoScenes,
  composePackedVisualPrompt,
  mergeEditorialOverlays,
  formatSeconds,
} from "./timeline/beatPacker.js";

export { estimateSpokenSeconds, type Beat, type PackedBeat, packBeatsIntoScenes, composePackedVisualPrompt, mergeEditorialOverlays };

export function composeMergedVisualPrompt(first: Scene, second: Scene): string {
  const cutAt = first.duration_seconds;
  const total = cutAt + second.duration_seconds;
  const continuity = first.continuity_note || "Maintain identical era, subject, and lighting across both shots in this scene.";
  return [
    `SHOT PLAN (${formatSeconds(total)}s total)`,
    `0.0s-${formatSeconds(cutAt)}s — shot 1`,
    `${formatSeconds(cutAt)}s HARD CUT`,
    `${formatSeconds(cutAt)}s-${formatSeconds(total)}s — shot 2`,
    "",
    `Shot 1 detail:\n${first.visual_prompt}`,
    `Shot 2 detail:\n${second.visual_prompt}`,
    "",
    "CONTINUITY",
    continuity,
  ].join("\n");
}

export function optimizeShortScenes(scenes: Scene[], maxDuration: number, episodeId: string): Scene[] {
  const result: Scene[] = [];
  for (let index = 0; index < scenes.length; index += 1) {
    const current = scenes[index];
    const next = scenes[index + 1];
    const canMergeNext =
      current.duration_seconds < 2.5 &&
      next &&
      current.sequence_id === next.sequence_id &&
      current.continuity_bundle_id === next.continuity_bundle_id &&
      current.duration_seconds + next.duration_seconds <= maxDuration;
    if (canMergeNext && next) {
      result.push(mergeProductionScenes(current, next));
      index += 1;
      continue;
    }
    const previous = result[result.length - 1];
    const canMergePrevious =
      current.duration_seconds < 2.5 &&
      previous &&
      current.sequence_id === previous.sequence_id &&
      current.continuity_bundle_id === previous.continuity_bundle_id &&
      current.duration_seconds + previous.duration_seconds <= maxDuration;
    if (canMergePrevious && previous) result[result.length - 1] = mergeProductionScenes(previous, current);
    else result.push(current);
  }

  for (let index = 0; index < result.length - 1; index += 1) {
    const current = result[index];
    const next = result[index + 1];
    if (
      current.duration_seconds >= 2.5 ||
      current.sequence_id !== next.sequence_id ||
      current.continuity_bundle_id !== next.continuity_bundle_id
    )
      continue;
    const transferable = Math.min(2.5 - current.duration_seconds, Math.max(0, next.duration_seconds - 2.5));
    if (transferable <= 0) continue;
    result[index] = { ...current, duration_seconds: Number((current.duration_seconds + transferable).toFixed(1)) };
    result[index + 1] = { ...next, duration_seconds: Number((next.duration_seconds - transferable).toFixed(1)) };
  }

  return result.map((scene, index) => ({ ...scene, scene_id: `${episodeId}_scene_${index + 1}`, scene_number: index + 1 }));
}

function mergeProductionScenes(first: Scene, second: Scene): Scene {
  return {
    ...first,
    duration_seconds: Number((first.duration_seconds + second.duration_seconds).toFixed(1)),
    dialogue: `${first.dialogue.trim()} ${second.dialogue.trim()}`.trim(),
    visual_prompt: composeMergedVisualPrompt(first, second),
    transition_note: second.transition_note,
    shot_id: [first.shot_id, second.shot_id].filter(Boolean).join("+"),
    reference_asset_ids: [...new Set([...first.reference_asset_ids, ...second.reference_asset_ids])],
    source_ids: [...new Set([...first.source_ids, ...second.source_ids])],
    reconstruction: first.reconstruction || second.reconstruction,
    sound_cue: [first.sound_cue, second.sound_cue].filter(Boolean).join("; "),
    editorial_overlay: mergeEditorialOverlays(first.editorial_overlay, second.editorial_overlay),
    audio_asset_path: null,
    audio_generated_at: null,
    audio_duration_seconds: null,
  };
}

/** Keep explanatory graphics useful without letting overlays dominate the edit. */
export function rebalanceEditorialOverlays(scenes: Scene[], maxRatio = 0.3): Scene[] {
  const overlayScenes = scenes.filter((scene) => scene.editorial_overlay.kind !== "none");
  const maximum = Math.floor(scenes.length * Math.max(0, Math.min(1, maxRatio)));
  if (overlayScenes.length <= maximum) return scenes;

  const remove = new Set<number>();
  const seenCaptions = new Set<string>();
  for (const scene of overlayScenes) {
    if (remove.size >= overlayScenes.length - maximum) break;
    if (scene.editorial_overlay.kind === "caption" && seenCaptions.has(scene.sequence_id)) remove.add(scene.scene_number);
    else if (scene.editorial_overlay.kind === "caption") seenCaptions.add(scene.sequence_id);
  }

  if (remove.size < overlayScenes.length - maximum) {
    const lowPriority = overlayScenes
      .filter((scene) => !remove.has(scene.scene_number) && scene.editorial_overlay.kind === "comparison")
      .sort((left, right) => right.scene_number - left.scene_number);
    for (const scene of lowPriority) {
      if (remove.size >= overlayScenes.length - maximum) break;
      remove.add(scene.scene_number);
    }
  }

  if (remove.size < overlayScenes.length - maximum) {
    for (const scene of overlayScenes) {
      if (remove.size >= overlayScenes.length - maximum) break;
      remove.add(scene.scene_number);
    }
  }

  return scenes.map((scene) =>
    remove.has(scene.scene_number) ? { ...scene, editorial_overlay: EditorialOverlaySchema.parse({}) } : scene,
  );
}

import path from "node:path";
import { MascotAnimationRevisionSchema } from "@studio/shared";
import { parseAnimationArtifactUrl } from "../../../../tasks/video/mascotAnimationResolver.js";
import type { AttemptRetentionPlan } from "./retention.types.js";

/** Only discard derived frame lists when the exact matching completed attempt has durable video. */
export function compactLegacyRevisions(
  value: unknown,
  root: string,
  attempts: AttemptRetentionPlan[],
): { value: unknown; changed: number } {
  const eligible = new Set(attempts.map((attempt) => path.resolve(attempt.attemptDirectory)));
  let changed = 0;
  function visit(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(visit);
    if (!input || typeof input !== "object") return input;
    const object = input as Record<string, unknown>;
    let output = Object.fromEntries(Object.entries(object).map(([key, item]) => [key, visit(item)]));
    const revision = MascotAnimationRevisionSchema.safeParse(output);
    if (!revision.success || !revision.data.frame_urls?.length || !revision.data.transparent_video_url) return output;
    const data = revision.data;
    const artifact = parseAnimationArtifactUrl(data.transparent_video_url!);
    if (
      !artifact ||
      artifact.filename !== "video_transparent.webm" ||
      artifact.attempt !== data.attempt ||
      artifact.styleId !== data.style_id ||
      artifact.state !== data.state ||
      artifact.slotIndex !== data.slot_index
    )
      return output;
    const directory = path.join(
      root,
      "mascots",
      artifact.mascotId,
      "animations",
      artifact.styleId,
      artifact.state,
      `slot_${artifact.slotIndex}`,
      "attempts",
      `att_${artifact.attempt}`,
    );
    if (!eligible.has(directory)) return output;
    const { frame_urls: _frames, ...compact } = output;
    MascotAnimationRevisionSchema.parse(compact);
    output = compact;
    changed++;
    return output;
  }
  return { value: visit(value), changed };
}

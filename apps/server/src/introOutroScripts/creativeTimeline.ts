import { IntroOutroScriptContentSchema, type IntroOutroClipKind } from "@studio/shared";
import { z } from "zod";
import { scriptBeatStructure } from "./generationStructure.js";

const choreographyKeys = ["primary_action", "expression", "secondary_motion", "end_pose"] as const;

function normalizeChoreography(group: Record<string, unknown>) {
  const flattenedKeys = choreographyKeys.filter((key) => Object.hasOwn(group, key));
  if (!flattenedKeys.length) return group;
  const normalized = { ...group };
  const choreography = group.choreography === undefined ? {} : z.record(z.unknown()).parse(group.choreography);
  const merged = { ...choreography };
  for (const key of flattenedKeys) {
    merged[key] =
      Object.hasOwn(choreography, key) && choreography[key] !== group[key]
        ? `${String(choreography[key])}; ${String(group[key])}`
        : group[key];
    delete normalized[key];
  }
  return { ...normalized, choreography: merged };
}

/** Preserve authored prose and timing while normalizing provider metadata placement. */
export function assembleCreativeTimeline(raw: unknown, duration: number, kind: IntroOutroClipKind) {
  const defaults = scriptBeatStructure(kind, duration);
  const groups = z.array(z.record(z.unknown())).min(1).parse(raw);
  return IntroOutroScriptContentSchema.shape.timeline.parse(
    groups.map((group, index) => ({
      ...(groups.length === 3
        ? defaults[index]
        : {
            beat: index + 1,
            role: `scene_${index + 1}`,
            start_seconds: (duration * index) / groups.length,
            end_seconds: (duration * (index + 1)) / groups.length,
          }),
      ...normalizeChoreography(group),
    })),
  );
}

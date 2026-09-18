import { createHash } from "node:crypto";
import type { QuizAssetRequirement } from "@studio/shared";

export function assetFingerprint(
  request: Pick<QuizAssetRequirement, "semantic_key" | "subject" | "purpose" | "style" | "aspect_ratio" | "transparent_background"> & {
    consistency_group_id?: string | null;
    sizing?: { geometry_key?: string; layout_id?: string; policy_version?: number } | null;
    geometry_key?: string | null;
  },
  provider = "local",
  generationVersion = "v3-geom2",
): string {
  const geometryKey = request.geometry_key ?? request.sizing?.geometry_key ?? null;
  const layoutId = request.sizing?.layout_id ?? null;
  const normalized = {
    aspect_ratio: request.aspect_ratio,
    consistency_group_id: request.consistency_group_id ?? null,
    geometry_key: geometryKey,
    layout_id: layoutId,
    provider,
    purpose: request.purpose,
    semantic_key: request.semantic_key.trim().toLocaleLowerCase(),
    style: request.style,
    subject: request.subject.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase(),
    transparent_background: request.transparent_background,
    generation_version: generationVersion,
  };
  return createHash("sha256").update(JSON.stringify(sortObject(normalized))).digest("hex");
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortObject(item)]));
}

import { createHash } from "node:crypto";
import type { QuizAssetRequirement } from "@studio/shared";

type FingerprintRequest = Pick<
  QuizAssetRequirement,
  "semantic_key" | "subject" | "purpose" | "style" | "aspect_ratio" | "transparent_background"
> & {
  consistency_group_id?: string | null;
  sizing?: { geometry_key?: string; layout_id?: string; policy_version?: number } | null;
  geometry_key?: string | null;
};

const CURRENT_VERDICT_LAYOUT = "verdict_yes_no";
const RETIRED_VERDICT_LAYOUT = "verdict_true_false";

export function assetFingerprint(request: FingerprintRequest, provider = "local", generationVersion = "v3-geom2"): string {
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
  return createHash("sha256")
    .update(JSON.stringify(sortObject(normalized)))
    .digest("hex");
}

/**
 * Assets generated for the retired True/False layout share the Yes/No geometry exactly, so their
 * fingerprints (which embed the layout id) are still accepted instead of forcing a costly regeneration.
 */
function retiredVerdictLayoutFingerprint(request: FingerprintRequest, provider: string, generationVersion: string): string | null {
  const geometryKey = request.geometry_key ?? request.sizing?.geometry_key ?? null;
  const layoutId = request.sizing?.layout_id ?? null;
  if (!geometryKey?.startsWith(`${CURRENT_VERDICT_LAYOUT}:`) && layoutId !== CURRENT_VERDICT_LAYOUT) return null;
  const legacyGeometryKey = geometryKey?.replace(`${CURRENT_VERDICT_LAYOUT}:`, `${RETIRED_VERDICT_LAYOUT}:`) ?? null;
  return assetFingerprint(
    {
      ...request,
      geometry_key: legacyGeometryKey,
      sizing: request.sizing
        ? {
            ...request.sizing,
            geometry_key: legacyGeometryKey ?? undefined,
            layout_id: layoutId === CURRENT_VERDICT_LAYOUT ? RETIRED_VERDICT_LAYOUT : (layoutId ?? undefined),
          }
        : request.sizing,
    },
    provider,
    generationVersion,
  );
}

export function assetFingerprintMatches(
  storedFingerprint: string | null | undefined,
  request: FingerprintRequest,
  provider = "local",
  generationVersion = "v3-geom2",
): boolean {
  if (!storedFingerprint) return false;
  if (storedFingerprint === assetFingerprint(request, provider, generationVersion)) return true;
  return storedFingerprint === retiredVerdictLayoutFingerprint(request, provider, generationVersion);
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, sortObject(item)]),
  );
}

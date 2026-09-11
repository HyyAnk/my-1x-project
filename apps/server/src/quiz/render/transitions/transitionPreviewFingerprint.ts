import { canonicalJsonStringify, sha256Hex, type FrameRate, type ResolvedTransitionInstance } from "@studio/shared";

export type TransitionPreviewFingerprintInput = {
  jobId?: string;
  catalogRevision: string;
  engineSnapshotHash: string;
  aspectRatio: "16:9" | "9:16";
  width: number;
  height: number;
  fps: FrameRate;
  quality: string;
  resolvedInstances: readonly ResolvedTransitionInstance[];
  definitionHashes: Record<string, string>;
  compositionHtml: string;
  compositionFiles?: Record<string, string>;
  assetHashes?: Record<string, string>;
  sourceKind: "sample" | "episode";
  boundaryId?: string;
};

export function fingerprintTransitionPreview(input: TransitionPreviewFingerprintInput): string {
  const normalized = {
    schema_version: 1,
    catalogRevision: input.catalogRevision,
    engineSnapshotHash: input.engineSnapshotHash,
    aspectRatio: input.aspectRatio,
    width: input.width,
    height: input.height,
    fps: {
      numerator: input.fps.numerator,
      denominator: input.fps.denominator,
    },
    quality: input.quality,
    resolvedInstances: (input.resolvedInstances || []).map((inst) => ({
      id: inst.id,
      implementationRevision: inst.implementationRevision,
      placement: inst.placement,
      startFrame: inst.startFrame,
      boundaryFrame: inst.boundaryFrame,
      endFrameExclusive: inst.endFrameExclusive,
      durationFrames: inst.durationFrames,
      effectiveDurationSeconds: inst.effectiveDurationSeconds,
      timingAdjustment: inst.timingAdjustment,
    })),
    definitionHashes: Object.keys(input.definitionHashes || {})
      .sort()
      .reduce((acc, key) => {
        acc[key] = input.definitionHashes[key]!;
        return acc;
      }, {} as Record<string, string>),
    compositionHtml: input.compositionHtml,
    compositionFiles: Object.keys(input.compositionFiles || {})
      .sort()
      .reduce((acc, key) => {
        acc[key] = input.compositionFiles![key]!;
        return acc;
      }, {} as Record<string, string>),
    assetHashes: Object.keys(input.assetHashes || {})
      .sort()
      .reduce((acc, key) => {
        acc[key] = input.assetHashes![key]!;
        return acc;
      }, {} as Record<string, string>),
    sourceKind: input.sourceKind,
    boundaryId: input.boundaryId ?? null,
  };

  return sha256Hex(canonicalJsonStringify(normalized));
}

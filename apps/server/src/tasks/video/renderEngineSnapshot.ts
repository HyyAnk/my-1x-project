import { canonicalJsonStringify, sha256Hex } from "@studio/shared";
import { getHyperframesPackageVersion } from "./videoInvocation.js";

export type RenderEngineSnapshot = Readonly<{
  engine: "hyperframes";
  engineVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  quality: string;
  fps: number;
  gpu: boolean;
  browserGpu: boolean;
  pixelFormat: string;
  colorSpace: string;
  snapshotHash: string;
}>;

export type RenderEngineOptions = {
  quality?: string;
  fps?: number;
  gpu?: boolean;
  browserGpu?: boolean;
  pixelFormat?: string;
  colorSpace?: string;
};

export function resolveRenderEngineSnapshot(options?: RenderEngineOptions): RenderEngineSnapshot {
  const engineVersion = getHyperframesPackageVersion();
  const quality = options?.quality ?? "high";
  const fps = options?.fps ?? 30;
  const gpu = options?.gpu ?? true;
  const browserGpu = options?.browserGpu ?? true;
  const pixelFormat = options?.pixelFormat ?? "yuv420p";
  const colorSpace = options?.colorSpace ?? "bt709";

  const data = {
    engine: "hyperframes" as const,
    engineVersion,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    quality,
    fps,
    gpu,
    browserGpu,
    pixelFormat,
    colorSpace,
  };

  const snapshotHash = sha256Hex(canonicalJsonStringify(data));

  return {
    ...data,
    snapshotHash,
  };
}

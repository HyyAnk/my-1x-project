import type {
  AnimationState,
  MascotAnimationManifest,
  MascotAnimationManifestAtlas,
  MascotFrameRect,
  MascotAssetRegistration,
} from "@studio/shared";
import type { FfmpegAdapter } from "../adapters/ffmpegAdapter.js";
import type { FrameRegistrationService } from "../frameRegistrationService.js";

export interface AnimationPackagingServiceOptions {
  ffmpegAdapter?: FfmpegAdapter;
  registrationService?: FrameRegistrationService;
}

export interface PackageAttemptAnimationParams {
  signal?: AbortSignal;
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  attemptId: string | number;
  sourceVideoFingerprint: string;
  recipeId?: string;
  cropToContent?: boolean;
  fps?: number;
  durationMs?: number;
  frameCount?: number;
}

export interface PackageAnimationResult {
  manifest: MascotAnimationManifest;
  manifestPath: string;
  atlasPath?: string;
  contactSheetPath?: string;
  transparentVideoPath: string;
  previewPath: string;
  mattedFramePaths: string[];
  processingFingerprint: string;
  atlasChecksum?: string;
}

export interface AnimationPackagingService {
  packageAttemptAnimation: (params: PackageAttemptAnimationParams) => Promise<PackageAnimationResult>;
  loadAndValidateAttemptManifest: (manifestPathOrDir: string) => Promise<MascotAnimationManifest>;
}

export interface AlphaBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CalculateContentCropParams {
  cropToContent: boolean;
  commonBounds: { x: number; y: number; width: number; height: number };
  commonPivot: { x: number; y: number };
  canvas: { width: number; height: number };
  fallbackRegistration: MascotAssetRegistration;
}

export interface CropBoundsResult {
  cropX: number;
  cropY: number;
  cellWidth: number;
  cellHeight: number;
  sequenceRegistration: MascotAssetRegistration;
}

export interface StitchAtlasGridParams {
  signal?: AbortSignal;
  attemptDir: string;
  mattedFramePaths: string[];
  targetCount: number;
  cellWidth: number;
  cellHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  cropX: number;
  cropY: number;
  cropToContent: boolean;
  frameDurationMs: number;
}

export interface StitchAtlasResult {
  atlasPath?: string;
  contactSheetPath?: string;
  atlasChecksum?: string;
  atlasManifestInfo?: MascotAnimationManifestAtlas;
  frameRects: MascotFrameRect[];
}

export interface RenderPreviewThumbnailsParams {
  signal?: AbortSignal;
  attemptDir: string;
  firstFramePath: string;
  cropX: number;
  cropY: number;
  cellWidth: number;
  cellHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  cropToContent: boolean;
}

export interface CalculateFpsAndDurationParams {
  targetCount: number;
  requestedFps?: number;
  requestedDurationMs?: number;
}

export interface FpsAndDurationResult {
  fps: number;
  durationMs: number;
  frameDurationMs: number;
}

export interface BuildAnimationManifestParams {
  state: AnimationState;
  recipeId: string;
  styleId: string;
  slotIndex: number;
  targetCount: number;
  fps: number;
  durationMs: number;
  atlasManifestInfo?: MascotAnimationManifestAtlas;
  frameRects: MascotFrameRect[];
  sequenceRegistration: MascotAssetRegistration;
  effectiveSourceFingerprint: string;
  sourceVideoFingerprint: string;
  atlasChecksum?: string;
}

export interface BuildAnimationManifestResult {
  manifest: MascotAnimationManifest;
  processingFingerprint: string;
}

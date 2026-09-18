import type { AnimationState, MascotAssetRegistration, MascotBounds, MascotPoint } from "@studio/shared";

export interface FrameGeometryInput {
  frameIndex: number;
  width: number;
  height: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface ComputeRegistrationFromFramesParams {
  frames: FrameGeometryInput[];
  maxAllowedDriftPx?: number;
  expectedFrameCount?: number;
}

export interface ComputeAttemptRegistrationParams {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  attemptId: string | number;
  subDir?: string;
  maxAllowedDriftPx?: number;
  frameCount?: number;
}

export interface FrameCentroid {
  frameIndex: number;
  x: number;
  y: number;
}

export interface SequenceRegistrationResult {
  registration: MascotAssetRegistration;
  canvas: { width: number; height: number };
  commonBounds: MascotBounds;
  commonPivot: MascotPoint;
  maxDriftPx: number;
  avgDriftPx: number;
  frameCentroids: FrameCentroid[];
}

export interface FrameRegistrationService {
  computeRegistrationFromGeometry: (params: ComputeRegistrationFromFramesParams) => SequenceRegistrationResult;
  computeAttemptRegistration: (params: ComputeAttemptRegistrationParams) => Promise<SequenceRegistrationResult>;
}

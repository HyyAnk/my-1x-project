import { z } from "zod";
import {
  FrameRateSchema,
  ResolvedTransitionInstanceSchema,
  TransitionCatalogEntrySchema,
  TransitionSelectionSchema,
} from "../transitions/transition.schemas.js";
import type {
  FrameRate,
  ResolvedTransitionInstance,
  TransitionCatalogEntry,
  TransitionSelection,
} from "../transitions/transition.types.js";
import { SandboxPreviewInputBaseSchema, type SandboxPreviewRequest } from "./sandbox.js";

export const TransitionPreviewErrorCodeSchema = z.enum([
  "UNKNOWN_TRANSITION",
  "UNSUPPORTED_PLACEMENT",
  "INVALID_TIMING",
  "CATALOG_CHANGED",
  "SOURCE_CHANGED",
  "SOURCE_UNAVAILABLE",
  "RENDER_REQUIRED",
  "ENGINE_UNAVAILABLE",
  "RENDER_FAILED",
  "RENDER_TIMEOUT",
  "DECODE_FAILED",
  "ARTIFACT_EXPIRED",
]);

export type TransitionPreviewErrorCode = z.infer<typeof TransitionPreviewErrorCodeSchema>;

export const TransitionPreviewSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sample"),
    sampleRevision: z.string().min(1),
    sandboxInput: SandboxPreviewInputBaseSchema,
  }),
  z.object({
    kind: z.literal("episode"),
    channelId: z.string().min(1),
    episodeId: z.string().min(1),
    boundaryId: z.string().min(1),
  }),
]);

export type TransitionPreviewSource =
  | { kind: "sample"; sampleRevision: string; sandboxInput: SandboxPreviewRequest }
  | { kind: "episode"; channelId: string; episodeId: string; boundaryId: string };

export const TransitionPreviewRequestSchema = z.object({
  clientRequestId: z.string().min(1),
  catalogRevision: z.string().min(1),
  source: TransitionPreviewSourceSchema,
  selection: TransitionSelectionSchema,
});

export type TransitionPreviewRequest = Readonly<{
  clientRequestId: string;
  catalogRevision: string;
  source: TransitionPreviewSource;
  selection: TransitionSelection;
}>;

export const TransitionCatalogResponseSchema = z.object({
  revision: z.string().min(1),
  sampleRevision: z.string().min(1),
  entries: z.array(TransitionCatalogEntrySchema),
});

export type TransitionCatalogResponse = Readonly<{
  revision: string;
  sampleRevision: string;
  entries: readonly TransitionCatalogEntry[];
}>;

export const TransitionPreviewStatusSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("queued"),
    jobId: z.string().min(1),
    requestId: z.string().min(1),
    fingerprint: z.string().min(1),
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.literal("running"),
    jobId: z.string().min(1),
    requestId: z.string().min(1),
    fingerprint: z.string().min(1),
    revision: z.number().int().nonnegative(),
    phase: z.enum(["prepare", "capture", "encode", "verify"]),
    completedFrames: z.number().int().nonnegative().nullable(),
    totalFrames: z.number().int().positive().nullable(),
  }),
  z.object({
    status: z.literal("ready"),
    jobId: z.string().min(1),
    requestId: z.string().min(1),
    fingerprint: z.string().min(1),
    revision: z.number().int().nonnegative(),
    artifactId: z.string().min(1),
    manifestUrl: z.string().min(1),
    videoUrl: z.string().min(1),
  }),
  z.object({
    status: z.literal("failed"),
    jobId: z.string().min(1),
    requestId: z.string().min(1),
    fingerprint: z.string().min(1),
    revision: z.number().int().nonnegative(),
    error: z.object({
      code: TransitionPreviewErrorCodeSchema,
      message: z.string(),
      retryable: z.boolean(),
    }),
  }),
  z.object({
    status: z.literal("cancelled"),
    jobId: z.string().min(1),
    requestId: z.string().min(1),
    fingerprint: z.string().min(1),
    revision: z.number().int().nonnegative(),
  }),
]);

export type TransitionPreviewStatus =
  | { status: "queued"; jobId: string; requestId: string; fingerprint: string; revision: number }
  | {
      status: "running";
      jobId: string;
      requestId: string;
      fingerprint: string;
      revision: number;
      phase: "prepare" | "capture" | "encode" | "verify";
      completedFrames: number | null;
      totalFrames: number | null;
    }
  | {
      status: "ready";
      jobId: string;
      requestId: string;
      fingerprint: string;
      revision: number;
      artifactId: string;
      manifestUrl: string;
      videoUrl: string;
    }
  | {
      status: "failed";
      jobId: string;
      requestId: string;
      fingerprint: string;
      revision: number;
      error: { code: TransitionPreviewErrorCode; message: string; retryable: boolean };
    }
  | { status: "cancelled"; jobId: string; requestId: string; fingerprint: string; revision: number };

export const TransitionArtifactManifestSchema = z.object({
  schemaVersion: z.literal(1),
  artifactId: z.string().min(1),
  artifactSha256: z.string().min(1),
  inputFingerprint: z.string().min(1),
  catalogRevision: z.string().min(1),
  engineSnapshotHash: z.string().min(1),
  sourceKind: z.enum(["sample", "episode"]),
  currentness: z.enum(["matches-request", "legacy-unverified"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: FrameRateSchema,
  frameCount: z.number().int().positive(),
  timeBase: z.object({
    numerator: z.number().int().positive(),
    denominator: z.number().int().positive(),
  }),
  frames: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      pts: z.number().int().nonnegative(),
    }),
  ),
  reviewWindow: z.object({
    firstFrame: z.number().int().nonnegative(),
    lastFrameInclusive: z.number().int().nonnegative(),
    boundaryFrame: z.number().int().nonnegative(),
  }),
  instances: z.array(ResolvedTransitionInstanceSchema),
});

export type TransitionArtifactManifest = Readonly<{
  schemaVersion: 1;
  artifactId: string;
  artifactSha256: string;
  inputFingerprint: string;
  catalogRevision: string;
  engineSnapshotHash: string;
  sourceKind: "sample" | "episode";
  currentness: "matches-request" | "legacy-unverified";
  width: number;
  height: number;
  fps: FrameRate;
  frameCount: number;
  timeBase: { numerator: number; denominator: number };
  frames: readonly { index: number; pts: number }[];
  reviewWindow: { firstFrame: number; lastFrameInclusive: number; boundaryFrame: number };
  instances: readonly ResolvedTransitionInstance[];
}>;

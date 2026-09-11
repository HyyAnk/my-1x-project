import { z } from "zod";
import type {
  FrameRate,
  ResolvedTransitionInstance,
  TransitionCatalogEntry,
  TransitionContext,
  TransitionPlacement,
  TransitionSelection,
  TransitionSettings,
} from "./transition.types.js";

const KNOWN_ERROR_CODES = new Set<string>([
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

export type TransitionDomainErrorCode =
  | "UNKNOWN_TRANSITION"
  | "UNSUPPORTED_PLACEMENT"
  | "INVALID_TIMING"
  | "CATALOG_CHANGED"
  | "SOURCE_CHANGED"
  | "SOURCE_UNAVAILABLE"
  | "RENDER_REQUIRED"
  | "ENGINE_UNAVAILABLE"
  | "RENDER_FAILED"
  | "RENDER_TIMEOUT"
  | "DECODE_FAILED"
  | "ARTIFACT_EXPIRED";

export class TransitionDomainError extends Error {
  readonly code: TransitionDomainErrorCode;

  constructor(arg1: string, arg2?: string) {
    let message: string;
    let code: TransitionDomainErrorCode;

    if (arg2 && KNOWN_ERROR_CODES.has(arg2)) {
      message = arg1;
      code = arg2 as TransitionDomainErrorCode;
    } else if (KNOWN_ERROR_CODES.has(arg1)) {
      code = arg1 as TransitionDomainErrorCode;
      message = arg2 ?? arg1;
    } else {
      message = arg1;
      code = (arg2 as TransitionDomainErrorCode) ?? "RENDER_FAILED";
    }

    super(message);
    this.name = "TransitionDomainError";
    this.code = code;
  }
}

export function invalidTiming(message: string): TransitionDomainError {
  return new TransitionDomainError(message, "INVALID_TIMING");
}

export function unknownTransition(id: string): TransitionDomainError {
  return new TransitionDomainError(`Unknown transition '${id}'`, "UNKNOWN_TRANSITION");
}

export function unsupportedPlacement(id: string, placement: string): TransitionDomainError {
  return new TransitionDomainError(
    `Transition '${id}' does not support placement '${placement}'`,
    "UNSUPPORTED_PLACEMENT",
  );
}

export const TransitionPlacementSchema: z.ZodType<TransitionPlacement> = z.enum(["intro", "scene"]);

export const FrameRateSchema: z.ZodType<FrameRate> = z.object({
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});

export const TransitionSelectionSchema: z.ZodType<TransitionSelection> = z.object({
  id: z.string().min(1),
  durationSeconds: z.number().nonnegative().optional(),
});

export const TransitionSettingsSchema: z.ZodType<TransitionSettings> = z.object({
  intro: TransitionSelectionSchema.optional(),
  scene: TransitionSelectionSchema.optional(),
});

export const TransitionTimingAdjustmentSchema = z.enum(["none", "frame-rounded", "window-limited"]);

export const TransitionContextSchema: z.ZodType<TransitionContext> = z
  .object({
    instanceId: z.string().min(1),
    placement: TransitionPlacementSchema,
    fps: FrameRateSchema,
    startFrame: z.number().int().nonnegative(),
    boundaryFrame: z.number().int().nonnegative(),
    availableEndFrameExclusive: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fromColor: z.string().min(1),
    toColor: z.string().min(1),
    inkColor: z.string().min(1),
  })
  .refine((data) => data.startFrame <= data.boundaryFrame, {
    message: "startFrame must be less than or equal to boundaryFrame",
  })
  .refine((data) => data.boundaryFrame < data.availableEndFrameExclusive, {
    message: "boundaryFrame must be strictly less than availableEndFrameExclusive",
  });

export const ResolvedTransitionInstanceSchema: z.ZodType<ResolvedTransitionInstance> = z.object({
  instanceId: z.string().min(1),
  id: z.string().min(1),
  implementationRevision: z.string().min(1),
  placement: TransitionPlacementSchema,
  startFrame: z.number().int().nonnegative(),
  boundaryFrame: z.number().int().nonnegative(),
  endFrameExclusive: z.number().int().positive(),
  durationFrames: z.number().int().nonnegative(),
  effectiveDurationSeconds: z.number().nonnegative(),
  fps: FrameRateSchema,
  timingAdjustment: TransitionTimingAdjustmentSchema,
});

export const TransitionCatalogEntrySchema: z.ZodType<TransitionCatalogEntry> = z.object({
  id: z.string().min(1),
  implementationRevision: z.string().min(1),
  name: z.string().min(1),
  placements: z.array(TransitionPlacementSchema).min(1),
  defaultDurationSeconds: z.number().nonnegative(),
  minDurationSeconds: z.number().nonnegative(),
  maxDurationSeconds: z.number().nonnegative(),
  cssClass: z.string().min(1),
});

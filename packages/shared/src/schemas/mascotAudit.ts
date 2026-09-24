/**
 * Mascot Chroma-Key Green Screen Audit Schemas & Contracts
 *
 * Defines Zod schemas, requests, responses, and statuses for auditing and
 * remediating mascot style concept anchors and expressive pose slots.
 */

import { z } from "zod";
import { StyleBatchStatusResponseSchema } from "../mascot/styleJob/styleJobSchema.js";
import { SlotBatchStatusResponseSchema } from "../mascot/slotJob/slotJobSchema.js";

export const GreenScreenViolationReasonSchema = z.enum([
  "missing_raw",
  "has_transparency",
  "insufficient_green_chroma",
  "corrupted_file",
]);
export type GreenScreenViolationReason = z.infer<typeof GreenScreenViolationReasonSchema>;

export const GreenScreenAuditItemStatusSchema = z.enum(["compliant", "violation", "missing"]);
export type GreenScreenAuditItemStatus = z.infer<typeof GreenScreenAuditItemStatusSchema>;

export const GreenScreenAuditItemSchema = z.object({
  targetType: z.enum(["style_anchor", "slot"]),
  mascotId: z.string().min(1),
  mascotName: z.string(),
  styleId: z.string().min(1),
  styleName: z.string(),
  state: z.enum(["thinking", "celebrate"]).optional(),
  slotIndex: z.number().int().optional(),
  rawImageUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  status: GreenScreenAuditItemStatusSchema,
  violationReason: GreenScreenViolationReasonSchema.optional(),
  greenRatio: z.number().optional(),
  details: z.string().optional(),
});
export type GreenScreenAuditItem = z.infer<typeof GreenScreenAuditItemSchema>;

export const MascotGreenScreenAuditSummarySchema = z.object({
  totalChecked: z.number().int().nonnegative(),
  compliantCount: z.number().int().nonnegative(),
  violationCount: z.number().int().nonnegative(),
  missingRawCount: z.number().int().nonnegative(),
  transparencyCount: z.number().int().nonnegative(),
  insufficientChromaCount: z.number().int().nonnegative(),
  repairedCount: z.number().int().nonnegative().optional(),
  queuedJobCount: z.number().int().nonnegative().optional(),
});
export type MascotGreenScreenAuditSummary = z.infer<typeof MascotGreenScreenAuditSummarySchema>;

export const MascotGreenScreenAuditRequestSchema = z.object({
  mode: z.enum(["scan", "repair"]).default("scan"),
  style_id: z.string().optional(),
});
export type MascotGreenScreenAuditRequest = z.infer<typeof MascotGreenScreenAuditRequestSchema>;

export const MascotGreenScreenAuditResponseSchema = z.object({
  mascotId: z.string().min(1),
  mascotName: z.string(),
  mode: z.enum(["scan", "repair"]),
  summary: MascotGreenScreenAuditSummarySchema,
  violations: z.array(GreenScreenAuditItemSchema),
  queuedBatchIds: z
    .object({
      styleBatchId: z.string().optional(),
      slotBatchIds: z.array(z.string()).optional(),
    })
    .optional(),
});
export type MascotGreenScreenAuditResponse = z.infer<typeof MascotGreenScreenAuditResponseSchema>;
export type MascotGreenScreenAuditResult = MascotGreenScreenAuditResponse;

export const WorkspaceGreenScreenAuditResponseSchema = z.object({
  mode: z.enum(["scan", "repair"]),
  totalMascots: z.number().int().nonnegative(),
  overallSummary: MascotGreenScreenAuditSummarySchema,
  mascots: z.array(MascotGreenScreenAuditResponseSchema),
});
export type WorkspaceGreenScreenAuditResponse = z.infer<typeof WorkspaceGreenScreenAuditResponseSchema>;
export type WorkspaceGreenScreenAuditResult = WorkspaceGreenScreenAuditResponse;

export const MascotGreenScreenAuditStyleSlotStatusSchema = z.object({
  styleId: z.string().min(1),
  styleName: z.string(),
  batchStatus: SlotBatchStatusResponseSchema,
});
export type MascotGreenScreenAuditStyleSlotStatus = z.infer<typeof MascotGreenScreenAuditStyleSlotStatusSchema>;

export const MascotGreenScreenAuditStatusResponseSchema = z.object({
  mascotId: z.string().min(1),
  mascotName: z.string(),
  isRepairing: z.boolean(),
  styleBatch: StyleBatchStatusResponseSchema.optional(),
  slotBatches: z.array(MascotGreenScreenAuditStyleSlotStatusSchema).optional(),
  activeBatchCount: z.number().int().nonnegative(),
});
export type MascotGreenScreenAuditStatusResponse = z.infer<typeof MascotGreenScreenAuditStatusResponseSchema>;

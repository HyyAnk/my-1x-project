import { z } from "zod";
import { IsoDate } from "./common.js";

export const TopicSourceHashVersionSchema = z.literal(1);
export type TopicSourceHashVersion = z.infer<typeof TopicSourceHashVersionSchema>;

export const TopicSourceVariantSchema = z.enum(["native", "translation"]);
export type TopicSourceVariant = z.infer<typeof TopicSourceVariantSchema>;

export const TopicSourceTranslationProvenanceSchema = z.enum(["native", "verified_translation"]);
export type TopicSourceTranslationProvenance = z.infer<typeof TopicSourceTranslationProvenanceSchema>;

export const TopicSourceProjectionProvenanceSchema = z
  .object({
    source_variant: TopicSourceVariantSchema,
    resolved_language: z.literal("en"),
    translation_key: z.string().trim().min(1).nullable(),
    translation_provenance: TopicSourceTranslationProvenanceSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.source_variant !== "native") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["source_variant"], message: "Bank bindings must use native English sources" });
    }
    if (value.translation_key !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["translation_key"], message: "Native projections cannot name a translation key" });
    }
    if (value.translation_provenance !== "native") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["translation_provenance"],
        message: "Native projections require native provenance",
      });
    }
  });
export type TopicSourceProjectionProvenance = z.infer<typeof TopicSourceProjectionProvenanceSchema>;

export const TopicSourceBindingSchema = z
  .object({
    source_question_id: z.string().trim().min(1).max(80),
    source_hash_version: TopicSourceHashVersionSchema,
    source_content_hash: z.string().regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 hex digest"),
    projection_provenance: TopicSourceProjectionProvenanceSchema,
  })
  .strict();
export type TopicSourceBinding = z.infer<typeof TopicSourceBindingSchema>;

export const TopicSourceBindingSetSchema = z.array(TopicSourceBindingSchema).superRefine((bindings, ctx) => {
  const ids = new Set<string>();
  bindings.forEach((binding, index) => {
    if (ids.has(binding.source_question_id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "source_question_id"], message: "Duplicate source question ID" });
    }
    ids.add(binding.source_question_id);
  });
});
export type TopicSourceBindingSet = z.infer<typeof TopicSourceBindingSetSchema>;

export const TopicInventoryScanStatusSchema = z.enum(["complete_empty", "complete_nonempty", "incomplete", "unavailable"]);
export type TopicInventoryScanStatus = z.infer<typeof TopicInventoryScanStatusSchema>;

export const TopicSourceExclusionReasonCodeSchema = z.enum([
  "NOT_APPROVED",
  "ARCHETYPE_MISMATCH",
  "IN_COOLDOWN",
  "INVALID_CHOICE_COUNT",
  "DUPLICATE_CHOICE_IDS",
  "CORRECT_CHOICE_NOT_FOUND",
  "EMPTY_QUESTION_OR_EXPLANATION",
  "MISSING_TARGET_LANGUAGE",
  "MISSING_TARGET_TRANSLATION",
  "UNVERIFIED_TRANSLATION",
  "WRONG_TRANSLATION_LANGUAGE",
  "EMPTY_TRANSLATED_CONTENT",
  "TRANSLATED_CHOICE_COUNT_MISMATCH",
  "DUPLICATE_TRANSLATED_CHOICE_IDS",
  "TRANSLATED_CHOICE_ID_MISMATCH",
  "EMPTY_TRANSLATED_CHOICE",
  "MISSING_ENGLISH_SOURCE",
  "INCOMPATIBLE_FORMAT",
  "INCOMPATIBLE_CHOICES",
]);
export type TopicSourceExclusionReasonCode = z.infer<typeof TopicSourceExclusionReasonCodeSchema>;

export const TopicShortageReasonCodeSchema = z.enum([
  "NO_ELIGIBLE_SOURCES",
  "NO_KEYWORD_MATCH",
  "INSUFFICIENT_GROUP_SOURCES",
  "INCOMPLETE_SCAN",
  "UNAVAILABLE_SCAN",
  "SOURCE_CHANGED",
  "UNBOUND_LEGACY_TOPIC",
]);
export type TopicShortageReasonCode = z.infer<typeof TopicShortageReasonCodeSchema>;

export const TopicSourceShortageSchema = z
  .object({
    content_kind: z.enum(["episode", "short_reel"]),
    slot_id: z.string().trim().min(1),
    requested_count: z.number().int().nonnegative(),
    available_count: z.number().int().nonnegative(),
    reason_code: TopicShortageReasonCodeSchema,
    exclusion_counts: z.record(TopicSourceExclusionReasonCodeSchema, z.number().int().nonnegative()).default({}),
  })
  .strict();
export type TopicSourceShortage = z.infer<typeof TopicSourceShortageSchema>;

export const TopicAvailabilityReasonCodeSchema = z.enum([
  "AVAILABLE",
  "NO_ELIGIBLE_SOURCES",
  "INCOMPLETE_SCAN",
  "UNAVAILABLE_SCAN",
  "STALE_SNAPSHOT",
  "SOURCE_CHANGED",
  "UNBOUND_LEGACY_TOPIC",
]);
export type TopicAvailabilityReasonCode = z.infer<typeof TopicAvailabilityReasonCodeSchema>;

export const TopicAvailabilitySchema = z
  .object({
    topic_id: z.string().trim().min(1),
    content_kind: z.enum(["episode", "short_reel"]),
    can_confirm: z.boolean(),
    reason_code: TopicAvailabilityReasonCodeSchema,
    retryable: z.boolean(),
    recovery_action: z.string().trim().min(1),
    source_capacity: z.number().int().nonnegative().default(0),
  })
  .strict();
export type TopicAvailability = z.infer<typeof TopicAvailabilitySchema>;

export const TopicAvailabilityBatchSchema = z
  .object({
    scan_status: TopicInventoryScanStatusSchema,
    checked_at: IsoDate,
    snapshot_token: z.string().trim().min(1),
    topics: z.array(TopicAvailabilitySchema),
    error_code: z.string().trim().min(1).optional(),
  })
  .strict();
export type TopicAvailabilityBatch = z.infer<typeof TopicAvailabilityBatchSchema>;

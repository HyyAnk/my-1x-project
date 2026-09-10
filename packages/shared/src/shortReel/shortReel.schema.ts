import { z } from "zod";
import { sha256Hex, canonicalJsonStringify, ReelArchetypeSchema, CompleteShortReelSourceSnapshotSchema } from "./shortReelSource.schema.js";
import { ReelPublishingPayloadSchema, GeneratedReelPublishingSchema } from "./shortReelPublishing.schema.js";
import { ReelVisualContextSchema } from "./shortReelVisual.schema.js";

export {
  sha256Hex,
  canonicalJsonStringify,
  ReelArchetypeSchema,
  CompleteShortReelSourceSnapshotSchema,
  ReelPublishingPayloadSchema,
  GeneratedReelPublishingSchema,
  ReelVisualContextSchema,
};

export const SegmentIndexSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const SegmentModeSchema = z.enum(["generate", "extend"]);

export const TextCueRoleSchema = z.enum(["question", "answer", "supporting"]);

export const TextCueSchema = z
  .object({
    role: TextCueRoleSchema,
    text: z.string().min(1).max(500),
    start_seconds: z.number().finite().min(0),
    end_seconds: z.number().finite().min(0),
  })
  .strict()
  .superRefine((cue, ctx) => {
    if (cue.start_seconds >= cue.end_seconds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "start_seconds must be strictly less than end_seconds",
        path: ["end_seconds"],
      });
    }
  });

export const ContinuityStateSchema = z
  .object({
    character_identity: z.string().min(1).max(200),
    position: z.string().min(1).max(300),
    action: z.string().min(1).max(300),
    camera: z.string().min(1).max(300),
    environment: z.string().min(1).max(300),
    props: z.array(z.string().min(1).max(100)),
    visible_text: z.array(z.string().min(1).max(300)),
    revealed_facts: z.array(z.string().min(1).max(300)),
  })
  .strict();

export const ReelSegmentSchema = z
  .object({
    index: SegmentIndexSchema,
    mode: SegmentModeSchema,
    duration_seconds: z.number().finite().min(8).max(10),
    narrative: z.string().min(1).max(1000),
    text_cues: z.array(TextCueSchema),
    audio_direction: z.string().min(1).max(500),
    start_state: ContinuityStateSchema,
    end_state: ContinuityStateSchema,
  })
  .strict()
  .superRefine((seg, ctx) => {
    if (seg.index === 1 && seg.mode !== "generate") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Segment 1 must use mode 'generate'",
        path: ["mode"],
      });
    }
    if (seg.index !== 1 && seg.mode !== "extend") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Segment ${seg.index} must use mode 'extend'`,
        path: ["mode"],
      });
    }
    for (let i = 0; i < seg.text_cues.length; i++) {
      const cue = seg.text_cues[i];
      if (cue.end_seconds > seg.duration_seconds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Text cue end (${cue.end_seconds}s) exceeds segment duration (${seg.duration_seconds}s)`,
          path: ["text_cues", i, "end_seconds"],
        });
      }
    }
  });

type ReelSegment = z.infer<typeof ReelSegmentSchema>;

export const ReelScriptSchema = z
  .object({
    segments: z.tuple([ReelSegmentSchema, ReelSegmentSchema, ReelSegmentSchema]),
  })
  .strict()
  .superRefine((script, ctx) => {
    const [seg1, seg2, seg3] = script.segments;
    if (seg1.index !== 1 || seg2.index !== 2 || seg3.index !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Segments must be sequentially indexed 1, 2, 3",
        path: ["segments"],
      });
    }
    const totalDuration = seg1.duration_seconds + seg2.duration_seconds + seg3.duration_seconds;
    if (totalDuration < 24 || totalDuration > 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Script total duration must be between 24 and 30 seconds (current: ${totalDuration})`,
        path: ["segments"],
      });
    }
  });

type ReelScript = z.infer<typeof ReelScriptSchema>;

export const ShortReelTopicSnapshotSchema = z
  .object({
    topic_id: z.string().min(1),
    channel_id: z.string().min(1),
    title: z.string().min(1),
    premise: z.string().min(1),
    hook: z.string().min(1),
    origin: z.enum(["keyword", "discovery"]),
  })
  .strict();

import { ShortReelSourceProvenanceSchema, ShortReelSourceChoiceSchema, ShortReelSourceSnapshotSchema } from "./shortReelSource.schema.js";

export { ShortReelSourceProvenanceSchema, ShortReelSourceChoiceSchema, ShortReelSourceSnapshotSchema };

export const ReelUnitStatusSchema = z.enum(["missing", "pending", "ready", "stale", "failed", "cancelled"]);

export const ReelAttemptMetadataSchema = z
  .object({
    operation_id: z.string().min(1),
    dependency_fingerprint: z.string().min(1),
    started_at: z.string(),
    completed_at: z.string().nullable(),
    error: z.string().nullable(),
    error_message: z.string().optional(),
    retryable: z.boolean().optional(),
  })
  .strict();

export function createReelUnitStateSchema<T extends z.ZodTypeAny>(payloadSchema: T) {
  return z
    .object({
      state: ReelUnitStatusSchema,
      last_accepted_payload: payloadSchema.nullable(),
      current_attempt: ReelAttemptMetadataSchema.nullable(),
      accepted_dependency_fingerprint: z.string().nullable().default(null),
    })
    .strict();
}

export const ReelReferencesPayloadSchema = z
  .object({
    references: z.array(
      z
        .object({
          asset_id: z.string().min(1),
          role: z.enum(["mascot", "style"]),
          path: z.string().min(1),
          mime_type: z.string().min(1),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
          checksum: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

export const ReelCoverPayloadSchema = z
  .object({
    asset_id: z.string().min(1),
    path: z.string().min(1),
    mime_type: z.string().min(1),
    width: z.literal(1080),
    height: z.literal(1920),
    checksum: z.string().min(1),
  })
  .strict();

export const ReelScriptPayloadSchema = z
  .object({
    script: ReelScriptSchema,
    compiled_prompts: z.tuple([z.string(), z.string(), z.string()]).nullable(),
  })
  .strict();

export const ReelDeliverableUnitsSchema = z
  .object({
    references: createReelUnitStateSchema(ReelReferencesPayloadSchema),
    script: createReelUnitStateSchema(ReelScriptPayloadSchema),
    cover: createReelUnitStateSchema(ReelCoverPayloadSchema),
    publishing: createReelUnitStateSchema(ReelPublishingPayloadSchema),
  })
  .strict();

export const MutationReceiptSchema = z
  .object({
    request_id: z.string().min(1),
    revision: z.number().int().min(1),
    command_kind: z.string().min(1),
    command_hash: z.string().min(1),
    applied_at: z.string(),
  })
  .strict();

export const ShortReelRecordSchema = z
  .object({
    schema_version: z.literal(2),
    reel_id: z.string().min(1),
    channel_id: z.string().min(1),
    topic_id: z.string().min(1),
    topic: ShortReelTopicSnapshotSchema,
    aspect_ratio: z.literal("9:16"),
    source: ShortReelSourceSnapshotSchema,
    revision: z.number().int().min(1),
    model_note: z.string().max(200),
    created_at: z.string(),
    updated_at: z.string(),
    script: ReelScriptSchema.nullable(),
    stale_segments: z.array(SegmentIndexSchema).optional(),
    visual_context: ReelVisualContextSchema.nullable().default(null),
    units: ReelDeliverableUnitsSchema,
    last_mutation: MutationReceiptSchema.nullable().optional(),
    mutation_history: z.array(MutationReceiptSchema).optional(),
  })
  .strict();

export const ShortReelDisplayProjectionSchema = z
  .object({
    question_text: z.string(),
    selected_answer_text: z.string(),
    explanation: z.string().optional(),
    video_description: z.string().optional(),
    thumbnail_text: z.string().optional(),
  })
  .strict();

export type ShortReelDisplayProjection = z.infer<typeof ShortReelDisplayProjectionSchema>;

export const ShortReelEditCommandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("update_model_note"),
      model_note: z.string().min(1).max(200),
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_script"),
      script: ReelScriptSchema,
      display_projection: ShortReelDisplayProjectionSchema.partial().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_segment"),
      segment_index: SegmentIndexSchema,
      segment: ReelSegmentSchema,
      display_projection: ShortReelDisplayProjectionSchema.partial().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_references"),
      references: ReelReferencesPayloadSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_publishing"),
      publishing: ReelPublishingPayloadSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("update_cover"),
      cover: ReelCoverPayloadSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("replace_source_question"),
      source: CompleteShortReelSourceSnapshotSchema,
    })
    .strict(),
]);

export function calculateScriptTotalDuration(script: ReelScript): number {
  return script.segments[0].duration_seconds + script.segments[1].duration_seconds + script.segments[2].duration_seconds;
}

export function calculateCumulativeTimings(script: ReelScript): Array<{ segment_index: 1 | 2 | 3; start: number; end: number }> {
  let cursor = 0;
  return script.segments.map((segment: ReelSegment) => {
    const start = cursor;
    const end = cursor + segment.duration_seconds;
    cursor = end;
    return {
      segment_index: segment.index,
      start,
      end,
    };
  });
}

interface CueTrackingState {
  questionCueFound: boolean;
  firstQuestionTime: number;
  answerCueFound: boolean;
  firstAnswerTime: number;
}

function processQuestionCue(params: {
  cue: { role: string; text: string; start_seconds: number };
  segmentIndex: number;
  globalStart: number;
  expectedQuestionText: string;
  sourceQuestionText: string;
  isProjected: boolean;
  state: CueTrackingState;
  errors: string[];
}): void {
  if (params.segmentIndex !== 0) {
    params.errors.push("Canonical question cues belong in segment 1");
  }
  if (params.cue.text === params.expectedQuestionText || params.cue.text === params.sourceQuestionText) {
    params.state.questionCueFound = true;
    params.state.firstQuestionTime = Math.min(params.state.firstQuestionTime, params.globalStart);
  } else {
    params.errors.push(
      params.isProjected
        ? `Question cue text "${params.cue.text}" does not match projected question text "${params.expectedQuestionText}"`
        : `Question cue text "${params.cue.text}" does not match source question text "${params.sourceQuestionText}"`,
    );
  }
}

function processAnswerCue(params: {
  cue: { role: string; text: string; start_seconds: number };
  segmentIndex: number;
  globalStart: number;
  expectedAnswerText: string;
  sourceAnswerText: string;
  isProjected: boolean;
  state: CueTrackingState;
  errors: string[];
}): void {
  if (params.segmentIndex !== 2) {
    params.errors.push("Canonical answer cues belong in segment 3");
  }
  if (params.cue.text === params.expectedAnswerText || params.cue.text === params.sourceAnswerText) {
    params.state.answerCueFound = true;
    params.state.firstAnswerTime = Math.min(params.state.firstAnswerTime, params.globalStart);
  } else {
    params.errors.push(
      params.isProjected
        ? `Answer cue text "${params.cue.text}" does not match projected answer text "${params.expectedAnswerText}"`
        : `Answer cue text "${params.cue.text}" does not match source answer text "${params.sourceAnswerText}"`,
    );
  }
}

function validateScriptCues(
  script: ReelScript,
  source: z.infer<typeof ShortReelSourceSnapshotSchema>,
  displayProjection?: Partial<ShortReelDisplayProjection> | null,
): string[] {
  const errors: string[] = [];
  const expectedQuestionText = displayProjection?.question_text || source.question_text;
  const expectedAnswerText = displayProjection?.selected_answer_text || source.selected_answer_text;
  const isQuestionProjected = Boolean(displayProjection?.question_text);
  const isAnswerProjected = Boolean(displayProjection?.selected_answer_text);

  const state: CueTrackingState = {
    questionCueFound: false,
    firstQuestionTime: Number.POSITIVE_INFINITY,
    answerCueFound: false,
    firstAnswerTime: Number.POSITIVE_INFINITY,
  };

  const timings = calculateCumulativeTimings(script);

  for (let s = 0; s < script.segments.length; s++) {
    const seg = script.segments[s];
    const segTiming = timings[s];

    for (const cue of seg.text_cues) {
      const globalStart = segTiming.start + cue.start_seconds;
      if (cue.role === "question") {
        processQuestionCue({
          cue,
          segmentIndex: s,
          globalStart,
          expectedQuestionText,
          sourceQuestionText: source.question_text,
          isProjected: isQuestionProjected,
          state,
          errors,
        });
      } else if (cue.role === "answer") {
        processAnswerCue({
          cue,
          segmentIndex: s,
          globalStart,
          expectedAnswerText,
          sourceAnswerText: source.selected_answer_text,
          isProjected: isAnswerProjected,
          state,
          errors,
        });
      }
    }
  }

  if (!state.questionCueFound) {
    errors.push(
      isQuestionProjected
        ? "Script is missing question cue matching projected question text"
        : "Script is missing canonical question cue matching source question text",
    );
  }

  if (!state.answerCueFound) {
    errors.push(
      isAnswerProjected
        ? "Script is missing answer cue matching projected answer text"
        : "Script is missing canonical answer cue matching source answer text",
    );
  }

  if (state.answerCueFound && state.questionCueFound && state.firstAnswerTime <= state.firstQuestionTime) {
    errors.push(
      `Answer cue revealed at ${state.firstAnswerTime}s before or at the same time as question cue at ${state.firstQuestionTime}s`,
    );
  }

  return errors;
}

function validateSegmentContinuity(
  currentEnd: ReelScript["segments"][number]["end_state"],
  nextStart: ReelScript["segments"][number]["start_state"],
  index: number,
): string[] {
  const errors: string[] = [];
  const segA = index + 1;
  const segB = index + 2;

  if (currentEnd.character_identity !== nextStart.character_identity) {
    errors.push(
      `Continuity mismatch between segment ${segA} and ${segB}: character_identity "${currentEnd.character_identity}" vs "${nextStart.character_identity}"`,
    );
  }
  if (currentEnd.environment !== nextStart.environment) {
    errors.push(
      `Continuity mismatch between segment ${segA} and ${segB}: environment "${currentEnd.environment}" vs "${nextStart.environment}"`,
    );
  }
  const currProps = [...currentEnd.props].sort();
  const nextProps = [...nextStart.props].sort();
  if (JSON.stringify(currProps) !== JSON.stringify(nextProps)) {
    errors.push(`Continuity mismatch between segment ${segA} and ${segB}: props differ`);
  }
  const currText = [...currentEnd.visible_text].sort();
  const nextText = [...nextStart.visible_text].sort();
  if (JSON.stringify(currText) !== JSON.stringify(nextText)) {
    errors.push(`Continuity mismatch between segment ${segA} and ${segB}: visible_text differs`);
  }

  return errors;
}

function validateScriptContinuity(script: ReelScript, staleSegments: readonly (1 | 2 | 3)[] = []): string[] {
  const errors: string[] = [];
  for (let i = 0; i < 2; i++) {
    if (staleSegments.includes((i + 2) as 2 | 3)) continue;
    errors.push(...validateSegmentContinuity(script.segments[i].end_state, script.segments[i + 1].start_state, i));
  }
  return errors;
}

export function validateReelScript(
  script: ReelScript,
  source: z.infer<typeof ShortReelSourceSnapshotSchema>,
  staleSegments: readonly (1 | 2 | 3)[] = [],
  displayProjection?: Partial<ShortReelDisplayProjection> | null,
): { valid: boolean; errors: string[] } {
  const parsed = ReelScriptSchema.safeParse(script);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const errors = [...validateScriptCues(script, source, displayProjection), ...validateScriptContinuity(script, staleSegments)];

  return { valid: errors.length === 0, errors };
}

export { computeSourceContentHash, isEnglishLanguage, createEnglishSourceSnapshot, createSourceSnapshot } from "./shortReelSource.js";

export function createInitialShortReel(params: {
  channel_id: string;
  topic: z.infer<typeof ShortReelTopicSnapshotSchema>;
  source: z.infer<typeof ShortReelSourceSnapshotSchema>;
  model_note?: string;
  reel_id?: string;
}): z.infer<typeof ShortReelRecordSchema> {
  const now = new Date().toISOString();
  const reelId = params.reel_id || `sreel_${sha256Hex(`${params.channel_id}:${params.topic.topic_id}:${now}`).slice(0, 16)}`;

  return ShortReelRecordSchema.parse({
    schema_version: 2,
    reel_id: reelId,
    channel_id: params.channel_id,
    topic_id: params.topic.topic_id,
    topic: params.topic,
    aspect_ratio: "9:16",
    source: CompleteShortReelSourceSnapshotSchema.parse(params.source),
    revision: 1,
    model_note: params.model_note || "Omni 1.1 Flash",
    created_at: now,
    updated_at: now,
    script: null,
    visual_context: null,
    units: {
      references: {
        state: "missing",
        last_accepted_payload: null,
        current_attempt: null,
        accepted_dependency_fingerprint: null,
      },
      script: {
        state: "missing",
        last_accepted_payload: null,
        current_attempt: null,
        accepted_dependency_fingerprint: null,
      },
      cover: {
        state: "missing",
        last_accepted_payload: null,
        current_attempt: null,
        accepted_dependency_fingerprint: null,
      },
      publishing: {
        state: "missing",
        last_accepted_payload: null,
        current_attempt: null,
        accepted_dependency_fingerprint: null,
      },
    },
  });
}

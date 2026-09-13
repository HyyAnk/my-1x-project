import { z } from "zod";
import { ReelSegmentSchema, type ReelSegment } from "./reelSegment.schema.js";
import type { ShortReelSourceSnapshotSchema } from "../shortReelSource.schema.js";
import type { ShortReelDisplayProjection } from "./reelShotPlan.schema.js";

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

export type ReelScript = z.infer<typeof ReelScriptSchema>;

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

function processCue(params: {
  role: "question" | "answer";
  targetIndex: number;
  cue: { text: string };
  segmentIndex: number;
  globalStart: number;
  expectedText: string;
  sourceText: string;
  isProjected: boolean;
  state: CueTrackingState;
  errors: string[];
}): void {
  if (params.segmentIndex !== params.targetIndex) {
    params.errors.push(`Canonical ${params.role} cues belong in segment ${params.targetIndex + 1}`);
  }
  if (params.cue.text === params.expectedText || params.cue.text === params.sourceText) {
    if (params.role === "question") {
      params.state.questionCueFound = true;
      params.state.firstQuestionTime = Math.min(params.state.firstQuestionTime, params.globalStart);
    } else {
      params.state.answerCueFound = true;
      params.state.firstAnswerTime = Math.min(params.state.firstAnswerTime, params.globalStart);
    }
  } else {
    params.errors.push(
      params.isProjected
        ? `${params.role === "question" ? "Question" : "Answer"} cue text "${params.cue.text}" does not match projected ${params.role} text "${params.expectedText}"`
        : `${params.role === "question" ? "Question" : "Answer"} cue text "${params.cue.text}" does not match source ${params.role} text "${params.sourceText}"`,
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
        processCue({
          role: "question",
          targetIndex: 0,
          cue,
          segmentIndex: s,
          globalStart,
          expectedText: expectedQuestionText,
          sourceText: source.question_text,
          isProjected: isQuestionProjected,
          state,
          errors,
        });
      } else if (cue.role === "answer") {
        processCue({
          role: "answer",
          targetIndex: 2,
          cue,
          segmentIndex: s,
          globalStart,
          expectedText: expectedAnswerText,
          sourceText: source.selected_answer_text,
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

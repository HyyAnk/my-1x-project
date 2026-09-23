import type { ReelSegment, ShortReelTopicSnapshot, ShortReelSourceSnapshot } from "@studio/shared";

export interface ScriptFormattingOptions {
  topic?: ShortReelTopicSnapshot | null;
  source?: ShortReelSourceSnapshot | null;
}

export interface SegmentCumulativeTiming {
  segment: ReelSegment;
  start: number;
  end: number;
}

/** Formats integer/fractional seconds into MM:SS string */
export function formatTimeSeconds(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Formats a start and end second range as MM:SS - MM:SS */
export function formatTimingRange(start: number, end: number): string {
  return `${formatTimeSeconds(start)} - ${formatTimeSeconds(end)}`;
}

/** Computes cumulative start and end timestamps across sequentially placed segments */
export function getSegmentsWithCumulativeTimings(segments: ReelSegment[]): SegmentCumulativeTiming[] {
  let cursor = 0;
  return segments.map((segment) => {
    const start = cursor;
    const end = cursor + segment.duration_seconds;
    cursor = end;
    return {
      segment,
      start,
      end,
    };
  });
}

/**
 * Formats a cohesive, full production script into readable plain text suitable
 * for copying to clipboard, teleprompter, or project documentation.
 */
export function formatFullScriptText(
  segments: ReelSegment[],
  options?: ScriptFormattingOptions,
): string {
  const lines: string[] = [];

  if (options?.topic?.title) {
    lines.push(`TITLE: ${options.topic.title}`);
  }
  if (options?.topic?.hook) {
    lines.push(`HOOK: ${options.topic.hook}`);
  }
  if (options?.source?.question_text) {
    lines.push(`QUESTION: ${options.source.question_text}`);
  }
  if (options?.source?.selected_answer_text) {
    lines.push(`ANSWER: ${options.source.selected_answer_text}`);
  }

  const totalDuration = segments.reduce((sum, s) => sum + s.duration_seconds, 0);
  if (totalDuration > 0) {
    lines.push(`TOTAL DURATION: ${totalDuration}s`);
  }

  if (lines.length > 0) {
    lines.push("");
  }

  const timedSegments = getSegmentsWithCumulativeTimings(segments);

  timedSegments.forEach(({ segment, start, end }) => {
    lines.push(`--- SEGMENT ${segment.index} (${formatTimingRange(start, end)} | ${segment.duration_seconds}s) ---`);

    if (segment.dialogue && segment.dialogue.trim()) {
      lines.push(`[SPOKEN DIALOGUE]`);
      lines.push(`"${segment.dialogue.trim()}"`);
      lines.push("");
    }

    lines.push(`[VISUAL ACTION]`);
    lines.push(segment.narrative.trim());
    lines.push("");

    if (segment.text_cues && segment.text_cues.length > 0) {
      lines.push(`[ON-SCREEN TEXT]`);
      segment.text_cues.forEach((cue) => {
        lines.push(`• [${cue.role.toUpperCase()}] "${cue.text}" (${cue.start_seconds}s - ${cue.end_seconds}s)`);
      });
      lines.push("");
    }

    if (segment.audio_direction && segment.audio_direction.trim()) {
      lines.push(`[AUDIO DIRECTION]`);
      lines.push(segment.audio_direction.trim());
      lines.push("");
    }
  });

  return lines.join("\n").trim();
}

/**
 * Extracts spoken dialogue lines across all segments for rapid TTS generation,
 * voiceover recording, or teleprompter readouts.
 */
export function formatScriptDialogueOnly(segments: ReelSegment[]): string {
  const timedSegments = getSegmentsWithCumulativeTimings(segments);
  const lines: string[] = [];

  timedSegments.forEach(({ segment, start, end }) => {
    const dialogue = segment.dialogue?.trim();
    lines.push(`Segment ${segment.index} (${formatTimingRange(start, end)}):`);
    if (dialogue) {
      lines.push(dialogue);
    } else {
      lines.push("(Visual only - no spoken dialogue)");
    }
    lines.push("");
  });

  return lines.join("\n").trim();
}

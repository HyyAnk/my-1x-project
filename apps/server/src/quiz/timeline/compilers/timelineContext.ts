import type { QuizTimeline } from "@studio/shared";
import type { QuizTimingPolicy } from "../timingPolicy.js";

export function round(value: number): number {
  return Number(value.toFixed(3));
}

export class TimelineContext {
  readonly events: QuizTimeline["events"] = [];
  readonly scheduled = new Set<string>();
  private sequence = 0;
  cursor = 0;

  constructor(
    readonly policy: QuizTimingPolicy,
    readonly audioDurations?: Record<string, number>,
  ) {}

  add(event: Omit<QuizTimeline["events"][number], "event_id">): void {
    this.events.push({ ...event, event_id: "event-" + String(++this.sequence).padStart(4, "0") });
  }

  durationFor(segmentId: string, fallbackText: string): number {
    const measured = this.audioDurations?.[segmentId];
    if (typeof measured === "number" && Number.isFinite(measured) && measured >= 0) return round(measured);
    const words = fallbackText.trim().split(/\s+/).filter(Boolean).length;
    return round(Math.max(0.25, words / this.policy.fallback_words_per_second));
  }

  scheduleNarration(segmentId: string, at: number, text: string, questionId: string | null): number {
    const duration = this.durationFor(segmentId, text);
    this.add({
      type: "narration.segment",
      at_seconds: at,
      duration_seconds: duration,
      question_id: questionId,
      choice_id: null,
      segment_id: segmentId,
      payload: {},
    });
    this.scheduled.add(segmentId);
    return duration;
  }
}

import type { IntroOutroSnapshot, QuizTimeline, VoicePlan } from "@studio/shared";
import { compileQuizTimeline, type TimelineCompileInput } from "../timeline/compileTimeline.js";

export function matchesBookendTiming(timeline: QuizTimeline | null, intro: number, outro: number): boolean {
  if (!timeline) return false;
  const first = timeline.events.find((event) => event.type === "question.enter")?.at_seconds;
  const end = timeline.events.find((event) => event.segment_id === "outro")?.at_seconds;
  return (
    first !== undefined &&
    Math.abs(first - intro) < 0.002 &&
    Math.abs((end === undefined ? 0 : timeline.duration_seconds - end) - outro) < 0.002
  );
}

export function uploadedMediaTiming(
  input: Pick<TimelineCompileInput, "quiz" | "director"> & {
    voicePlan: VoicePlan;
    timeline?: QuizTimeline;
    topic?: string;
    channelName?: string;
    bridgeConfig?: TimelineCompileInput["bridgeConfig"];
  },
  snapshot: IntroOutroSnapshot,
): { voicePlan: VoicePlan; timeline: QuizTimeline } {
  const voicePlan = {
    ...input.voicePlan,
    segments: input.voicePlan.segments.filter((segment) => segment.role !== "intro" && segment.role !== "outro"),
  };
  if (voicePlan.segments.some((segment) => segment.duration_seconds === null)) {
    throw new Error("Generate measured body narration before rendering uploaded Intro/Outro media.");
  }

  const existingTopicEvent = input.timeline?.events.find((event) => event.type === "bridge.topic.enter");
  const existingTopic = existingTopicEvent?.payload?.topic as string | undefined;
  const topic =
    input.topic?.trim() ||
    (existingTopic && existingTopic !== "Today's Quiz" && existingTopic !== "Today's Challenge" ? existingTopic : undefined) ||
    input.topic;

  const existingCtaEvent = input.timeline?.events.find((event) => event.type === "bridge.cta.enter");
  const channelName = input.channelName || (existingCtaEvent?.payload?.channelName as string | undefined);

  const timeline = compileQuizTimeline({
    ...input,
    voicePlan,
    topic,
    channelName,
    bridgeConfig: input.bridgeConfig,
    audioDurations: Object.fromEntries(voicePlan.segments.map((segment) => [segment.segment_id, segment.duration_seconds ?? 0])),
    introDuration: snapshot.intro_duration_seconds,
    outroDuration: snapshot.outro_duration_seconds,
  });
  return { voicePlan, timeline };
}

/** Re-time only the existing body speech; never reuse legacy bookend speech. */
export function buildRetimedNarrationFilter(previous: QuizTimeline, next: QuizTimeline): string {
  const events = next.events.filter((event) => event.type === "narration.segment" && event.segment_id);
  if (!events.length) throw new Error("No body narration is available for Intro/Outro reconciliation");
  const filters = [`[0:a]asplit=${events.length}${events.map((_, i) => `[source${i}]`).join("")}`];
  events.forEach((event, i) => {
    const old = previous.events.find((item) => item.type === "narration.segment" && item.segment_id === event.segment_id);
    if (!old || Math.abs(old.duration_seconds - event.duration_seconds) > 0.002) {
      throw new Error(`Narration timing changed for ${event.segment_id}. Regenerate episode voice before rendering.`);
    }
    filters.push(
      `[source${i}]atrim=start=${old.at_seconds}:duration=${old.duration_seconds},asetpts=PTS-STARTPTS,` +
        `aformat=sample_rates=48000:channel_layouts=stereo,adelay=${Math.round(event.at_seconds * 1000)}:all=1[speech${i}]`,
    );
  });
  filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${next.duration_seconds}[silence]`);
  filters.push(
    `[silence]${events.map((_, i) => `[speech${i}]`).join("")}amix=inputs=${events.length + 1}:normalize=0,` +
      `atrim=duration=${next.duration_seconds}[out]`,
  );
  return filters.join(";\n");
}

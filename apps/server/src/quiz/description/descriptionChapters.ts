import type { QuizTimeline, QuizTimelineEvent } from "@studio/shared";
import type { DescriptionChapter, DescriptionChapterLabels } from "./description.types.js";

/** YouTube only enables chapters when every chapter lasts at least 10 seconds. */
export const YOUTUBE_MIN_CHAPTER_SECONDS = 10;
/** YouTube requires at least three timestamps before it renders chapters. */
export const YOUTUBE_MIN_CHAPTER_COUNT = 3;

const OUTRO_EVENT_TYPES = new Set<QuizTimelineEvent["type"]>(["pre_outro.enter", "bridge.cta.enter"]);

interface ChapterMarker {
  startSeconds: number;
  title: string;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Formats seconds as a YouTube chapter timestamp ("0:00", "4:05", "1:02:09").
 * Hours are only shown when the video itself is at least one hour long.
 */
export function formatChapterTimestamp(totalSeconds: number, videoDurationSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (videoDurationSeconds >= 3600) return `${hours}:${pad2(minutes)}:${pad2(secs)}`;
  return `${minutes + hours * 60}:${pad2(secs)}`;
}

function collectQuestionStarts(timeline: QuizTimeline): number[] {
  const seen = new Set<string>();
  const starts: number[] = [];
  for (const event of timeline.events) {
    if (event.type !== "question.enter" || !event.question_id || seen.has(event.question_id)) continue;
    seen.add(event.question_id);
    starts.push(Math.floor(event.at_seconds));
  }
  return starts;
}

function findOutroStart(timeline: QuizTimeline, lastQuestionStart: number): number | null {
  const outro = timeline.events.find(
    (event) => event.at_seconds > lastQuestionStart && (OUTRO_EVENT_TYPES.has(event.type) || event.segment_id === "outro"),
  );
  return outro ? Math.floor(outro.at_seconds) : null;
}

function buildRawMarkers(questionStarts: number[], outroStart: number | null, labels: DescriptionChapterLabels): ChapterMarker[] {
  const markers: ChapterMarker[] = questionStarts.map((startSeconds, index) => ({ startSeconds, title: labels.question(index + 1) }));
  const firstStart = questionStarts[0];
  if (firstStart >= YOUTUBE_MIN_CHAPTER_SECONDS) {
    markers.unshift({ startSeconds: 0, title: labels.intro });
  } else {
    markers[0] = { ...markers[0], startSeconds: 0 };
  }
  if (outroStart !== null) markers.push({ startSeconds: outroStart, title: labels.results });
  return markers;
}

/** Drops markers that would create chapters shorter than YouTube's minimum length. */
function enforceMinimumLengths(markers: ChapterMarker[], durationSeconds: number): ChapterMarker[] {
  const kept: ChapterMarker[] = [];
  for (const marker of markers) {
    const previous = kept[kept.length - 1];
    if (previous && marker.startSeconds - previous.startSeconds < YOUTUBE_MIN_CHAPTER_SECONDS) continue;
    kept.push(marker);
  }
  while (kept.length > 1 && durationSeconds - kept[kept.length - 1].startSeconds < YOUTUBE_MIN_CHAPTER_SECONDS) {
    kept.pop();
  }
  return kept;
}

/**
 * Derives YouTube-compliant chapters from the compiled timeline, whose clock already
 * includes the intro bookend. Returns an empty list when YouTube would reject the chapters.
 */
export function buildDescriptionChapters(
  timeline: QuizTimeline,
  labels: DescriptionChapterLabels,
  videoDurationSeconds: number = timeline.duration_seconds,
): DescriptionChapter[] {
  const durationSeconds = Math.floor(Math.min(timeline.duration_seconds, videoDurationSeconds || timeline.duration_seconds));
  const questionStarts = collectQuestionStarts(timeline).filter((start) => start < durationSeconds);
  if (questionStarts.length === 0) return [];

  const outroStart = findOutroStart(timeline, questionStarts[questionStarts.length - 1]);
  const markers = enforceMinimumLengths(buildRawMarkers(questionStarts, outroStart, labels), durationSeconds);
  if (markers.length < YOUTUBE_MIN_CHAPTER_COUNT) return [];

  return markers.map((marker) => ({
    start_seconds: marker.startSeconds,
    timestamp: formatChapterTimestamp(marker.startSeconds, durationSeconds),
    title: marker.title,
  }));
}

export function formatChaptersBlock(chapters: DescriptionChapter[], header: string): string {
  if (chapters.length === 0) return "";
  return [header, ...chapters.map((chapter) => `${chapter.timestamp} ${chapter.title}`)].join("\n");
}

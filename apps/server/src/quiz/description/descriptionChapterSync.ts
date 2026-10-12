import { QUIZ_SHORT_ID_PREFIX, type QuizTimeline, type VideoDescription } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { refreshDescriptionChapters } from "./descriptionChapterSection.js";

type ChapterSyncRepository = Pick<RepositoryService, "readVideoDescription" | "writeVideoDescription" | "readQuizTimeline">;

function chaptersEqual(left: VideoDescription["chapters"], right: VideoDescription["chapters"]): boolean {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

/**
 * Applies the latest timeline's chapters to a description. Chapters come purely from the
 * rendered video, so they are added regardless of the channel's publishing setup.
 * Returns the description unchanged when nothing differs.
 */
export function applyTimelineChapters(description: VideoDescription, timeline: QuizTimeline): VideoDescription {
  const refreshed = refreshDescriptionChapters({ text: description.full_description_text, timeline, language: description.language });
  if (refreshed.text === description.full_description_text && chaptersEqual(refreshed.chapters, description.chapters)) return description;
  return { ...description, full_description_text: refreshed.text, char_count: refreshed.text.length, chapters: refreshed.chapters };
}

/**
 * Keeps the stored Episode description's chapters in sync with its timeline. Descriptions are often
 * generated before the video timeline exists, so this runs whenever a timeline is written or a
 * description is read. Best-effort: failures never block the caller.
 */
export async function syncDescriptionChapters(
  repository: ChapterSyncRepository,
  channelId: string,
  episodeId: string,
  timeline?: QuizTimeline | null,
): Promise<VideoDescription | null> {
  if (episodeId.startsWith(QUIZ_SHORT_ID_PREFIX)) return repository.readVideoDescription(channelId, episodeId);
  try {
    const description = await repository.readVideoDescription(channelId, episodeId);
    const currentTimeline = timeline ?? (await repository.readQuizTimeline(channelId, episodeId));
    if (!description || !currentTimeline) return description;
    const synced = applyTimelineChapters(description, currentTimeline);
    if (synced !== description) await repository.writeVideoDescription(channelId, episodeId, synced);
    return synced;
  } catch (error) {
    console.warn(
      `[descriptionChapterSync] Skipped chapter sync for episode "${episodeId}":`,
      error instanceof Error ? error.message : error,
    );
    return repository.readVideoDescription(channelId, episodeId).catch(() => null);
  }
}

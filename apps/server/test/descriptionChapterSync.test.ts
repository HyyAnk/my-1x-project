import { describe, expect, it } from "vitest";
import type { QuizTimeline, QuizTimelineEvent, VideoDescription } from "@studio/shared";
import { syncDescriptionChapters } from "../src/quiz/description/descriptionChapterSync.js";

function questionEvent(index: number, atSeconds: number): QuizTimelineEvent {
  return {
    event_id: `event-${index}`,
    type: "question.enter",
    at_seconds: atSeconds,
    duration_seconds: 0,
    question_id: `q-${index}`,
    choice_id: null,
    segment_id: null,
    payload: {},
  };
}

const timeline: QuizTimeline = {
  schema_version: 2,
  episode_id: "ep-1",
  duration_seconds: 79.5,
  events: [questionEvent(1, 2.6), questionEvent(2, 28.04), questionEvent(3, 53.49)],
};

const description: VideoDescription = {
  topic_category: "Arcade",
  primary_keyword: "arcade game trivia",
  keyword_variations: [],
  question_count: 3,
  hook_lines: "Hook",
  semantic_paragraph: "Paragraph",
  scoring_cta: { beginner: "0–1 points: A", intermediate: "2 points: B", expert: "3 points: C", cta_text: "CTA" },
  suggested_playlist_category: "Arcade",
  hashtags: ["#quiz"],
  full_description_text: "Hook\n\nParagraph\n\n🏆 SCORING TIERS:\n• 0–1 points: A\n\n#quiz",
  char_count: 0,
  language: "en",
  generated_at: "2026-10-11T00:00:00.000Z",
};

function fakeRepository(initial: { description: VideoDescription | null; timeline: QuizTimeline | null }) {
  const state = { ...initial, writes: 0 };
  return {
    state,
    readVideoDescription: () => Promise.resolve(state.description),
    readQuizTimeline: () => Promise.resolve(state.timeline),
    writeVideoDescription: (_channelId: string, _episodeId: string, next: VideoDescription) => {
      state.description = next;
      state.writes += 1;
      return Promise.resolve("video-description.json");
    },
  };
}

describe("syncDescriptionChapters", () => {
  it("adds chapters once the video timeline exists, without any channel setup", async () => {
    const repository = fakeRepository({ description, timeline });
    const synced = await syncDescriptionChapters(repository as never, "ch-1", "ep-1");
    expect(synced?.full_description_text).toBe(
      "Hook\n\nParagraph\n\n⏱️ CHAPTERS:\n0:00 Question 1\n0:28 Question 2\n0:53 Question 3\n\n🏆 SCORING TIERS:\n• 0–1 points: A\n\n#quiz",
    );
    expect(synced?.chapters).toHaveLength(3);
    expect(repository.state.writes).toBe(1);
  });

  it("is idempotent and leaves descriptions alone until a timeline exists", async () => {
    const repository = fakeRepository({ description, timeline });
    await syncDescriptionChapters(repository as never, "ch-1", "ep-1");
    await syncDescriptionChapters(repository as never, "ch-1", "ep-1");
    expect(repository.state.writes).toBe(1);

    const noTimeline = fakeRepository({ description, timeline: null });
    expect(await syncDescriptionChapters(noTimeline as never, "ch-1", "ep-1")).toBe(description);
    expect(noTimeline.state.writes).toBe(0);
  });

  it("never adds chapters to Quiz Shorts", async () => {
    const repository = fakeRepository({ description, timeline });
    await syncDescriptionChapters(repository as never, "ch-1", "qshort_123");
    expect(repository.state.writes).toBe(0);
  });
});

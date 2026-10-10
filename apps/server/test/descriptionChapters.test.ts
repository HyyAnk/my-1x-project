import { describe, expect, it } from "vitest";
import type { QuizTimeline, QuizTimelineEvent } from "@studio/shared";
import {
  assembleFullDescription,
  buildDescriptionChapters,
  formatChapterTimestamp,
  getDescriptionSectionLocale,
  refreshDescriptionChapters,
  upsertChaptersSection,
} from "../src/quiz/description/index.js";

const EN_LABELS = getDescriptionSectionLocale("en").chapterLabels;

function event(
  index: number,
  type: QuizTimelineEvent["type"],
  atSeconds: number,
  extra: Partial<QuizTimelineEvent> = {},
): QuizTimelineEvent {
  return {
    event_id: `event-${index}`,
    type,
    at_seconds: atSeconds,
    duration_seconds: 0,
    question_id: null,
    choice_id: null,
    segment_id: null,
    payload: {},
    ...extra,
  };
}

function buildTimeline(questionStarts: number[], durationSeconds: number, outroAt?: number): QuizTimeline {
  const events = [event(0, "background.enter", 0)];
  questionStarts.forEach((start, index) => {
    events.push(event(events.length, "question.enter", start, { question_id: `question-${index + 1}` }));
    events.push(event(events.length, "answer.reveal", start + 8, { question_id: `question-${index + 1}` }));
  });
  if (outroAt !== undefined) events.push(event(events.length, "pre_outro.enter", outroAt));
  return { schema_version: 2, episode_id: "ep-1", duration_seconds: durationSeconds, events };
}

describe("buildDescriptionChapters", () => {
  it("anchors the first question at 0:00 when the intro is shorter than 10 seconds", () => {
    const chapters = buildDescriptionChapters(buildTimeline([2.6, 28.04, 53.49], 79.53), EN_LABELS);
    expect(chapters.map((chapter) => `${chapter.timestamp} ${chapter.title}`)).toEqual([
      "0:00 Question 1",
      "0:28 Question 2",
      "0:53 Question 3",
    ]);
  });

  it("adds Intro and Final Score chapters when they are long enough", () => {
    const chapters = buildDescriptionChapters(buildTimeline([12, 40, 68], 120, 95), EN_LABELS);
    expect(chapters.map((chapter) => chapter.title)).toEqual(["Intro", "Question 1", "Question 2", "Question 3", "Final Score"]);
    expect(chapters[0].start_seconds).toBe(0);
    expect(chapters[4].timestamp).toBe("1:35");
  });

  it("drops a trailing chapter shorter than 10 seconds", () => {
    const chapters = buildDescriptionChapters(buildTimeline([0, 25, 50], 100, 95), EN_LABELS);
    expect(chapters.map((chapter) => chapter.title)).toEqual(["Question 1", "Question 2", "Question 3"]);
  });

  it("returns no chapters when YouTube would reject them", () => {
    expect(buildDescriptionChapters(buildTimeline([0, 30], 60), EN_LABELS)).toEqual([]);
    expect(buildDescriptionChapters(buildTimeline([0, 5, 9], 30), EN_LABELS)).toEqual([]);
  });

  it("localizes chapter titles", () => {
    const chapters = buildDescriptionChapters(buildTimeline([0, 30, 60], 90), getDescriptionSectionLocale("ja").chapterLabels);
    expect(chapters.map((chapter) => chapter.title)).toEqual(["第1問", "第2問", "第3問"]);
  });
});

describe("formatChapterTimestamp", () => {
  it("uses M:SS for short videos and H:MM:SS for videos of an hour or more", () => {
    expect(formatChapterTimestamp(0, 600)).toBe("0:00");
    expect(formatChapterTimestamp(605.9, 900)).toBe("10:05");
    expect(formatChapterTimestamp(3729, 4000)).toBe("1:02:09");
    expect(formatChapterTimestamp(65, 4000)).toBe("0:01:05");
  });
});

describe("upsertChaptersSection", () => {
  const block = "⏱️ CHAPTERS:\n0:00 Question 1\n0:30 Question 2\n1:00 Question 3";

  it("inserts the block before the scoring section", () => {
    const text = "Hook line\n\nParagraph.\n\n🏆 SCORING TIERS:\n• 0–1 points: Rookie\n\n#quiz";
    expect(upsertChaptersSection(text, block)).toBe(
      `Hook line\n\nParagraph.\n\n${block}\n\n🏆 SCORING TIERS:\n• 0–1 points: Rookie\n\n#quiz`,
    );
  });

  it("inserts before a trailing hashtag paragraph when no scoring section exists", () => {
    expect(upsertChaptersSection("Edited by hand.\n\n#quiz #trivia", block)).toBe(`Edited by hand.\n\n${block}\n\n#quiz #trivia`);
  });

  it("replaces a stale block in any supported language and removes it when chapters are invalid", () => {
    const stale = "Hook\n\n⏱️ KAPITEL:\n0:00 Frage 1\n\n#quiz";
    expect(upsertChaptersSection(stale, block)).toBe(`Hook\n\n${block}\n\n#quiz`);
    expect(upsertChaptersSection(stale, "")).toBe("Hook\n\n#quiz");
  });
});

describe("refreshDescriptionChapters", () => {
  it("leaves the text untouched without a timeline", () => {
    const result = refreshDescriptionChapters({ text: "Hook\n\n#quiz", timeline: null });
    expect(result).toEqual({ text: "Hook\n\n#quiz", chapters: [] });
  });

  it("rebuilds chapters from the latest timeline", () => {
    const result = refreshDescriptionChapters({ text: "Hook\n\n#quiz", timeline: buildTimeline([0, 30, 60], 90), language: "es" });
    expect(result.chapters).toHaveLength(3);
    expect(result.text).toBe("Hook\n\n⏱️ CAPÍTULOS:\n0:00 Pregunta 1\n0:30 Pregunta 2\n1:00 Pregunta 3\n\n#quiz");
  });
});

describe("assembleFullDescription localization", () => {
  it("renders localized section headers and the chapter block", () => {
    const chapters = buildDescriptionChapters(buildTimeline([0, 30, 60], 90), getDescriptionSectionLocale("es").chapterLabels);
    const { fullText } = assembleFullDescription({
      hookLines: "Hook",
      semanticParagraph: "Paragraph",
      scoringCta: { beginner: "0–1 puntos: A", intermediate: "2 puntos: B", expert: "3 puntos: C", cta_text: "CTA" },
      suggestedPlaylistCategory: "Trivia",
      hashtags: ["#quiz"],
      chapters,
      language: "es",
    });
    expect(fullText).toContain("⏱️ CAPÍTULOS:\n0:00 Pregunta 1");
    expect(fullText).toContain("🏆 NIVELES DE PUNTUACIÓN:");
    expect(fullText).not.toContain("Categoría");
    expect(fullText).not.toContain("SCORING TIERS");
  });
});

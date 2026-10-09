import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { validateQuizTimeline } from "../src/quiz/timeline/validateTimeline.js";
import { resolveMidRollCtaAnchorIndex } from "../src/quiz/bridge/midRollCta.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import type { QuizRenderStyleContext } from "../src/quiz/render/quizRenderStyleContext.js";

function createMockQuiz(questionCount: number) {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "mid-roll-cta-test",
    age_band: "7-9",
    language: "English",
    questions: Array.from({ length: questionCount }, (_, index) => ({
      id: "q-" + String(index + 1).padStart(2, "0"),
      number: index + 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Sample question " + (index + 1) + "?",
      choices: [
        { id: "choice-a", text: "Answer A" },
        { id: "choice-b", text: "Answer B" },
        { id: "choice-c", text: "Answer C" },
      ],
      correct_choice_id: "choice-a",
      explanation: "Explanation " + (index + 1),
      fun_fact: "",
      source_ids: ["S" + (index + 1)],
      visual_opportunity: "",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    })),
  });
}

const bridgeConfig = { enabled: true, enableTopicScene: true, enableCtaScene: true };

function compileWithBridge(questionCount: number) {
  const quiz = createMockQuiz(questionCount);
  const director = createDefaultDirectorPlan(quiz);
  const voicePlan = buildQuizVoicePlan(quiz, { bridgeConfig, includeBridgeSegments: true, channelName: "Feli" });
  const timeline = compileQuizTimeline({ quiz, director, voicePlan, bridgeConfig, channelName: "Feli", topic: "Anime" });
  return { quiz, voicePlan, timeline };
}

function questionEnterAt(timeline: ReturnType<typeof compileWithBridge>["timeline"], questionId: string): number {
  return timeline.events.find((event) => event.type === "question.enter" && event.question_id === questionId)!.at_seconds;
}

describe("mid-roll subscribe CTA placement", () => {
  it.each([
    [20, 9],
    [11, 9],
    [10, 4],
    [3, 1],
    [1, 0],
    [0, null],
  ])("anchors a %i-question quiz after question index %s", (questionCount, expected) => {
    expect(resolveMidRollCtaAnchorIndex(questionCount)).toBe(expected);
  });

  it("plays the CTA between question 10 and question 11 of a 20-question quiz", () => {
    const { quiz, timeline } = compileWithBridge(20);
    expect(validateQuizTimeline(quiz, timeline)).toEqual([]);

    const cta = timeline.events.find((event) => event.type === "bridge.cta.enter")!;
    expect(cta.at_seconds).toBeGreaterThan(questionEnterAt(timeline, "q-10"));
    expect(Number((cta.at_seconds + cta.duration_seconds).toFixed(3))).toBe(questionEnterAt(timeline, "q-11"));
    expect(cta.payload.placement).toBe("mid_roll");

    const firstQuestionStart = questionEnterAt(timeline, "q-01");
    const topic = timeline.events.find((event) => event.type === "bridge.topic.enter")!;
    expect(firstQuestionStart).toBe(Number((topic.at_seconds + topic.duration_seconds).toFixed(3)));
  });

  it("orders the CTA voice segment right after question 10 in the voice plan", () => {
    const { voicePlan } = compileWithBridge(20);
    const ids = voicePlan.segments.map((segment) => segment.segment_id);
    const ctaIndex = ids.indexOf("intro_cta");
    expect(ids[ctaIndex - 1]?.startsWith("q-10:")).toBe(true);
    expect(ids[ctaIndex + 1]).toBe("q-11:question");
  });

  it("ends the question 10 scene exactly where the mid-roll CTA scene starts", () => {
    const { quiz, timeline } = compileWithBridge(12);
    const styleContext = {
      imageStyle: "mixed",
      thinkingBarStyle: "auto",
      questionBoxStyle: "auto",
      answerCardStyle: "auto",
      counterStyle: "auto",
      backgroundStyle: "auto",
      paletteId: "auto",
      topicWheelEnabled: false,
      musicStyle: "upbeat",
      thumbnailRatio: "16:9",
    } as unknown as QuizRenderStyleContext;
    const { html } = buildCandyArcadeCompositionBundle({
      quiz,
      director: createDefaultDirectorPlan(quiz),
      timeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });

    const clipBounds = (idPrefix: string) => {
      const tag = html.match(new RegExp(`<(?:section|div)\\b[^>]*\\bid="${idPrefix}[^"]*"[^>]*>`))![0];
      const read = (name: string) => Number(tag.match(new RegExp(`${name}="([0-9.]+)"`))![1]);
      return { start: read("data-start"), end: Number((read("data-start") + read("data-duration")).toFixed(3)) };
    };
    const cta = timeline.events.find((event) => event.type === "bridge.cta.enter")!;
    expect(clipBounds("quiz-q10-").end).toBe(cta.at_seconds);
    expect(clipBounds("candy-bridge-cta-").start).toBe(cta.at_seconds);
    expect(html).toContain('id="bridge_topic_to_question-mount"');
  });
});

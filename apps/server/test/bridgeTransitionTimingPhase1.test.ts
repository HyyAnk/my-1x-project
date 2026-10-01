import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { validateQuizTimeline } from "../src/quiz/timeline/validateTimeline.js";

function createMockQuiz(questionCount = 3) {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "phase1-bridge-pacing-test",
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
      explanation: "Canonical explanation for question " + (index + 1),
      fun_fact: "",
      source_ids: ["S" + (index + 1)],
      visual_opportunity: "",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    })),
  });
}

describe("Phase 1: Bridge Transition & Pacing Calibration", () => {
  it("schedules bridge topic with 0.5s pause, 1.0s stinger transition, and CTA alignment", () => {
    const quiz = createMockQuiz(2);
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz, {
      bridgeConfig: {
        enabled: true,
        enableTopicScene: true,
        enableCtaScene: true,
      },
      includeBridgeSegments: true,
    });

    const audioDurations: Record<string, number> = {
      "intro:speech": 2.0,
      "intro_topic": 3.0,
      "intro_cta": 3.5,
      "q-01:question": 2.0,
      "q-01:choice": 2.5,
      "q-01:reveal": 1.5,
      "q-02:question": 2.0,
      "q-02:choice": 2.5,
      "q-02:reveal": 1.5,
      "outro:speech": 2.0,
    };

    const timeline = compileQuizTimeline({
      quiz,
      director,
      voicePlan,
      audioDurations,
      topic: "Space Explorers Challenge",
      channelName: "Galaxy Quiz",
    });

    // 1. Verify timeline integrity and chronological ordering
    expect(validateQuizTimeline(quiz, timeline)).toEqual([]);

    // 2. Locate bridge events
    const topicEnter = timeline.events.find((e) => e.type === "bridge.topic.enter");
    const ctaEnter = timeline.events.find((e) => e.type === "bridge.cta.enter");
    const stingerTransition = timeline.events.find(
      (e) => e.type === "transition.start" && e.payload?.instance_id === "bridge_topic_to_cta",
    );

    expect(topicEnter).toBeDefined();
    expect(ctaEnter).toBeDefined();
    expect(stingerTransition).toBeDefined();

    // 3. Verify Topic Scene timing
    // Voice duration is 3.0s. Default pause is 0.5s. Stinger is 1.3s with 0.65s overlap.
    // Total scene duration should be 3.0 + 0.5 + 0.65 = 4.15s.
    const topicStart = topicEnter!.at_seconds;
    expect(topicEnter!.duration_seconds).toBe(4.15);

    // 4. Verify Stinger Transition timing
    // Transition starts right after voice (3.0s) + pause (0.5s) = topicStart + 3.5s
    expect(stingerTransition!.at_seconds).toBe(Number((topicStart + 3.5).toFixed(3)));
    expect(stingerTransition!.duration_seconds).toBe(1.3);
    expect(stingerTransition!.payload.transition_id).toBe("brand_logo_stinger");
    expect(stingerTransition!.payload.intent).toBe("stinger");

    // 5. Verify SFX synchronization
    const stingerWhoosh = timeline.events.find(
      (e) => e.type === "sfx.play" && e.payload?.name === "stinger_whoosh",
    );
    const logoImpact = timeline.events.find(
      (e) => e.type === "sfx.play" && e.payload?.name === "stinger_logo_impact",
    );

    expect(stingerWhoosh).toBeDefined();
    expect(stingerWhoosh!.at_seconds).toBe(stingerTransition!.at_seconds);

    expect(logoImpact).toBeDefined();
    const expectedImpactOffset = Number((1.3 * 0.45).toFixed(3));
    expect(logoImpact!.at_seconds).toBe(Number((stingerTransition!.at_seconds + expectedImpactOffset).toFixed(3)));

    // 6. Verify CTA Scene handoff
    // CTA starts at the stinger transition midpoint (peak occlusion) = topicStart + 4.15s
    expect(ctaEnter!.at_seconds).toBe(Number((topicStart + 4.15).toFixed(3)));

    // 7. Verify CTA voice starts at +0.4s to let stinger uncover the card
    const ctaNarration = timeline.events.find(
      (e) => e.type === "narration.segment" && e.segment_id === "intro_cta",
    );
    expect(ctaNarration).toBeDefined();
    expect(ctaNarration!.at_seconds).toBe(Number((ctaEnter!.at_seconds + 0.4).toFixed(3)));
  });

  it("respects custom timing overrides from bridgeConfig", () => {
    const quiz = createMockQuiz(2);
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz, {
      bridgeConfig: {
        enabled: true,
        enableTopicScene: true,
        enableCtaScene: true,
      },
      includeBridgeSegments: true,
    });

    const audioDurations: Record<string, number> = {
      "intro:speech": 1.5,
      "intro_topic": 2.0,
      "intro_cta": 2.5,
      "q-01:question": 1.0,
      "q-01:choice": 1.0,
      "q-01:reveal": 1.0,
      "q-02:question": 1.0,
      "q-02:choice": 1.0,
      "q-02:reveal": 1.0,
      "outro:speech": 1.0,
    };

    const timeline = compileQuizTimeline({
      quiz,
      director,
      voicePlan,
      audioDurations,
      bridgeConfig: {
        enabled: true,
        enableTopicScene: true,
        enableCtaScene: true,
        timing: {
          topicPauseSeconds: 0.8,
          ctaPauseSeconds: 1.5,
          transitionType: "brand_logo_stinger",
          stingerDurationSeconds: 1.2,
        },
      },
    });

    expect(validateQuizTimeline(quiz, timeline)).toEqual([]);

    const topicEnter = timeline.events.find((e) => e.type === "bridge.topic.enter")!;
    const stingerTransition = timeline.events.find(
      (e) => e.type === "transition.start" && e.payload?.instance_id === "bridge_topic_to_cta",
    )!;

    // voice (2.0) + pause (0.8) + overlap (0.6) = 3.4s
    expect(topicEnter.duration_seconds).toBe(3.4);
    expect(stingerTransition.duration_seconds).toBe(1.2);
    expect(stingerTransition.at_seconds).toBe(Number((topicEnter.at_seconds + 2.8).toFixed(3)));
  });
});

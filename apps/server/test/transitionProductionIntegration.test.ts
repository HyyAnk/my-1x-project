import { describe, expect, it } from "vitest";
import {
  getTransitionDefinition,
  type ResolvedTransitionInstance,
} from "@studio/shared";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { applyTransitionSourceHandoff } from "../src/quiz/render/transitions/transitionSourceLayers.js";
import { createTransitionFixture, DETERMINISTIC_TRANSITION_QUIZ } from "./helpers/transitionFixtures.js";

describe("Task 3: Production Transition Integration", () => {
  it("threads the exact resolved instance through timeline data, markup, and transitionInstances", () => {
    const quiz = DETERMINISTIC_TRANSITION_QUIZ;
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz);

    // 1. Baseline timeline
    const timeline = compileQuizTimeline({ quiz, director, voicePlan });
    const narrationBefore = timeline.events.filter((event) => event.type === "narration.segment");
    expect(narrationBefore.length).toBeGreaterThan(0);

    // 2. Build production composition bundle
    const result = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      aspectRatio: "16:9",
    });

      // 3. Verify boundary ID and instance consistency
      const boundaryId = quiz.questions[0]!.id;
      const resolvedInstance = result.transitionInstances[boundaryId];
      expect(resolvedInstance).toBeDefined();
      expect(result.transitionInstances[boundaryId]).toEqual(resolvedInstance);

      // 4. Verify markup contains data-transition-instance attribute
      expect(result.html).toContain(`data-transition-instance="${boundaryId}"`);

      // 5. Narration and event timing preservation
      const narrationAfter = timeline.events.filter((event) => event.type === "narration.segment");
      expect(narrationAfter).toEqual(narrationBefore);

      // Check question enter times are preserved
      const q1Enter = timeline.events.find((e) => e.question_id === "specimen-q1" && e.type === "question.enter");
      const q2Enter = timeline.events.find((e) => e.question_id === "specimen-q2" && e.type === "question.enter");
      expect(q1Enter).toBeDefined();
      expect(q2Enter).toBeDefined();
      expect(q2Enter!.at_seconds).toBeGreaterThan(q1Enter!.at_seconds);

      // 6. Source layer handoff verification
      const sourceCss = applyTransitionSourceHandoff(resolvedInstance, {
        outgoingSelector: "#quiz-q1",
        incomingSelector: "#quiz-q2",
      });
      expect(sourceCss).toContain("/* Transition source handoff for specimen-q1 */");
      expect(sourceCss).toContain("#quiz-q1");
      expect(sourceCss).toContain("#quiz-q2");
      expect(sourceCss).toContain("--transition-boundary:");
  });

  it("preserves explicit pre-resolved transition instances passed via input", () => {
    const fixture = createTransitionFixture("brush_wave", "16:9");

    const boundaryId = fixture.quiz.questions[0]!.id;
    const def = getTransitionDefinition("brush_wave");

    const preResolvedInstance: ResolvedTransitionInstance = {
      instanceId: boundaryId,
      id: "brush_wave",
      implementationRevision: def.implementationRevision,
      placement: "scene",
      startFrame: 30,
      boundaryFrame: 42,
      endFrameExclusive: 54,
      durationFrames: 24,
      effectiveDurationSeconds: 0.8,
      fps: { numerator: 30, denominator: 1 },
      timingAdjustment: "none",
    };

    const result = buildCandyArcadeCompositionBundle({
      quiz: fixture.quiz,
      director: fixture.director,
      timeline: fixture.timeline,
      styleContext: fixture.styleContext,
      audioPath: "./narration.wav",
      narrationDurationSeconds: fixture.timeline.duration_seconds,
      transitionInstances: {
        [boundaryId]: preResolvedInstance,
      },
    });

    expect(result.transitionInstances[boundaryId]).toBe(preResolvedInstance);
    expect(result.html).toContain(`data-transition-instance="${boundaryId}"`);
    expect(result.html).toContain("transition-brush_wave");
  });
});

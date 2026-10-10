import { describe, expect, it, vi } from "vitest";
import type { QuizAssessment } from "@studio/shared";
import * as orchestrator from "../src/quiz/pipeline/orchestrator.js";
import { executeQuizQaGatesWithHealing } from "../src/tasks/pipeline/quizPipelineVoiceStep.js";
import { findUnhealableQuizBlocker, isUnhealableQuizBlocker } from "../src/tasks/pipeline/quizQaBlockerPolicy.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";

const blocker = (code: string): QuizAssessment["issues"][number] => ({
  code,
  severity: "blocker",
  message: `${code} blocked`,
  next_action: "Rebuild the Quiz Short artifacts.",
  question_ids: [],
  stage: "timeline",
});

function assessmentWith(issues: QuizAssessment["issues"]): QuizAssessment {
  return {
    schema_version: 2,
    episode_id: "qshort_test",
    assessed_at: new Date().toISOString(),
    score: 10,
    rating: "needs_work",
    categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
    issues,
  } as QuizAssessment;
}

describe("Quiz QA blocker policy", () => {
  it("marks every Quiz Short contract blocker as unhealable and leaves asset and voice blockers healable", () => {
    for (const code of [
      "quiz_short_choice_narration",
      "timeline_short_duration_exceeded",
      "timeline_short_choice_narration",
      "qa_portrait_layout_required",
      "qa_portrait_layout_pair_exceeded",
    ]) {
      expect(isUnhealableQuizBlocker(blocker(code))).toBe(true);
    }
    for (const code of ["asset_required_unresolved", "asset_generation_failed", "voice_pace_unsafe", "voice_pace_fast"]) {
      expect(isUnhealableQuizBlocker(blocker(code))).toBe(false);
    }
    expect(isUnhealableQuizBlocker({ code: "timeline_short_duration_exceeded", severity: "warning" })).toBe(false);
    expect(findUnhealableQuizBlocker([blocker("voice_pace_fast"), blocker("timeline_short_choice_narration")])?.code).toBe(
      "timeline_short_choice_narration",
    );
  });

  it("fails the QA gate with QUIZ_QA_BLOCKED on the first cycle instead of healing", async () => {
    const runQa = vi.spyOn(orchestrator, "runQa").mockResolvedValue({ assessment: assessmentWith([]), artifact_path: "qa.json" });
    const resolveAssets = vi.spyOn(orchestrator, "resolveAssets");
    const runtime = {
      update: vi.fn().mockResolvedValue(undefined),
      logger: { warn: vi.fn() },
      repository: {},
    } as unknown as TaskManagerRuntime;
    const task = { task_id: "task", channel_id: "channel", episode_id: "qshort_test" } as Parameters<
      typeof executeQuizQaGatesWithHealing
    >[1];
    const input = { repository: {}, channelId: "channel", episodeId: "qshort_test" } as Parameters<typeof executeQuizQaGatesWithHealing>[2];
    const artifacts = {
      quiz: null,
      history_check: null,
      director_plan: null,
      asset_plan: null,
      asset_resolution: null,
      voice_plan: null,
      timeline: null,
      assessment: assessmentWith([blocker("asset_required_unresolved"), blocker("timeline_short_duration_exceeded")]),
      description: null,
      title: null,
    };

    await expect(executeQuizQaGatesWithHealing(runtime, task, input, artifacts)).rejects.toMatchObject({
      code: "QUIZ_QA_BLOCKED",
      message: expect.stringContaining("timeline_short_duration_exceeded"),
    });
    expect(runQa).not.toHaveBeenCalled();
    expect(resolveAssets).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

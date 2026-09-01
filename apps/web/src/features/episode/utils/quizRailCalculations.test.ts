import { describe, expect, it } from "vitest";
import type { Task } from "@studio/shared";
import type { QuizV2State } from "../../../api";
import {
  STAGES,
  baseStatus,
  itemProgress,
  pipelineStage,
  resolveProgress,
  resolveStatus,
  statusLabel,
  taskProgress,
} from "./quizRailCalculations";

const defaultReadiness = {
  research: true,
  treatment: true,
  script: true,
  visualBible: false,
  scenes: false,
  video: false,
};

const mockState: QuizV2State = {
  stages: {
    research: "ready",
    questions: "not_started",
    director: "not_started",
    assets: "not_started",
    voice: "not_started",
    timeline: "not_started",
    qa: "not_started",
    render: "not_started",
  },
  quiz: {
    schema_version: 2,
    episode_id: "ep_test",
    language: "en",
    age_band: "7-9",
    questions: [
      {
        id: "q1",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Question 1",
        choices: [
          { id: "c1", text: "Choice 1" },
          { id: "c2", text: "Choice 2" },
          { id: "c3", text: "Choice 3" },
        ],
        correct_choice_id: "c1",
        explanation: "Explanation",
        fun_fact: "Fun Fact",
        source_ids: ["src1"],
        visual_opportunity: "Visual Opp",
        validation: {
          semantic_status: "validated",
          source_coverage: true,
          fact_locked: true,
        },
      },
    ],
  },
  director_plan: null,
  asset_plan: null,
  asset_resolution: null,
  voice_plan: null,
  timeline: null,
  assessment: null,
};

describe("quizRailCalculations", () => {
  it("defines all 12 stages in production rail order", () => {
    expect(STAGES).toHaveLength(12);
    expect(STAGES.map((s) => s.key)).toEqual([
      "research",
      "treatment",
      "script",
      "visualBible",
      "scenes",
      "questions",
      "director",
      "assets",
      "voice",
      "timeline",
      "qa",
      "render",
    ]);
  });

  describe("statusLabel", () => {
    it("formats status strings into human-readable labels", () => {
      expect(statusLabel("not_started")).toBe("Not started");
      expect(statusLabel("queued")).toBe("Waiting");
      expect(statusLabel("running")).toBe("Generating");
      expect(statusLabel("ready")).toBe("Ready");
      expect(statusLabel("failed")).toBe("Failed");
    });
  });

  describe("itemProgress & taskProgress", () => {
    it("calculates clamped percent for item progress", () => {
      expect(itemProgress(3, 10, "items")).toEqual({
        completed: 3,
        total: 10,
        percent: 30,
        unit: "items",
      });
      expect(itemProgress(0, 0, "items")).toEqual({
        completed: 0,
        total: 1,
        percent: 0,
        unit: "items",
      });
    });

    it("calculates progress from tasks list", () => {
      const tasks = [
        {
          task_id: "t1",
          task_type: "GENERATE_RESEARCH",
          channel_id: "ch_1",
          status: "COMPLETED",
          created_at: "2026-08-31T00:00:00Z",
          updated_at: "2026-08-31T00:00:00Z",
        } as unknown as Task,
      ];
      expect(taskProgress(tasks, "task")).toEqual({
        completed: 1,
        total: 1,
        percent: 100,
        unit: "task",
      });
    });
  });

  describe("resolveProgress", () => {
    it("resolves questions progress correctly", () => {
      const progress = resolveProgress("questions", defaultReadiness, mockState, [], 5);
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(5);
      expect(progress.percent).toBe(20);
      expect(progress.unit).toBe("questions");
    });

    it("resolves render progress correctly when task has render_progress", () => {
      const videoTask = {
        task_id: "task_v1",
        task_type: "GENERATE_VIDEO",
        channel_id: "ch_1",
        status: "RUNNING",
        progress_percent: 75,
        render_progress: {
          phase: "capture_streaming",
          frames_completed: 1200,
          total_frames: 3840,
          worker_count: 6,
          elapsed_ms: 12000,
          eta_seconds: 24,
        },
        created_at: "2026-08-31T00:00:00Z",
        updated_at: "2026-08-31T00:00:00Z",
      } as unknown as Task;

      const progress = resolveProgress("render", defaultReadiness, mockState, [videoTask], 5);
      expect(progress.completed).toBe(1200);
      expect(progress.total).toBe(3840);
      expect(progress.percent).toBe(31);
      expect(progress.unit).toBe("frames");
    });

    it("resolves render progress when video is completed", () => {
      const readyReadiness = { ...defaultReadiness, video: true };
      const progress = resolveProgress("render", readyReadiness, mockState, [], 5);
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(1);
      expect(progress.percent).toBe(100);
      expect(progress.unit).toBe("task");
    });
  });

  describe("pipelineStage", () => {
    it("returns null when no active pipeline task is present", () => {
      expect(pipelineStage(null)).toBeNull();
    });

    it("identifies pipeline stage from progress_message or error", () => {
      const activePipelineTask = {
        task_id: "t_pipe",
        task_type: "GENERATE_PIPELINE",
        channel_id: "ch_1",
        status: "RUNNING",
        progress_message: "Resolving assets 4/10",
        created_at: "2026-08-31T00:00:00Z",
        updated_at: "2026-08-31T00:00:00Z",
      } as unknown as Task;

      const stage = pipelineStage(activePipelineTask);
      expect(stage).not.toBeNull();
      expect(stage?.key).toBe("assets");
    });
  });

  describe("baseStatus and resolveStatus", () => {
    it("determines readiness correctly based on readiness object and state", () => {
      expect(baseStatus("research", defaultReadiness, mockState)).toBe("ready");
      expect(baseStatus("treatment", defaultReadiness, mockState)).toBe("ready");
      expect(baseStatus("visualBible", defaultReadiness, mockState)).toBe("not_started");
    });

    it("resolves status for stages ahead and behind running pipeline task", () => {
      const runningPipelineTask = {
        task_id: "t_pipe",
        task_type: "GENERATE_PIPELINE",
        channel_id: "ch_1",
        status: "RUNNING",
        progress_message: "Generating narration script",
        created_at: "2026-08-31T00:00:00Z",
        updated_at: "2026-08-31T00:00:00Z",
      } as unknown as Task;

      const currentStage = pipelineStage(runningPipelineTask);
      expect(currentStage?.key).toBe("script");

      // Stage before script (e.g. research at index 0) should be ready
      const researchStatus = resolveStatus("research", 0, defaultReadiness, mockState, runningPipelineTask, [], currentStage);
      expect(researchStatus).toBe("ready");

      // Current stage (script at index 2) should be running
      const scriptStatus = resolveStatus("script", 2, defaultReadiness, mockState, runningPipelineTask, [], currentStage);
      expect(scriptStatus).toBe("running");

      // Stage after script (timeline at index 9) should be queued
      const timelineStatus = resolveStatus("timeline", 9, defaultReadiness, mockState, runningPipelineTask, [], currentStage);
      expect(timelineStatus).toBe("queued");
    });
  });
});

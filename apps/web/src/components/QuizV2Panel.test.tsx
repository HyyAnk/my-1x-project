import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Task } from "@studio/shared";
import type { QuizV2State } from "../api";
import { QuizV2Panel } from "./QuizV2Panel";

afterEach(cleanup);

const mockState: QuizV2State = {
  stages: {
    research: "ready",
    questions: "ready",
    director: "ready",
    assets: "ready",
    voice: "ready",
    timeline: "ready",
    qa: "ready",
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
        question: "When was Rome founded?",
        choices: [
          { id: "c1", text: "753 BC" },
          { id: "c2", text: "476 AD" },
        ],
        correct_choice_id: "c1",
        explanation: "Tradition places it at 753 BC.",
        fun_fact: "Romulus was the legendary founder.",
        source_ids: ["src1"],
        visual_opportunity: "Ancient Rome forum",
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
  voice_plan: null,
  timeline: null,
  assessment: null,
};

const defaultReadiness = {
  research: true,
  treatment: true,
  script: true,
  visualBible: true,
  scenes: true,
  video: false,
};

describe("QuizV2Panel Component", () => {
  it("renders 7 streamlined stages by default and omits legacy stages", () => {
    const { container } = render(
      <QuizV2Panel
        state={mockState}
        readiness={defaultReadiness}
        pipelineTask={null}
        tasks={[]}
        questionCount={1}
      />,
    );

    const rail = container.querySelector(".quiz-v2-rail");
    expect(rail).toBeDefined();
    expect(rail?.classList.contains("is-streamlined")).toBe(true);

    expect(screen.getByText("Quiz Content")).toBeDefined();
    expect(screen.getByText("Visual Assets")).toBeDefined();
    expect(screen.getByText("Voice (TTS)")).toBeDefined();
    expect(screen.getByText("Thumbnail")).toBeDefined();
    expect(screen.getByText("Description")).toBeDefined();
    expect(screen.getByText("QA Gates")).toBeDefined();
    expect(screen.getByText("Video Render")).toBeDefined();

    // Must NOT show documentary legacy stages
    expect(screen.queryByText("Research")).toBeNull();
    expect(screen.queryByText("Treatment")).toBeNull();
    expect(screen.queryByText("Visual bible")).toBeNull();
  });

  it("renders 12 legacy stages when streamlined is explicitly false", () => {
    const { container } = render(
      <QuizV2Panel
        streamlined={false}
        state={mockState}
        readiness={defaultReadiness}
        pipelineTask={null}
        tasks={[]}
        questionCount={1}
      />,
    );

    const rail = container.querySelector(".quiz-v2-rail");
    expect(rail?.classList.contains("is-streamlined")).toBe(false);

    expect(screen.getByText("Research")).toBeDefined();
    expect(screen.getByText("Treatment")).toBeDefined();
    expect(screen.getByText("Visual bible")).toBeDefined();
    expect(screen.getByText("Scenes")).toBeDefined();
    expect(screen.getByText("Questions")).toBeDefined();
    expect(screen.getByText("Director")).toBeDefined();
    expect(screen.getByText("Assets")).toBeDefined();
    expect(screen.getByText("Voice")).toBeDefined();
    expect(screen.getByText("Timeline")).toBeDefined();
    expect(screen.getByText("QA")).toBeDefined();
  });

  it("displays running stage note for active pipeline task", () => {
    const activeTask = {
      task_id: "task-pipe",
      channel_id: "ch-1",
      episode_id: "ep-1",
      task_type: "GENERATE_PIPELINE",
      status: "RUNNING",
      progress_message: "Generating structured questions with facts",
      progress_percent: 30,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null,
      error: null,
    } as unknown as Task;

    render(
      <QuizV2Panel
        state={mockState}
        readiness={defaultReadiness}
        pipelineTask={activeTask}
        tasks={[activeTask]}
        questionCount={1}
      />,
    );

    expect(
      screen.getByText(/Current: Quiz Content · Generating structured questions with facts/),
    ).toBeDefined();
  });

  it("renders stage durations and parallel execution summary", () => {
    const stateWithTimings: QuizV2State = {
      ...mockState,
      timings: {
        schema_version: 1,
        stages: {
          quizContent: {
            duration_seconds: 12,
            started_at: "2026-09-04T06:00:00.000Z",
            completed_at: "2026-09-04T06:00:12.000Z",
          },
          assets: {
            duration_seconds: 14,
            parallel_group: "assets_voice",
            parallel_total_seconds: 23,
          },
          voice: {
            duration_seconds: 23,
            parallel_group: "assets_voice",
            parallel_total_seconds: 23,
          },
        },
        parallel_groups: {
          assets_voice: {
            stages: ["assets", "voice"],
            duration_seconds: 23,
          },
        },
      },
    };

    render(
      <QuizV2Panel
        state={stateWithTimings}
        readiness={defaultReadiness}
        pipelineTask={null}
        tasks={[]}
        questionCount={1}
      />,
    );

    // Parallel summary tag
    expect(screen.getByText(/Parallel \(Visual Assets & Voice\):/)).toBeDefined();
    expect(screen.getByText(/23s total/)).toBeDefined();

    // Stage duration badges
    expect(screen.getByText(/⏱ 12s/)).toBeDefined();
    expect(screen.getByText(/⏱ 14s/)).toBeDefined();
    expect(screen.getByText(/⏱ 23s/)).toBeDefined();

    // Parallel badges inside parallel stage items
    const parallelBadges = screen.getAllByText("//23s");
    expect(parallelBadges.length).toBeGreaterThanOrEqual(2);
  });
});

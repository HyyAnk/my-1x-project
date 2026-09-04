import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Task } from "@studio/shared";
import { PipelineRail, resolveQuizPipelineStage } from "./PipelineRail";

afterEach(cleanup);

describe("PipelineRail Component", () => {
  it("renders 4 streamlined stages by default", () => {
    render(
      <PipelineRail
        readiness={{
          quizContent: true,
          voiceAndAssets: false,
          qaGates: false,
          finalVideo: false,
        }}
      />,
    );

    expect(screen.getByText("Quiz Content")).toBeDefined();
    expect(screen.getByText("Voice & Assets")).toBeDefined();
    expect(screen.getByText("QA Gates")).toBeDefined();
    expect(screen.getByText("Video Render")).toBeDefined();
  });

  it("renders 7 legacy stages when streamlined is false", () => {
    render(
      <PipelineRail
        streamlined={false}
        readiness={{
          research: true,
          treatment: true,
          script: true,
          visualBible: false,
          scenes: false,
          narration: false,
          video: false,
        }}
      />,
    );

    expect(screen.getByText("Research")).toBeDefined();
    expect(screen.getByText("Quiz plan")).toBeDefined();
    expect(screen.getByText("Script")).toBeDefined();
    expect(screen.getByText("Design")).toBeDefined();
    expect(screen.getByText("Scenes")).toBeDefined();
    expect(screen.getByText("Audio")).toBeDefined();
    expect(screen.getByText("Video")).toBeDefined();
  });

  it("correctly derives streamlined readiness from legacy readiness flags", () => {
    render(
      <PipelineRail
        readiness={{
          script: true,
          visualBible: true,
          narration: true,
          scenes: true,
          video: true,
        }}
      />,
    );

    // All 4 should be marked Ready
    const readyBadges = screen.getAllByText("Ready");
    expect(readyBadges.length).toBe(4);
  });

  describe("resolveQuizPipelineStage", () => {
    it("resolves GENERATE_QUIZ to quizContent in streamlined mode", () => {
      const activeChildTask = {
        task_id: "task_quiz_1",
        task_type: "GENERATE_QUIZ",
        status: "RUNNING",
      } as unknown as Task;

      const stage = resolveQuizPipelineStage(null, [activeChildTask], true);
      expect(stage).toBe("quizContent");
    });

    it("resolves GENERATE_VIDEO to finalVideo in streamlined mode", () => {
      const activeChildTask = {
        task_id: "task_video_1",
        task_type: "GENERATE_VIDEO",
        status: "RUNNING",
      } as unknown as Task;

      const stage = resolveQuizPipelineStage(null, [activeChildTask], true);
      expect(stage).toBe("finalVideo");
    });

    it("resolves direct quiz progress message to quizContent in streamlined mode", () => {
      const pipelineTask = {
        task_id: "pipe_1",
        task_type: "PRODUCE_EPISODE",
        status: "RUNNING",
        progress_message: "Quiz · generating structured questions",
      } as unknown as Task;

      const stage = resolveQuizPipelineStage(pipelineTask, [], true);
      expect(stage).toBe("quizContent");
    });
  });
});

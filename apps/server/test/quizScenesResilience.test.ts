import { describe, expect, it, vi } from "vitest";
import { synthesizeScenesFromQuiz } from "../src/quiz/domain/quizArtifactSynthesizer.js";
import { readScenes } from "../src/repository/scenes.js";
import { buildEpisodeMarkdownStubs } from "../src/quiz/bank/bridge/bootstrapperHelpers.js";
import { parseScenes } from "../src/repository/sceneCodec.js";
import { QuizV2Schema, type QuizV2 } from "@studio/shared";

describe("Quiz Scenes Resilience and Auto-Synthesis", () => {
  const sampleQuiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "ep-scenes-resilience",
    age_band: "7-9",
    language: "en",
    questions: [
      {
        id: "q-01",
        number: 1,
        question: "What is the capital of France?",
        choices: [
          { id: "c1", text: "Paris" },
          { id: "c2", text: "London" },
          { id: "c3", text: "Berlin" },
        ],
        correct_choice_id: "c1",
        explanation: "Paris has been the capital since 508 AD.",
        visual_opportunity: "Eiffel tower under bright blue sky",
        format: "multiple_choice",
        difficulty: 1,
        source_ids: ["C01"],
        validation: {
          single_concept: true,
          temporal_stability: true,
          common_misconception: false,
          answer_defensibility: "high",
          source_coverage: true,
          pedagogical_value: "high",
        },
      },
    ],
  });

  it("synthesizes valid scenes from QuizV2", () => {
    const scenes = synthesizeScenesFromQuiz(sampleQuiz);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].scene_number).toBe(1);
    expect(scenes[0].quiz?.question).toBe("What is the capital of France?");
    expect(scenes[0].quiz?.answer).toBe("Paris");
    expect(scenes[0].quiz?.choices).toEqual(["Paris", "London", "Berlin"]);
    expect(scenes[0].source_ids).toEqual(["C01"]);
  });

  it("auto-synthesizes scenes in readScenes when scene_plan.md is empty but quiz-v2 exists", async () => {
    const writtenFiles: Record<string, string> = {};

    const mockRuntime: any = {
      getEpisodeFile: vi.fn().mockResolvedValue({
        name: "scene_plan.md",
        content: "# Scene Plan\n\nScene breakdown has not started.\n",
      }),
      getEpisode: vi.fn().mockResolvedValue({
        episode_id: "ep-scenes-resilience",
        slug: "ep-scenes-resilience",
        quiz_config: { quiz_format: "multiple_choice" },
      }),
      getChannel: vi.fn().mockResolvedValue({
        channel_id: "ch-1",
        slug: "ch-1",
      }),
      resolvePath: vi.fn((...segments: string[]) => segments.join("/")),
      writeTextAtomic: vi.fn((filePath: string, content: string) => {
        writtenFiles[filePath] = content;
        return Promise.resolve();
      }),
      readQuiz: vi.fn().mockResolvedValue(sampleQuiz),
    };

    const scenes = await readScenes.call(mockRuntime, "ch-1", "ep-scenes-resilience");

    expect(scenes).toHaveLength(1);
    expect(scenes[0].scene_number).toBe(1);
    expect(scenes[0].quiz?.question).toBe("What is the capital of France?");
    expect(mockRuntime.readQuiz).toHaveBeenCalledWith("ch-1", "ep-scenes-resilience");
    expect(mockRuntime.writeTextAtomic).toHaveBeenCalled();
  });

  it("buildEpisodeMarkdownStubs serializes scenes when scenes are provided", () => {
    const scenes = synthesizeScenesFromQuiz(sampleQuiz);
    const stubs = buildEpisodeMarkdownStubs({
      title: "Capital Cities",
      hook: "Can you guess them all?",
      premise: "Fun geography quiz",
      isTopic: true,
      scenes,
    });

    expect(stubs["scene_plan.md"]).toContain("# Scene 1");
    expect(stubs["scene_plan.md"]).toContain("What is the capital of France?");

    const parsed = parseScenes(stubs["scene_plan.md"], "ep-scenes-resilience");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].quiz?.question).toBe("What is the capital of France?");
  });
});

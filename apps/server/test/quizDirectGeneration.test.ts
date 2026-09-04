import { describe, expect, it, vi } from "vitest";
import type { Channel, Episode } from "@studio/shared";
import { buildDirectQuizOutputContract } from "../src/context/quizDirectPromptBuilder.js";
import { handleDirectQuizOutput } from "../src/tasks/handlers/directQuizHandler.js";
import type { ActiveRun, TaskManagerRuntime } from "../src/tasks/runtime.js";

const mockChannel: Channel = {
  channel_id: "channel-1",
  name: "Quiz Channel",
  slug: "quiz-channel",
  language: "vi",
  country: "VN",
  audience: "kids",
  persona: "Friendly guide",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mockEpisode: Episode = {
  episode_id: "ep-101",
  channel_id: "channel-1",
  topic: {
    title: "Động vật biển",
    core_premise: "Khám phá đại dương",
    hook: "Bí mật biển sâu",
  },
  stage: "IDEA",
  target_duration_minutes: 2,
  target_word_count: 200,
  quiz_config: {
    question_count: 3,
    age_band: "7-9",
    quiz_format: "multiple_choice",
    resolved_visual_style: "pixar_3d",
  },
  narration_asset_path: null,
  narration_duration_seconds: null,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

describe("quizDirectPromptBuilder", () => {
  it("builds a prompt requiring strict QuizV2 schema for multiple choice format", () => {
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode: mockEpisode,
      quizQuestionCount: 3,
      quizLastClaimId: "C03",
      quizSourceMinimum: 2,
    });

    expect(contract).toContain("Return ONLY a raw, valid JSON object matching QuizV2 schema");
    expect(contract).toContain('"schema_version": 2');
    expect(contract).toContain('"episode_id": "ep-101"');
    expect(contract).toContain('"age_band": "7-9"');
    expect(contract).toContain("exactly 3 question objects");
    expect(contract).toContain("strictly exactly 3 choices with ids 'choice-a', 'choice-b', and 'choice-c'");
    expect(contract).toContain("3D modern digital animated movie character render style");
  });

  it("builds a contract respecting true_false format", () => {
    const tfEpisode: Episode = {
      ...mockEpisode,
      quiz_config: {
        ...mockEpisode.quiz_config,
        quiz_format: "true_false",
      },
    };
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode: tfEpisode,
      quizQuestionCount: 2,
      quizLastClaimId: "C02",
      quizSourceMinimum: 1,
    });

    expect(contract).toContain("exactly 2 choices with ids 'choice-true' and 'choice-false'");
  });
});

describe("directQuizHandler", () => {
  it("successfully parses, validates, balances and persists direct QuizV2 JSON", async () => {
    let savedQuiz: unknown = null;
    let savedStage: string | null = null;
    let savedHistoryCheck: unknown = null;

    const mockRepository = {
      getEpisode: vi.fn().mockResolvedValue(mockEpisode),
      getChannel: vi.fn().mockResolvedValue(mockChannel),
      writeQuiz: vi.fn().mockImplementation((channelId, episodeId, quiz) => {
        savedQuiz = quiz;
        return `channels/${channelId}/episodes/${episodeId}/quiz.json`;
      }),
      readQuestionHistory: vi.fn().mockResolvedValue([]),
      writeHistoryCheck: vi.fn().mockImplementation((channelId, episodeId, check) => {
        savedHistoryCheck = check;
        return `channels/${channelId}/episodes/${episodeId}/history_check.json`;
      }),
      invalidateQuizArtifacts: vi.fn().mockResolvedValue(["director", "timeline"]),
      updateEpisodeStage: vi.fn().mockImplementation((channelId, episodeId, stage) => {
        savedStage = stage;
      }),
      saveEpisodeFile: vi.fn().mockResolvedValue({ path: "path", modified_at: "now" }),
      saveScenes: vi.fn().mockResolvedValue(undefined),
    };

    const runtime = {
      repository: mockRepository,
    } as unknown as TaskManagerRuntime;

    const active = {
      task: {
        task_id: "task-1",
        task_type: "GENERATE_QUIZ",
        channel_id: "channel-1",
        episode_id: "ep-101",
      },
    } as ActiveRun;

    const mockOutput = JSON.stringify({
      schema_version: 2,
      episode_id: "ep-101",
      age_band: "7-9",
      language: "vi",
      questions: [
        {
          id: "question-01",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Cá heo thở bằng gì?",
          choices: [
            { id: "choice-a", text: "Phổi" },
            { id: "choice-b", text: "Mang" },
            { id: "choice-c", text: "Da" },
          ],
          correct_choice_id: "choice-a",
          explanation: "Cá heo là động vật có vú thở bằng phổi.",
          fun_fact: "Cá heo thở qua lỗ thở trên đầu.",
          source_ids: ["C01"],
          visual_opportunity: "Chú cá heo dễ thương nhảy trên mặt biển xanh biếc.",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
        {
          id: "question-02",
          number: 2,
          format: "multiple_choice",
          difficulty: 2,
          question: "Bạch tuộc có bao nhiêu trái tim?",
          choices: [
            { id: "choice-a", text: "1" },
            { id: "choice-b", text: "3" },
            { id: "choice-c", text: "2" },
          ],
          correct_choice_id: "choice-b",
          explanation: "Bạch tuộc có đúng 3 quả tim.",
          fun_fact: "Máu bạch tuộc có màu xanh lam.",
          source_ids: ["C02"],
          visual_opportunity: "Chú bạch tuộc màu cam tinh nghịch bơi quanh rạn san hô.",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ],
    });

    const result = await handleDirectQuizOutput(runtime, active, `\`\`\`json\n${mockOutput}\n\`\`\``);

    expect(result).toEqual(["channels/channel-1/episodes/ep-101/quiz.json"]);
    expect(mockRepository.writeQuiz).toHaveBeenCalledTimes(1);
    expect(mockRepository.saveEpisodeFile).toHaveBeenCalledWith("channel-1", "ep-101", "script.md", expect.any(String));
    expect(mockRepository.saveEpisodeFile).toHaveBeenCalledWith("channel-1", "ep-101", "visual_bible.md", expect.any(String));
    expect(mockRepository.saveScenes).toHaveBeenCalledWith("channel-1", "ep-101", expect.any(Array));
    expect(mockRepository.updateEpisodeStage).toHaveBeenCalledWith("channel-1", "ep-101", "QUIZ_READY");
    expect(savedStage).toBe("QUIZ_READY");
    expect(savedQuiz).toBeDefined();
    expect((savedQuiz as { questions: unknown[] }).questions).toHaveLength(2);
  });

  it("throws error when JSON output violates QuizV2 schema", async () => {
    const mockRepository = {
      getEpisode: vi.fn().mockResolvedValue(mockEpisode),
      getChannel: vi.fn().mockResolvedValue(mockChannel),
    };

    const runtime = {
      repository: mockRepository,
    } as unknown as TaskManagerRuntime;

    const active = {
      task: {
        task_id: "task-2",
        task_type: "GENERATE_QUIZ",
        channel_id: "channel-1",
        episode_id: "ep-101",
      },
    } as ActiveRun;

    const invalidOutput = JSON.stringify({
      schema_version: 2,
      questions: [], // Invalid: min 1 question
    });

    await expect(handleDirectQuizOutput(runtime, active, invalidOutput)).rejects.toThrow();
  });
});

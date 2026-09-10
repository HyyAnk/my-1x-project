import { describe, expect, it, vi } from "vitest";
import type { Channel, Episode, QuizV2 } from "@studio/shared";
import { buildDirectQuizOutputContract } from "../src/context/quizDirectPromptBuilder.js";
import { handleDirectQuizOutput } from "../src/tasks/handlers/directQuizHandler.js";
import type { ActiveRun, TaskManagerRuntime } from "../src/tasks/runtime.js";

function createMockEpisode(topicTitle: string): Episode {
  return {
    episode_id: "ep-copyright-01",
    channel_id: "channel-1",
    slug: "quiz-episode-slug",
    topic: {
      topic_id: "top-1",
      channel_id: "channel-1",
      title: topicTitle,
      premise: `Exploring ${topicTitle}`,
      why_it_fits: "Engaging and educational",
      hook: `Discover secrets of ${topicTitle}`,
      estimated_potential: "High",
      generated_at: "2026-09-01T00:00:00.000Z",
      content_kind: "episode",
      quiz_format: "multiple_choice",
      question_count: 3,
      age_band: "7-9",
      visual_style: "pixar_3d",
    },
    stage: "IDEA",
    script_path: "channels/channel-1/episodes/ep-copyright-01/script.md",
    scene_plan_path: "channels/channel-1/episodes/ep-copyright-01/scene_plan.md",
    dialogue_script_path: "channels/channel-1/episodes/ep-copyright-01/dialogue_script.md",
    video_prompts_path: "channels/channel-1/episodes/ep-copyright-01/video_prompts.md",
    target_duration_minutes: 2,
    target_word_count: 200,
    quiz_config: {
      question_count: 3,
      age_band: "7-9",
      quiz_format: "multiple_choice",
      resolved_visual_style: "pixar_3d",
    },
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  } as unknown as Episode;
}

function createCleanQuizV2(): QuizV2 {
  return {
    schema_version: 2,
    episode_id: "ep-copyright-01",
    age_band: "7-9",
    language: "en",
    questions: [
      {
        id: "question-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "How do dolphins breathe?",
        choices: [
          { id: "choice-a", text: "With lungs" },
          { id: "choice-b", text: "With gills" },
          { id: "choice-c", text: "Through skin" },
        ],
        correct_choice_id: "choice-a",
        explanation: "Dolphins are marine mammals that breathe air using lungs.",
        fun_fact: "They breathe through a blowhole on top of their head.",
        source_ids: ["C01"],
        visual_opportunity: "A friendly bottlenose dolphin leaping joyfully over ocean waves.",
        validation: { fact_locked: true },
      },
      {
        id: "question-02",
        number: 2,
        format: "multiple_choice",
        difficulty: 2,
        question: "How many hearts does an octopus have?",
        choices: [
          { id: "choice-a", text: "One" },
          { id: "choice-b", text: "Three" },
          { id: "choice-c", text: "Two" },
        ],
        correct_choice_id: "choice-b",
        explanation: "An octopus has three working hearts pumping blue blood.",
        fun_fact: "Two hearts pump blood to the gills and one to the body.",
        source_ids: ["C02"],
        visual_opportunity: "A curious orange octopus swimming among colorful coral reef branches.",
        validation: { fact_locked: true },
      },
    ],
  };
}

describe("Authorized Direct Quiz Generation & Handler Verification", () => {
  describe("1. Prompt Builder Policy Absence", () => {
    it("does not inject copyright restrictions or generic proxy substitutions", () => {
      const episode = createMockEpisode("Deep Ocean Wonders");
      const contract = buildDirectQuizOutputContract({
        taskType: "GENERATE_QUIZ",
        episode,
        quizQuestionCount: 3,
        quizLastClaimId: "C03",
        quizSourceMinimum: 2,
        channelLanguage: "en",
      });

      expect(contract).not.toContain("STRICT COPYRIGHT & TRADEMARK POLICY");
      expect(contract).not.toContain("Marvel, DC, Pokemon, Nintendo, Pac-Man, Disney");
      expect(contract).not.toContain("Prohibit 'lion cub' or 'Simba'");
      expect(contract).not.toContain("Never name or depict protected trademark characters");
    });

    it("does not inject topic mitigation or safe visual proxy for Pac-Man", () => {
      const episode = createMockEpisode("Pac-Man Arcade Championship");
      const contract = buildDirectQuizOutputContract({
        taskType: "GENERATE_QUIZ",
        episode,
        quizQuestionCount: 3,
        quizLastClaimId: "C03",
        quizSourceMinimum: 2,
        channelLanguage: "en",
      });

      expect(contract).not.toContain("MANDATORY TOPIC COPYRIGHT MITIGATION");
      expect(contract).not.toContain("SAFE VISUAL PROXY");
      expect(contract).not.toContain("retro yellow circular character");
    });

    it("does not inject topic mitigation or safe visual proxy for Pikachu", () => {
      const episode = createMockEpisode("Pikachu and Electric Sparks");
      const contract = buildDirectQuizOutputContract({
        taskType: "GENERATE_QUIZ",
        episode,
        quizQuestionCount: 3,
        quizLastClaimId: "C03",
        quizSourceMinimum: 2,
        channelLanguage: "en",
      });

      expect(contract).not.toContain("MANDATORY TOPIC COPYRIGHT MITIGATION");
      expect(contract).not.toContain("SAFE VISUAL PROXY");
      expect(contract).not.toContain("cheerful electric yellow rodent");
    });
  });

  describe("2. Direct Quiz Handler Behavior & Persistence", () => {
    function setupRuntimeMocks(episode: Episode) {
      const mockChannel: Channel = {
        channel_id: "channel-1",
        name: "Quiz Channel",
        slug: "quiz-channel",
        language: "en",
        country: "US",
        audience: "kids",
        persona: "Friendly guide",
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      } as unknown as Channel;

      const mockRepository = {
        getEpisode: vi.fn().mockResolvedValue(episode),
        getChannel: vi.fn().mockResolvedValue(mockChannel),
        writeQuiz: vi.fn().mockResolvedValue("channels/channel-1/episodes/ep-copyright-01/quiz.json"),
        readQuestionHistory: vi.fn().mockResolvedValue([]),
        writeHistoryCheck: vi.fn().mockResolvedValue("channels/channel-1/episodes/ep-copyright-01/history_check.json"),
        invalidateQuizArtifacts: vi.fn().mockResolvedValue(["director", "timeline"]),
        updateEpisodeStage: vi.fn().mockResolvedValue(undefined),
        saveEpisodeFile: vi.fn().mockResolvedValue({ path: "path", modified_at: "now" }),
        saveScenes: vi.fn().mockResolvedValue(undefined),
      };

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const runtime = {
        repository: mockRepository,
        logger: mockLogger,
      } as unknown as TaskManagerRuntime;

      const active = {
        task: {
          task_id: "task-test-01",
          task_type: "GENERATE_QUIZ",
          channel_id: "channel-1",
          episode_id: "ep-copyright-01",
        },
      } as ActiveRun;

      return { runtime, active, mockRepository, mockLogger };
    }

    it("preserves named subjects and persists quiz with Pac-Man in visual_opportunity", async () => {
      const episode = createMockEpisode("Arcade Games");
      const { runtime, active, mockRepository } = setupRuntimeMocks(episode);

      const quizWithPacMan = createCleanQuizV2();
      quizWithPacMan.questions[0].visual_opportunity = "Pac-Man running from colorful ghosts in a maze.";
      const rawOutput = JSON.stringify(quizWithPacMan);

      const result = await handleDirectQuizOutput(runtime, active, `\`\`\`json\n${rawOutput}\n\`\`\``);

      expect(result).toEqual(["channels/channel-1/episodes/ep-copyright-01/quiz.json"]);
      expect(mockRepository.writeQuiz).toHaveBeenCalledTimes(1);
      const savedQuiz = mockRepository.writeQuiz.mock.calls[0][2] as QuizV2;
      expect(savedQuiz.questions[0].visual_opportunity).toBe("Pac-Man running from colorful ghosts in a maze.");
      expect(mockRepository.saveEpisodeFile).toHaveBeenCalledWith("channel-1", "ep-copyright-01", "script.md", expect.any(String));
      expect(mockRepository.saveEpisodeFile).toHaveBeenCalledWith("channel-1", "ep-copyright-01", "visual_bible.md", expect.any(String));
      expect(mockRepository.saveScenes).toHaveBeenCalledWith("channel-1", "ep-copyright-01", expect.any(Array));
      expect(mockRepository.updateEpisodeStage).toHaveBeenCalledWith("channel-1", "ep-copyright-01", "QUIZ_READY");
    });

    it("preserves lion cub choices and successfully saves quiz", async () => {
      const episode = createMockEpisode("Baby Animals");
      const { runtime, active, mockRepository } = setupRuntimeMocks(episode);

      const quizWithLionCub = createCleanQuizV2();
      quizWithLionCub.questions[1].choices[0].text = "A baby lion cub";
      const rawOutput = JSON.stringify(quizWithLionCub);

      const result = await handleDirectQuizOutput(runtime, active, rawOutput);

      expect(result).toEqual(["channels/channel-1/episodes/ep-copyright-01/quiz.json"]);
      expect(mockRepository.writeQuiz).toHaveBeenCalledTimes(1);
      const savedQuiz = mockRepository.writeQuiz.mock.calls[0][2] as QuizV2;
      expect(savedQuiz.questions[1].choices[0].text).toBe("A baby lion cub");
      expect(mockRepository.updateEpisodeStage).toHaveBeenCalledWith("channel-1", "ep-copyright-01", "QUIZ_READY");
    });

    it("rejects malformed QuizV2 output and never writes quiz or advances stage", async () => {
      const episode = createMockEpisode("Malformed Test");
      const { runtime, active, mockRepository } = setupRuntimeMocks(episode);

      const malformedOutput = JSON.stringify({
        schema_version: 2,
        questions: [{ invalid: "not a valid question" }],
      });

      await expect(handleDirectQuizOutput(runtime, active, malformedOutput)).rejects.toThrow();
      expect(mockRepository.writeQuiz).not.toHaveBeenCalled();
      expect(mockRepository.updateEpisodeStage).not.toHaveBeenCalled();
    });

    it("does not advance episode stage if repository.writeQuiz fails", async () => {
      const episode = createMockEpisode("Persistence Failure Test");
      const { runtime, active, mockRepository } = setupRuntimeMocks(episode);
      mockRepository.writeQuiz.mockRejectedValue(new Error("Disk full"));

      const cleanQuiz = createCleanQuizV2();
      const rawOutput = JSON.stringify(cleanQuiz);

      await expect(handleDirectQuizOutput(runtime, active, rawOutput)).rejects.toThrow("Disk full");
      expect(mockRepository.writeQuiz).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateEpisodeStage).not.toHaveBeenCalled();
    });
  });
});

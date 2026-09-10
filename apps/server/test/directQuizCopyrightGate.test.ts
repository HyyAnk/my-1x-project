import { describe, expect, it, vi } from "vitest";
import type { Channel, Episode, QuizV2 } from "@studio/shared";
import { buildDirectQuizOutputContract } from "../src/context/quizDirectPromptBuilder.js";
import { validateQuizV2Copyright, validateQuizQuestionCopyright } from "../src/quiz/qa/copyrightValidator.js";
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

describe("Early-Gate Copyright Enforcement & Direct Quiz Hardening", () => {
  describe("1. Prompt Builder Copyright Hardening", () => {
    it("includes explicit negative constraints prohibiting major trademark entertainment franchises and lion cubs", () => {
      const episode = createMockEpisode("Deep Ocean Wonders");
      const contract = buildDirectQuizOutputContract({
        taskType: "GENERATE_QUIZ",
        episode,
        quizQuestionCount: 3,
        quizLastClaimId: "C03",
        quizSourceMinimum: 2,
        channelLanguage: "en",
      });

      expect(contract).toContain("STRICT COPYRIGHT & TRADEMARK POLICY");
      expect(contract).toContain("Marvel, DC, Pokemon, Nintendo, Pac-Man, Disney");
      expect(contract).toContain("Prohibit 'lion cub' or 'Simba'");
      expect(contract).toContain("Never name or depict protected trademark characters");
    });

    it("detects high copyright risk topic 'Pac-Man' and injects safe visual proxy mitigation", () => {
      const episode = createMockEpisode("Pac-Man Arcade Championship");
      const contract = buildDirectQuizOutputContract({
        taskType: "GENERATE_QUIZ",
        episode,
        quizQuestionCount: 3,
        quizLastClaimId: "C03",
        quizSourceMinimum: 2,
        channelLanguage: "en",
      });

      expect(contract).toContain('MANDATORY TOPIC COPYRIGHT MITIGATION FOR "PAC-MAN"');
      expect(contract).toContain("retro yellow circular character");
      expect(contract).toContain("SAFE VISUAL PROXY");
      expect(contract).toContain("Do NOT use protected trademark character names");
    });

    it("detects high copyright risk topic 'Pikachu' and injects safe visual proxy mitigation", () => {
      const episode = createMockEpisode("Pikachu and Electric Sparks");
      const contract = buildDirectQuizOutputContract({
        taskType: "GENERATE_QUIZ",
        episode,
        quizQuestionCount: 3,
        quizLastClaimId: "C03",
        quizSourceMinimum: 2,
        channelLanguage: "en",
      });

      expect(contract).toContain('MANDATORY TOPIC COPYRIGHT MITIGATION FOR "PIKACHU"');
      expect(contract).toContain("cheerful electric yellow rodent");
      expect(contract).toContain("SAFE VISUAL PROXY");
    });

    it("does not inject topic-specific mitigation for clean topics without trademark references", () => {
      const episode = createMockEpisode("Coral Reef Ecosystems");
      const contract = buildDirectQuizOutputContract({
        taskType: "GENERATE_QUIZ",
        episode,
        quizQuestionCount: 3,
        quizLastClaimId: "C03",
        quizSourceMinimum: 2,
        channelLanguage: "en",
      });

      expect(contract).toContain("STRICT COPYRIGHT & TRADEMARK POLICY");
      expect(contract).not.toContain("MANDATORY TOPIC COPYRIGHT MITIGATION");
    });
  });

  describe("2. Dedicated QuizV2 Copyright Validator", () => {
    it("passes cleanly with violated: false for clean educational quizzes", () => {
      const cleanQuiz = createCleanQuizV2();
      const result = validateQuizV2Copyright(cleanQuiz);

      expect(result.violated).toBe(false);
      expect(result.term).toBeUndefined();
    });

    it("detects copyright violation in question text", () => {
      const quiz = createCleanQuizV2();
      quiz.questions[0].question = "Which Pokemon is Pikachu?";

      const result = validateQuizV2Copyright(quiz);
      expect(result.violated).toBe(true);
      expect(result.category).toBe("GAME_IP");
      expect(result.term?.toLowerCase()).toContain("pokemon");
      expect(result.questionNumber).toBe(1);
      expect(result.questionIndex).toBe(0);
      expect(result.field).toBe("question");
    });

    it("detects copyright violation in choices text", () => {
      const quiz = createCleanQuizV2();
      quiz.questions[1].choices[1].text = "Super Mario brothers";

      const result = validateQuizV2Copyright(quiz);
      expect(result.violated).toBe(true);
      expect(result.category).toBe("GAME_IP");
      expect(result.term?.toLowerCase()).toContain("mario");
      expect(result.questionNumber).toBe(2);
      expect(result.questionIndex).toBe(1);
      expect(result.field).toBe("choices[1].text");
    });

    it("detects copyright violation in explanation", () => {
      const quiz = createCleanQuizV2();
      quiz.questions[0].explanation = "Spider-Man is a hero in Marvel comics.";

      const result = validateQuizV2Copyright(quiz);
      expect(result.violated).toBe(true);
      expect(result.category).toBe("MARVEL_SUPERHERO");
      expect(result.term?.toLowerCase()).toContain("spider-man");
      expect(result.questionNumber).toBe(1);
      expect(result.field).toBe("explanation");
    });

    it("detects copyright violation in fun_fact", () => {
      const quiz = createCleanQuizV2();
      quiz.questions[1].fun_fact = "A cute lion cub plays in the grass.";

      const result = validateQuizV2Copyright(quiz);
      expect(result.violated).toBe(true);
      expect(result.category).toBe("LION_CUB");
      expect(result.term?.toLowerCase()).toContain("lion cub");
      expect(result.questionNumber).toBe(2);
      expect(result.field).toBe("fun_fact");
    });

    it("detects copyright violation in visual_opportunity", () => {
      const quiz = createCleanQuizV2();
      quiz.questions[0].visual_opportunity = "Pac-Man chomping yellow dots in a neon maze.";

      const result = validateQuizV2Copyright(quiz);
      expect(result.violated).toBe(true);
      expect(result.category).toBe("GAME_IP");
      expect(result.term?.toLowerCase()).toContain("pac-man");
      expect(result.questionNumber).toBe(1);
      expect(result.field).toBe("visual_opportunity");
    });

    it("validates individual QuizQuestion directly with validateQuizQuestionCopyright", () => {
      const quiz = createCleanQuizV2();
      const question = quiz.questions[0];
      question.visual_opportunity = "Batman standing atop a Gotham skyscraper.";

      const check = validateQuizQuestionCopyright(question);
      expect(check.violated).toBe(true);
      expect(check.category).toBe("DC_SUPERHERO");
      expect(check.term?.toLowerCase()).toContain("batman");
      expect(check.field).toBe("visual_opportunity");
    });

    it("permits whitelisted anime/manga characters and adult lions", () => {
      const quiz = createCleanQuizV2();
      quiz.questions[0].question = "Who is the ninja Naruto Uzumaki?";
      quiz.questions[0].explanation = "Naruto is a fictional ninja striving to become Hokage.";
      quiz.questions[0].visual_opportunity = "A majestic adult African lion resting in savanna shade.";

      const result = validateQuizV2Copyright(quiz);
      expect(result.violated).toBe(false);
    });
  });

  describe("3. Direct Quiz Handler Early-Gate Enforcement", () => {
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

    it("blocks and throws early error when LLM output contains prohibited Pac-Man in visual_opportunity", async () => {
      const episode = createMockEpisode("Arcade Games");
      const { runtime, active, mockRepository, mockLogger } = setupRuntimeMocks(episode);

      const quizWithPacMan = createCleanQuizV2();
      quizWithPacMan.questions[0].visual_opportunity = "Pac-Man running from colorful ghosts in a maze.";
      const rawOutput = JSON.stringify(quizWithPacMan);

      await expect(handleDirectQuizOutput(runtime, active, `\`\`\`json\n${rawOutput}\n\`\`\``)).rejects.toThrow(
        /Direct quiz generation failed copyright policy gate: Question 1 \(visual_opportunity\) contains prohibited copyright term/i,
      );

      // Verify early gate prevented writing quiz or downstream artifacts
      expect(mockRepository.writeQuiz).not.toHaveBeenCalled();
      expect(mockRepository.saveEpisodeFile).not.toHaveBeenCalled();
      expect(mockRepository.saveScenes).not.toHaveBeenCalled();
      expect(mockRepository.updateEpisodeStage).not.toHaveBeenCalled();

      // Verify logger recorded warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("[directQuizHandler] Copyright policy violation detected in question 1"),
        expect.objectContaining({
          channelId: "channel-1",
          episodeId: "ep-copyright-01",
          questionNumber: 1,
          field: "visual_opportunity",
          category: "GAME_IP",
        }),
      );
    });

    it("blocks and throws early error when LLM output contains Lion Cub in choices", async () => {
      const episode = createMockEpisode("Baby Animals");
      const { runtime, active, mockRepository } = setupRuntimeMocks(episode);

      const quizWithLionCub = createCleanQuizV2();
      quizWithLionCub.questions[1].choices[0].text = "A baby lion cub";
      const rawOutput = JSON.stringify(quizWithLionCub);

      await expect(handleDirectQuizOutput(runtime, active, rawOutput)).rejects.toThrow(
        /Question 2 \(choices\[0\]\.text\) contains prohibited copyright term '(?:baby lion|baby lion cub|lion cub)'/i,
      );

      expect(mockRepository.writeQuiz).not.toHaveBeenCalled();
      expect(mockRepository.updateEpisodeStage).not.toHaveBeenCalled();
    });

    it("allows clean quizzes to pass early gate, persist quiz, and advance stage to QUIZ_READY", async () => {
      const episode = createMockEpisode("Marine Biology");
      const { runtime, active, mockRepository } = setupRuntimeMocks(episode);

      const cleanQuiz = createCleanQuizV2();
      const rawOutput = JSON.stringify(cleanQuiz);

      const result = await handleDirectQuizOutput(runtime, active, rawOutput);

      expect(result).toEqual(["channels/channel-1/episodes/ep-copyright-01/quiz.json"]);
      expect(mockRepository.writeQuiz).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveEpisodeFile).toHaveBeenCalledWith("channel-1", "ep-copyright-01", "script.md", expect.any(String));
      expect(mockRepository.saveEpisodeFile).toHaveBeenCalledWith("channel-1", "ep-copyright-01", "visual_bible.md", expect.any(String));
      expect(mockRepository.saveScenes).toHaveBeenCalledWith("channel-1", "ep-copyright-01", expect.any(Array));
      expect(mockRepository.updateEpisodeStage).toHaveBeenCalledWith("channel-1", "ep-copyright-01", "QUIZ_READY");
    });
  });
});

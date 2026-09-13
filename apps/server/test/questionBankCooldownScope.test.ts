import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildApp, type StudioApp } from "../src/app.js";
import type { BankQuestion, QuizQuestion } from "@studio/shared";

type CooldownRouteResponse = {
  channel_id?: string;
  questions?: Array<{
    id: string;
    channel_cooldown?: {
      is_cooldown: boolean;
      days_remaining: number;
      content_type?: "episode" | "short_reel";
      last_used_at?: string;
      episode_id?: string;
    };
  }>;
  question?: {
    id: string;
    channel_cooldown?: {
      is_cooldown: boolean;
      days_remaining: number;
      content_type?: "episode" | "short_reel";
      last_used_at?: string;
      episode_id?: string;
    };
  };
  total?: number;
  error?: string;
  code?: string;
};

describe("Question Bank Cooldown Scope Evaluation Engine", () => {
  let app: StudioApp;
  let tempStorage: string;
  let isolatedStudioRoot: string;
  let channelId: string;

  const questionEpisodeOnly: BankQuestion = {
    id: "Q-SCOPE-EPISODE-001",
    archetype_id: "speed_blitz",
    domain_id: "world_geography",
    subtopic_id: "european_capitals",
    question: "What is the official capital city of France?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Paris", is_correct: true },
      { id: "B", text: "Lyon", is_correct: false },
      { id: "C", text: "Marseille", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Paris has been the capital of France for centuries.",
    difficulty: 1,
    status: "approved",
    language: "en",
    tags: ["geography", "france"],
  };

  const questionReelOnly: BankQuestion = {
    id: "Q-SCOPE-REEL-002",
    archetype_id: "speed_blitz",
    domain_id: "science_tech",
    subtopic_id: "solar_system",
    question: "Which celestial body in our solar system is nicknamed the Red Planet?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Mars", is_correct: true },
      { id: "B", text: "Venus", is_correct: false },
      { id: "C", text: "Jupiter", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Mars appears reddish because of pervasive iron oxide on its surface.",
    difficulty: 1,
    status: "approved",
    language: "en",
    tags: ["astronomy", "planets"],
  };

  const questionUnused: BankQuestion = {
    id: "Q-SCOPE-UNUSED-003",
    archetype_id: "speed_blitz",
    domain_id: "nature_animals",
    subtopic_id: "insects_arachnids",
    question: "How many legs does an adult arachnid typically possess?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Eight", is_correct: true },
      { id: "B", text: "Six", is_correct: false },
      { id: "C", text: "Ten", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Arachnids are defined by having eight jointed appendages.",
    difficulty: 1,
    status: "approved",
    language: "en",
    tags: ["nature", "arachnids"],
  };

  const questionInferredReel: BankQuestion = {
    id: "Q-SCOPE-INFER-REEL-004",
    archetype_id: "speed_blitz",
    domain_id: "science_tech",
    subtopic_id: "physics_basics",
    question: "What is the speed of light in a vacuum approximately in kilometers per second?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "300,000 km/s", is_correct: true },
      { id: "B", text: "150,000 km/s", is_correct: false },
      { id: "C", text: "500,000 km/s", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Light travels at roughly 299,792 kilometers per second in vacuum.",
    difficulty: 2,
    status: "approved",
    language: "en",
    tags: ["physics", "light"],
  };

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "qb-scope-storage-"));
    isolatedStudioRoot = await mkdtemp(path.join(os.tmpdir(), "qb-scope-root-"));
    await mkdir(path.join(isolatedStudioRoot, ".quiz-studio"), { recursive: true });
    await writeFile(
      path.join(isolatedStudioRoot, ".quiz-studio", "storage.local.json"),
      JSON.stringify({ storage_path: tempStorage }, null, 2),
      "utf8",
    );
    const srcKb = path.join(curr, ".quiz-studio", "knowledge_base");
    const destKb = path.join(isolatedStudioRoot, ".quiz-studio", "knowledge_base");
    await cp(srcKb, destKb, { recursive: true, filter: (src) => !src.includes("entity_assets") }).catch(() => {});
    const srcTemplates = path.join(curr, "templates");
    const destTemplates = path.join(isolatedStudioRoot, "templates");
    await cp(srcTemplates, destTemplates, { recursive: true }).catch(() => {});

    app = await buildApp(isolatedStudioRoot);

    const createdChannel = await app.repository.createChannel({
      name: "Cooldown Scope Test Channel",
      language: "English",
    });
    channelId = createdChannel.channel_id;

    // Seed questions into question bank
    await app.repository.saveQuestionBankQuestion(questionEpisodeOnly);
    await app.repository.saveQuestionBankQuestion(questionReelOnly);
    await app.repository.saveQuestionBankQuestion(questionUnused);
    await app.repository.saveQuestionBankQuestion(questionInferredReel);

    // Record question usage in history
    // 1. Episode usage with explicit content_type = "episode"
    await app.repository.appendQuestionHistory(
      channelId,
      "ep-full-101",
      [
        {
          id: questionEpisodeOnly.id,
          number: 1,
          format: "multiple_choice",
          question: questionEpisodeOnly.question,
          choices: [
            { id: "A", text: "Paris" },
            { id: "B", text: "Lyon" },
          ],
          correct_choice_id: "A",
          explanation: questionEpisodeOnly.explanation,
        } as unknown as QuizQuestion,
      ],
      30,
      undefined,
      "episode",
    );

    // 2. Short-Reel usage with explicit content_type = "short_reel"
    await app.repository.appendQuestionHistory(
      channelId,
      "sreel_custom_202",
      [
        {
          id: questionReelOnly.id,
          number: 1,
          format: "multiple_choice",
          question: questionReelOnly.question,
          choices: [
            { id: "A", text: "Mars" },
            { id: "B", text: "Venus" },
          ],
          correct_choice_id: "A",
          explanation: questionReelOnly.explanation,
        } as unknown as QuizQuestion,
      ],
      30,
      undefined,
      "short_reel",
    );

    // 3. Short-Reel usage with omitted content_type (inferred from "sreel_" prefix)
    await app.repository.appendQuestionHistory(
      channelId,
      "sreel_inferred_303",
      [
        {
          id: questionInferredReel.id,
          number: 1,
          format: "multiple_choice",
          question: questionInferredReel.question,
          choices: [
            { id: "A", text: "300,000 km/s" },
            { id: "B", text: "150,000 km/s" },
          ],
          correct_choice_id: "A",
          explanation: questionInferredReel.explanation,
        } as unknown as QuizQuestion,
      ],
      30,
    );
  });

  afterAll(async () => {
    for (const task of app.tasks?.list() ?? []) {
      await app.tasks.cancel(task.task_id).catch(() => {});
    }
    await app.close();
    await rm(tempStorage, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
    await rm(isolatedStudioRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
  });

  describe("Episode Question Cooldown Scoping", () => {
    it("has cooldown when queried with scope='episode'", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "episode",
      });
      const question = result.questions.find((q) => q.id === questionEpisodeOnly.id);
      expect(question).toBeDefined();
      expect(question?.channel_cooldown?.is_cooldown).toBe(true);
      expect(question?.channel_cooldown?.days_remaining).toBeGreaterThanOrEqual(1);
      expect(question?.channel_cooldown?.content_type).toBe("episode");
      expect(question?.channel_cooldown?.episode_id).toBe("ep-full-101");
    });

    it("does NOT have cooldown when queried with scope='short_reel'", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "short_reel",
      });
      const question = result.questions.find((q) => q.id === questionEpisodeOnly.id);
      expect(question).toBeDefined();
      expect(question?.channel_cooldown?.is_cooldown).toBe(false);
      expect(question?.channel_cooldown?.days_remaining).toBe(0);
    });

    it("has cooldown when queried with scope='all'", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "all",
      });
      const question = result.questions.find((q) => q.id === questionEpisodeOnly.id);
      expect(question).toBeDefined();
      expect(question?.channel_cooldown?.is_cooldown).toBe(true);
      expect(question?.channel_cooldown?.content_type).toBe("episode");
    });

    it("has cooldown when scope is omitted", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
      });
      const question = result.questions.find((q) => q.id === questionEpisodeOnly.id);
      expect(question).toBeDefined();
      expect(question?.channel_cooldown?.is_cooldown).toBe(true);
      expect(question?.channel_cooldown?.content_type).toBe("episode");
    });

    it("evaluates getQuestionBankQuestion with scope for episode question", async () => {
      const inEpisodeScope = await app.repository.getQuestionBankQuestion(questionEpisodeOnly.id, channelId, "episode");
      expect(inEpisodeScope?.channel_cooldown?.is_cooldown).toBe(true);
      expect(inEpisodeScope?.channel_cooldown?.content_type).toBe("episode");

      const inReelScope = await app.repository.getQuestionBankQuestion(questionEpisodeOnly.id, channelId, "short_reel");
      expect(inReelScope?.channel_cooldown?.is_cooldown).toBe(false);

      const inAllScope = await app.repository.getQuestionBankQuestion(questionEpisodeOnly.id, channelId, "all");
      expect(inAllScope?.channel_cooldown?.is_cooldown).toBe(true);

      const inDefaultScope = await app.repository.getQuestionBankQuestion(questionEpisodeOnly.id, channelId);
      expect(inDefaultScope?.channel_cooldown?.is_cooldown).toBe(true);
    });
  });

  describe("Short-Reel Question Cooldown Scoping", () => {
    it("has cooldown when queried with scope='short_reel'", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "short_reel",
      });
      const question = result.questions.find((q) => q.id === questionReelOnly.id);
      expect(question).toBeDefined();
      expect(question?.channel_cooldown?.is_cooldown).toBe(true);
      expect(question?.channel_cooldown?.days_remaining).toBeGreaterThanOrEqual(1);
      expect(question?.channel_cooldown?.content_type).toBe("short_reel");
      expect(question?.channel_cooldown?.episode_id).toBe("sreel_custom_202");
    });

    it("does NOT have cooldown when queried with scope='episode'", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "episode",
      });
      const question = result.questions.find((q) => q.id === questionReelOnly.id);
      expect(question).toBeDefined();
      expect(question?.channel_cooldown?.is_cooldown).toBe(false);
      expect(question?.channel_cooldown?.days_remaining).toBe(0);
    });

    it("has cooldown when queried with scope='all'", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "all",
      });
      const question = result.questions.find((q) => q.id === questionReelOnly.id);
      expect(question).toBeDefined();
      expect(question?.channel_cooldown?.is_cooldown).toBe(true);
      expect(question?.channel_cooldown?.content_type).toBe("short_reel");
    });

    it("has cooldown when scope is omitted", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
      });
      const question = result.questions.find((q) => q.id === questionReelOnly.id);
      expect(question).toBeDefined();
      expect(question?.channel_cooldown?.is_cooldown).toBe(true);
      expect(question?.channel_cooldown?.content_type).toBe("short_reel");
    });

    it("evaluates getQuestionBankQuestion with scope for short_reel question", async () => {
      const inReelScope = await app.repository.getQuestionBankQuestion(questionReelOnly.id, channelId, "short_reel");
      expect(inReelScope?.channel_cooldown?.is_cooldown).toBe(true);
      expect(inReelScope?.channel_cooldown?.content_type).toBe("short_reel");

      const inEpisodeScope = await app.repository.getQuestionBankQuestion(questionReelOnly.id, channelId, "episode");
      expect(inEpisodeScope?.channel_cooldown?.is_cooldown).toBe(false);

      const inAllScope = await app.repository.getQuestionBankQuestion(questionReelOnly.id, channelId, "all");
      expect(inAllScope?.channel_cooldown?.is_cooldown).toBe(true);

      const inDefaultScope = await app.repository.getQuestionBankQuestion(questionReelOnly.id, channelId);
      expect(inDefaultScope?.channel_cooldown?.is_cooldown).toBe(true);
    });

    it("correctly infers content_type as short_reel when omitted in history", async () => {
      const inReelScope = await app.repository.getQuestionBankQuestion(questionInferredReel.id, channelId, "short_reel");
      expect(inReelScope?.channel_cooldown?.is_cooldown).toBe(true);
      expect(inReelScope?.channel_cooldown?.content_type).toBe("short_reel");

      const inEpisodeScope = await app.repository.getQuestionBankQuestion(questionInferredReel.id, channelId, "episode");
      expect(inEpisodeScope?.channel_cooldown?.is_cooldown).toBe(false);
    });
  });

  describe("Ready-Only and Cooldown-Only Filtering with Scope", () => {
    it("returns questions only used in an Episode when filtering readyOnly with scope='short_reel'", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "short_reel",
        readyOnly: true,
      });

      const questionIds = result.questions.map((q) => q.id);
      // Episode-used question is READY for short reel
      expect(questionIds).toContain(questionEpisodeOnly.id);
      // Unused question is READY
      expect(questionIds).toContain(questionUnused.id);
      // Short-reel question is in cooldown, must NOT be returned
      expect(questionIds).not.toContain(questionReelOnly.id);
      expect(questionIds).not.toContain(questionInferredReel.id);
    });

    it("returns questions only used in a Short-Reel when filtering readyOnly with scope='episode'", async () => {
      const result = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "episode",
        readyOnly: true,
      });

      const questionIds = result.questions.map((q) => q.id);
      // Reel-used question is READY for episode
      expect(questionIds).toContain(questionReelOnly.id);
      expect(questionIds).toContain(questionInferredReel.id);
      // Unused question is READY
      expect(questionIds).toContain(questionUnused.id);
      // Episode question is in cooldown, must NOT be returned
      expect(questionIds).not.toContain(questionEpisodeOnly.id);
    });

    it("returns only questions with active cooldown for the specified scope when cooldownOnly is true", async () => {
      const reelCooldownResult = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "short_reel",
        cooldownOnly: true,
      });
      const reelCooldownIds = reelCooldownResult.questions.map((q) => q.id);
      expect(reelCooldownIds).toContain(questionReelOnly.id);
      expect(reelCooldownIds).toContain(questionInferredReel.id);
      expect(reelCooldownIds).not.toContain(questionEpisodeOnly.id);
      expect(reelCooldownIds).not.toContain(questionUnused.id);

      const episodeCooldownResult = await app.repository.queryQuestionBankQuestions({
        channelId,
        scope: "episode",
        cooldownOnly: true,
      });
      const episodeCooldownIds = episodeCooldownResult.questions.map((q) => q.id);
      expect(episodeCooldownIds).toContain(questionEpisodeOnly.id);
      expect(episodeCooldownIds).not.toContain(questionReelOnly.id);
      expect(episodeCooldownIds).not.toContain(questionInferredReel.id);
      expect(episodeCooldownIds).not.toContain(questionUnused.id);
    });
  });

  describe("Snapshot Retrieval with Scope", () => {
    it("evaluates snapshot cooldown with scope", async () => {
      const reelSnapshot = await app.repository.readQuestionBankQuestionsSnapshot({
        channelId,
        scope: "short_reel",
      });
      const reelQuestion = reelSnapshot.questions.find((q) => q.id === questionReelOnly.id);
      const episodeQuestion = reelSnapshot.questions.find((q) => q.id === questionEpisodeOnly.id);
      expect(reelQuestion?.channel_cooldown?.is_cooldown).toBe(true);
      expect(episodeQuestion?.channel_cooldown?.is_cooldown).toBe(false);

      const episodeSnapshot = await app.repository.readQuestionBankQuestionsSnapshot({
        channelId,
        scope: "episode",
      });
      const reelInEpisode = episodeSnapshot.questions.find((q) => q.id === questionReelOnly.id);
      const episodeInEpisode = episodeSnapshot.questions.find((q) => q.id === questionEpisodeOnly.id);
      expect(reelInEpisode?.channel_cooldown?.is_cooldown).toBe(false);
      expect(episodeInEpisode?.channel_cooldown?.is_cooldown).toBe(true);
    });
  });

  describe("HTTP Query Routes with Scope Parameter", () => {
    it("handles scope='short_reel' in channel questions route", async () => {
      const res = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/question-bank/questions?scope=short_reel`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<CooldownRouteResponse>();
      const qEpisode = body.questions?.find((q) => q.id === questionEpisodeOnly.id);
      const qReel = body.questions?.find((q) => q.id === questionReelOnly.id);

      expect(qEpisode?.channel_cooldown?.is_cooldown).toBe(false);
      expect(qReel?.channel_cooldown?.is_cooldown).toBe(true);
      expect(qReel?.channel_cooldown?.content_type).toBe("short_reel");
    });

    it("handles scope='episode' in channel questions route", async () => {
      const res = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/question-bank/questions?scope=episode`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<CooldownRouteResponse>();
      const qEpisode = body.questions?.find((q) => q.id === questionEpisodeOnly.id);
      const qReel = body.questions?.find((q) => q.id === questionReelOnly.id);

      expect(qEpisode?.channel_cooldown?.is_cooldown).toBe(true);
      expect(qEpisode?.channel_cooldown?.content_type).toBe("episode");
      expect(qReel?.channel_cooldown?.is_cooldown).toBe(false);
    });

    it("rejects invalid scope in channel questions route with HTTP 400", async () => {
      const res = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/question-bank/questions?scope=invalid_scope`,
      });

      expect(res.statusCode).toBe(400);
      const body = res.json<CooldownRouteResponse>();
      expect(body.code).toBe("INVALID_SCOPE");
      expect(body.error).toContain("Invalid scope");
    });

    it("handles scope in get question by id route", async () => {
      const resEpisodeInReelScope = await app.server.inject({
        method: "GET",
        url: `/api/question-bank/questions/${questionEpisodeOnly.id}?channel_id=${channelId}&scope=short_reel`,
      });
      expect(resEpisodeInReelScope.statusCode).toBe(200);
      expect(resEpisodeInReelScope.json<CooldownRouteResponse>().question?.channel_cooldown?.is_cooldown).toBe(false);

      const resEpisodeInEpisodeScope = await app.server.inject({
        method: "GET",
        url: `/api/question-bank/questions/${questionEpisodeOnly.id}?channel_id=${channelId}&scope=episode`,
      });
      expect(resEpisodeInEpisodeScope.statusCode).toBe(200);
      expect(resEpisodeInEpisodeScope.json<CooldownRouteResponse>().question?.channel_cooldown?.is_cooldown).toBe(true);
      expect(resEpisodeInEpisodeScope.json<CooldownRouteResponse>().question?.channel_cooldown?.content_type).toBe("episode");
    });

    it("rejects invalid scope in get question by id route with HTTP 400", async () => {
      const res = await app.server.inject({
        method: "GET",
        url: `/api/question-bank/questions/${questionEpisodeOnly.id}?channel_id=${channelId}&scope=bad_scope`,
      });

      expect(res.statusCode).toBe(400);
      const body = res.json<CooldownRouteResponse>();
      expect(body.code).toBe("INVALID_SCOPE");
    });
  });
});

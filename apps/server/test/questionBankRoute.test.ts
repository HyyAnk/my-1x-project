import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildApp, type StudioApp } from "../src/app.js";
import { seedQuestionBankFixtures } from "./questionBankRepository.test.js";

type RouteQuestion = { archetype_id: string; channel_cooldown?: { is_cooldown: boolean } };
type QuestionBankRouteBody = {
  taxonomy?: { domains: unknown[] };
  stats?: { target_total: number; current_total: number };
  channel_id?: string;
  questions?: RouteQuestion[];
  code?: string;
  question?: { id: string; explanation?: string };
  ok?: boolean;
  coverage?: { total_combos: number; covered_combos: number; by_domain: Record<string, unknown>; by_archetype: Record<string, unknown> };
  success?: boolean;
  approvedCount?: number;
  matrixCoverage?: { total_combos: number };
};

describe("Question Bank REST API Routes", () => {
  let app: StudioApp;
  let tempStorage: string;
  let isolatedStudioRoot: string;

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "qb-route-test-"));
    isolatedStudioRoot = await mkdtemp(path.join(os.tmpdir(), "qb-route-root-"));
    await mkdir(path.join(isolatedStudioRoot, ".quiz-studio"), { recursive: true });
    await writeFile(
      path.join(isolatedStudioRoot, ".quiz-studio", "storage.local.json"),
      JSON.stringify({ storage_path: tempStorage }, null, 2),
      "utf8",
    );
    const srcKb = path.join(curr, ".quiz-studio", "knowledge_base");
    const destKb = path.join(isolatedStudioRoot, ".quiz-studio", "knowledge_base");
    await cp(srcKb, destKb, { recursive: true, filter: (src) => !src.includes("entity_assets") }).catch(() => {});

    app = await buildApp(isolatedStudioRoot);
    await seedQuestionBankFixtures(app.repository);
  });

  afterAll(async () => {
    await app.close();
    await rm(tempStorage, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
    await rm(isolatedStudioRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
  });

  it("GET /api/question-bank/taxonomy returns 9 domains synced from knowledge base", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/taxonomy",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<QuestionBankRouteBody>();
    expect(body.taxonomy).toBeDefined();
    expect(body.taxonomy.domains.length).toBeGreaterThanOrEqual(9);
  });

  it("GET /api/question-bank/stats returns total count and breakdown", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/stats",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<QuestionBankRouteBody>();
    expect(body.stats).toBeDefined();
    expect(body.stats.target_total).toBe(20000);
    expect(body.stats.current_total).toBeGreaterThanOrEqual(10);
  });

  it("GET /api/channels/:channelId/question-bank/questions returns channel-scoped questions", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/channels/test-channel/question-bank/questions?limit=5",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<QuestionBankRouteBody>();
    expect(body.channel_id).toBe("test-channel");
    expect(body.questions.length).toBeLessThanOrEqual(5);
    expect(body.questions[0].channel_cooldown).toBeDefined();
    expect(body.questions[0].channel_cooldown.is_cooldown).toBe(false);
  });

  it("GET /api/question-bank/questions supports filters and search", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/questions?archetype_id=speed_blitz",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<QuestionBankRouteBody>();
    expect(body.questions.length).toBeGreaterThanOrEqual(5);
    expect(body.questions?.every((q) => q.archetype_id === "speed_blitz")).toBe(true);

    const searchRes = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/questions?search=stick",
    });
    expect(searchRes.statusCode).toBe(200);
    const searchBody = searchRes.json<QuestionBankRouteBody>();
    expect(searchBody.questions.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/question-bank/questions/:id returns 404 for unknown question", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/questions/NON_EXISTENT_ID",
    });

    expect(res.statusCode).toBe(404);
    const body = res.json<QuestionBankRouteBody>();
    expect(body.code).toBe("QUESTION_NOT_FOUND");
  });

  it("POST, PUT, DELETE handles question lifecycle", async () => {
    const testId = `ROUTE-TEST-${Date.now()}`;
    const newQuestion = {
      id: testId,
      archetype_id: "speed_blitz",
      domain_id: "logic_puzzles",
      subtopic_id: "tricky_riddles",
      question: "Riddle created via REST API?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Option 1", is_correct: true },
        { id: "B", text: "Option 2", is_correct: false },
        { id: "C", text: "Option 3", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Test explanation for REST API question",
      status: "approved",
      age_band: "family",
      difficulty: 2,
      language: "en",
      tags: ["api_test"],
    };

    // 1. Validation error on bad data
    const badRes = await app.server.inject({
      method: "POST",
      url: "/api/question-bank/questions",
      payload: { ...newQuestion, correct_choice_id: "INVALID_CHOICE" },
    });
    expect(badRes.statusCode).toBe(400);

    // 2. Create question
    const createRes = await app.server.inject({
      method: "POST",
      url: "/api/question-bank/questions",
      payload: newQuestion,
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json<QuestionBankRouteBody>();
    expect(created.question.id).toBe(testId);

    // 3. Update question
    const updateRes = await app.server.inject({
      method: "PUT",
      url: `/api/question-bank/questions/${testId}`,
      payload: { explanation: "Updated explanation via REST API" },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = updateRes.json<QuestionBankRouteBody>();
    expect(updated.question.explanation).toBe("Updated explanation via REST API");

    // 4. Delete question
    const deleteRes = await app.server.inject({
      method: "DELETE",
      url: `/api/question-bank/questions/${testId}`,
    });
    expect(deleteRes.statusCode).toBe(200);
    const deleted = deleteRes.json<QuestionBankRouteBody>();
    expect(deleted.ok).toBe(true);

    // 5. Subsequent delete returns 404
    const deleteAgainRes = await app.server.inject({
      method: "DELETE",
      url: `/api/question-bank/questions/${testId}`,
    });
    expect(deleteAgainRes.statusCode).toBe(404);
  });

  it("GET /api/question-bank/matrix-coverage returns 23,000 combo stats and breakdown", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/matrix-coverage",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<QuestionBankRouteBody>();
    expect(body.coverage).toBeDefined();
    expect(body.coverage.total_combos).toBe(23000);
    expect(body.coverage.covered_combos).toBeGreaterThanOrEqual(0);
    expect(Object.keys(body.coverage.by_domain).length).toBe(18);
    expect(Object.keys(body.coverage.by_archetype).length).toBe(8);
  });

  it("POST /api/question-bank/generate-batch handles auto mode with candidate override", async () => {
    const candidateQuestion = {
      id: `BATCH-ROUTE-TEST-${Date.now()}`,
      archetype_id: "speed_blitz",
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      entity_id: "ENT-ANI-001",
      language: "en",
      format: "multiple_choice",
      question: "Which mammal has the thickest fur of any animal?",
      choices: [
        { id: "A", text: "Sea Otter", is_correct: true },
        { id: "B", text: "Polar Bear", is_correct: false },
        { id: "C", text: "Chinchilla", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Sea otters have up to one million hairs per square inch to stay warm.",
      thinking_seconds: 4,
      visual_spec: { intent: "none" },
      difficulty: 2,
      tags: ["animals"],
    };

    const res = await app.server.inject({
      method: "POST",
      url: "/api/question-bank/generate-batch",
      payload: {
        mode: "auto",
        target_count: 1,
        candidates: [candidateQuestion],
        persist: false,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<QuestionBankRouteBody>();
    expect(body.success).toBe(true);
    expect(body.approvedCount).toBe(1);
    expect(body.matrixCoverage).toBeDefined();
    expect(body.matrixCoverage.total_combos).toBe(23000);
    const qaSummary = (body as Record<string, unknown>).qaSummary as Record<string, unknown> | undefined;
    expect(qaSummary).toEqual({
      duplicateRejections: 0,
      schemaRejections: 0,
      qualityRejections: 0,
    });
    expect(Object.hasOwn(qaSummary || {}, "copyrightRejections")).toBe(false);
  });

  it("POST /api/question-bank/generate-batch rejects foreign raw candidates before persistence", async () => {
    const res = await app.server.inject({
      method: "POST",
      url: "/api/question-bank/generate-batch",
      payload: {
        mode: "auto",
        target_count: 1,
        wait: true,
        persist: true,
        candidates: [
          {
            id: `BATCH-ROUTE-FOREIGN-${Date.now()}`,
            archetype_id: "speed_blitz",
            domain_id: "nature_animals",
            subtopic_id: "mammals",
            language: "fr",
            format: "multiple_choice",
            question: "Which mammal lays eggs?",
            choices: [
              { id: "A", text: "Platypus", is_correct: true },
              { id: "B", text: "Kangaroo", is_correct: false },
              { id: "C", text: "Koala", is_correct: false },
            ],
            correct_choice_id: "A",
            explanation: "The platypus is a mammal that lays eggs.",
            difficulty: 1,
            tags: [],
            status: "approved",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<QuestionBankRouteBody>().code).toBe("BANK_ENGLISH_ONLY");
  });
});

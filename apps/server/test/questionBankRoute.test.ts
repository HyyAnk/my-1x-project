import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { buildApp, type StudioApp } from "../src/app.js";

describe("Question Bank REST API Routes", () => {
  let app: StudioApp;

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    app = await buildApp(curr);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/question-bank/taxonomy returns 9 domains synced from knowledge base", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/taxonomy",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.taxonomy).toBeDefined();
    expect(body.taxonomy.domains.length).toBeGreaterThanOrEqual(9);
  });

  it("GET /api/question-bank/stats returns total count and breakdown", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/stats",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
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
    const body = JSON.parse(res.body);
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
    const body = JSON.parse(res.body);
    expect(body.questions.length).toBeGreaterThanOrEqual(5);
    expect(body.questions.every((q: any) => q.archetype_id === "speed_blitz")).toBe(true);

    const searchRes = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/questions?search=stick",
    });
    expect(searchRes.statusCode).toBe(200);
    const searchBody = JSON.parse(searchRes.body);
    expect(searchBody.questions.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/question-bank/questions/:id returns 404 for unknown question", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/questions/NON_EXISTENT_ID",
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
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
      ],
      correct_choice_id: "A",
      explanation: "Test explanation for REST API question",
      status: "approved",
      age_band: "family",
      difficulty: 2,
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
    const created = JSON.parse(createRes.body);
    expect(created.question.id).toBe(testId);

    // 3. Update question
    const updateRes = await app.server.inject({
      method: "PUT",
      url: `/api/question-bank/questions/${testId}`,
      payload: { explanation: "Updated explanation via REST API" },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body);
    expect(updated.question.explanation).toBe("Updated explanation via REST API");

    // 4. Delete question
    const deleteRes = await app.server.inject({
      method: "DELETE",
      url: `/api/question-bank/questions/${testId}`,
    });
    expect(deleteRes.statusCode).toBe(200);
    const deleted = JSON.parse(deleteRes.body);
    expect(deleted.ok).toBe(true);

    // 5. Subsequent delete returns 404
    const deleteAgainRes = await app.server.inject({
      method: "DELETE",
      url: `/api/question-bank/questions/${testId}`,
    });
    expect(deleteAgainRes.statusCode).toBe(404);
  });

  it("GET /api/question-bank/matrix-coverage returns 20,000 combo stats and breakdown", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/question-bank/matrix-coverage",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.coverage).toBeDefined();
    expect(body.coverage.total_combos).toBe(20000);
    expect(body.coverage.covered_combos).toBeGreaterThanOrEqual(0);
    expect(Object.keys(body.coverage.by_domain).length).toBe(14);
    expect(Object.keys(body.coverage.by_archetype).length).toBe(8);
  });

  it("POST /api/question-bank/generate-batch handles auto mode with candidate override", async () => {
    const candidateQuestion = {
      id: `BATCH-ROUTE-TEST-${Date.now()}`,
      archetype_id: "speed_blitz",
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      entity_id: "ENT-ANI-001",
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
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.approvedCount).toBe(1);
    expect(body.matrixCoverage).toBeDefined();
    expect(body.matrixCoverage.total_combos).toBe(20000);
  });
});

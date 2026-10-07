import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { QuizV2 } from "@studio/shared";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })),
  );
});

// Minimal 1x1 PNG base64 data URI
const SAMPLE_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("Quiz Question Image Routes API", () => {
  async function createTestServer() {
    const root = await mkdtemp(path.join(os.tmpdir(), "question-img-routes-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const app = await buildApp(root);
    const channel = await app.repository.createChannel({
      name: "Image Route Channel",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });

    const topics = [
      {
        topic_id: "topic-1",
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        title: "Ocean Secrets",
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        quiz_format: "multiple_choice" as const,
        question_count: 3,
        age_band: "7-9" as const,
      },
    ];
    await app.repository.saveTopicRun(channel.channel_id, topics);
    const episode = await app.repository.confirmTopic(channel.channel_id, "topic-1");

    const sampleQuiz: QuizV2 = {
      schema_version: 2,
      episode_id: episode.episode_id,
      age_band: "7-9",
      language: "English",
      questions: [
        {
          id: "q-1",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Which mammal is the largest in the world?",
          choices: [
            { id: "c1", text: "Blue Whale" },
            { id: "c2", text: "Elephant" },
            { id: "c3", text: "Giraffe" },
          ],
          correct_choice_id: "c1",
          explanation: "The blue whale is the largest animal ever known.",
          visual_opportunity: "Majestic blue whale swimming",
          source_ids: ["C01"],
        },
        {
          id: "q-2",
          number: 2,
          format: "multiple_choice",
          difficulty: 2,
          question: "How many hearts does an octopus have?",
          choices: [
            { id: "c1", text: "3" },
            { id: "c2", text: "1" },
            { id: "c3", text: "2" },
          ],
          correct_choice_id: "c1",
          explanation: "Octopuses have three hearts.",
          visual_opportunity: "Cute octopus underwater",
          source_ids: ["C02"],
        },
        {
          id: "q-3",
          number: 3,
          format: "multiple_choice",
          difficulty: 3,
          question: "Which fish can produce electric shocks?",
          choices: [
            { id: "c1", text: "Electric Eel" },
            { id: "c2", text: "Clownfish" },
            { id: "c3", text: "Tuna" },
          ],
          correct_choice_id: "c1",
          explanation: "Electric eels can generate up to 860 volts.",
          visual_opportunity: "Electric eel glowing in dark water",
          source_ids: ["C03"],
        },
      ],
    };

    await app.repository.writeQuiz(channel.channel_id, episode.episode_id, sampleQuiz);

    return { app, channel, episode };
  }

  it("GET /question-images returns question list overview", async () => {
    const { app, channel, episode } = await createTestServer();

    const res = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/question-images`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total_questions).toBe(3);
    expect(body.ready_count).toBe(0);
    expect(body.missing_count).toBe(3);
    expect(body.items.length).toBe(3);
    expect(body.items[0].question_number).toBe(1);
    expect(body.items[0].question_text).toBe("Which mammal is the largest in the world?");
  });

  it("POST /questions/:number/image/upload uploads image and marks question ready", async () => {
    const { app, channel, episode } = await createTestServer();

    const res = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/questions/1/image/upload`,
      payload: {
        data: SAMPLE_PNG_DATA_URI,
        filename: "blue_whale.png",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.item.question_number).toBe(1);
    expect(body.item.status).toBe("user_uploaded");
    expect(body.item.user_selected).toBe(true);
    expect(body.item.source).toBe("explicit_episode");
  });

  it("DELETE /questions/:number/image/custom resets custom image", async () => {
    const { app, channel, episode } = await createTestServer();

    // First upload
    await app.server.inject({
      method: "POST",
      url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/questions/1/image/upload`,
      payload: {
        data: SAMPLE_PNG_DATA_URI,
        filename: "blue_whale.png",
      },
    });

    // Then delete custom
    const delRes = await app.server.inject({
      method: "DELETE",
      url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/questions/1/image/custom`,
    });

    expect(delRes.statusCode).toBe(200);
    const body = JSON.parse(delRes.body);
    expect(body.success).toBe(true);
    expect(body.item.question_number).toBe(1);
    expect(body.item.status).toBe("missing");
    expect(body.item.user_selected).toBe(false);
  });

  it("GET /questions/:number/image streams uploaded image file", async () => {
    const { app, channel, episode } = await createTestServer();

    await app.server.inject({
      method: "POST",
      url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/questions/2/image/upload`,
      payload: {
        data: SAMPLE_PNG_DATA_URI,
        filename: "octopus.png",
      },
    });

    const imgRes = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/questions/2/image`,
    });

    expect(imgRes.statusCode).toBe(200);
    expect(imgRes.headers["content-type"]).toBe("image/png");
    expect(imgRes.rawPayload.byteLength).toBeGreaterThan(0);
  });
});

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VideoDescription, VideoTitle } from "@studio/shared";

const LLM_TITLE = "Sea Creature Quiz: 3 Questions Only Ocean Experts Get Right";
const TITLE_PROMPT_MARKER = "Write exactly ONE YouTube video title";

const mocks = vi.hoisted(() => ({
  executeSinglePromptText: vi.fn(),
}));

vi.mock("../src/utils/promptSanitizer.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/promptSanitizer.js")>();
  return { ...original, executeSinglePromptText: mocks.executeSinglePromptText };
});

import { buildApp } from "../src/app.js";

type MetadataResponse = { title: VideoTitle; description: VideoDescription | null };

const roots: string[] = [];

function scriptLlmResponses(): void {
  mocks.executeSinglePromptText.mockImplementation(async (_client: unknown, prompt: string) =>
    prompt.includes(TITLE_PROMPT_MARKER)
      ? JSON.stringify({ title: LLM_TITLE, primary_keyword: "sea creature quiz" })
      : JSON.stringify({
          topic_category: "Sea Creatures",
          primary_keyword: "ocean trivia",
          keyword_variations: ["deep sea quiz"],
          hook_lines: "Sea creature quiz time!\nHow well do you know the ocean?\nThree questions await.",
          semantic_paragraph: "Dive into the deep sea with puzzles about amazing creatures.",
          scoring_cta: { beginner: "Sailor", intermediate: "Explorer", expert: "Ocean Master", cta_text: "Keep score and play again!" },
          suggested_playlist_category: "Ocean Quizzes",
          hashtags: ["#quiz", "#ocean"],
        }),
  );
}

function lastDescriptionPrompt(): string {
  const prompts = mocks.executeSinglePromptText.mock.calls.map((call) => String(call[1]));
  return prompts.filter((prompt) => !prompt.includes(TITLE_PROMPT_MARKER)).at(-1) ?? "";
}

async function createTestApp() {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-title-route-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  return buildApp(root);
}

async function seedQuizEpisode(app: Awaited<ReturnType<typeof buildApp>>) {
  const channel = await app.repository.createChannel({
    name: "Quiz Channel Title Test",
    description: "Test channel",
    target_audience: "General",
    language: "English",
    market: "US",
    dna_mode: "example",
  });
  const topic = {
    topic_id: "topic-0",
    channel_id: channel.channel_id,
    content_kind: "episode" as const,
    title: "Ocean Mysteries",
    premise: "Discover strange sea creatures",
    why_it_fits: "Fits the channel theme",
    hook: "Do you know which fish glows in the deep sea?",
    estimated_potential: "High",
    generated_at: new Date().toISOString(),
    selected: false,
    quiz_format: "multiple_choice" as const,
    question_count: 3,
    age_band: "family" as const,
  };
  await app.repository.saveTopicRun(channel.channel_id, [topic]);
  const episode = await app.repository.confirmTopic(channel.channel_id, topic.topic_id);
  await app.repository.saveScenes(
    channel.channel_id,
    episode.episode_id,
    [1, 2, 3].map((number) => ({
      scene_id: `scene-${number}`,
      episode_id: episode.episode_id,
      scene_number: number,
      duration_seconds: 10,
      dialogue: `Question ${number}`,
      visual_prompt: `Sea creature ${number}`,
      transition_note: "",
      continuity_note: "",
      sequence_id: `sequence-${number}`,
      sequence_title: `Sequence ${number}`,
      shot_id: `shot-${number}`,
      asset_type: "ai_reconstruction" as const,
      continuity_bundle_id: `CB-${String(number).padStart(2, "0")}`,
      reference_asset_ids: [],
      source_ids: [`src-${number}`],
      reconstruction: true,
      sound_cue: "",
      editorial_overlay: {
        kind: "none" as const,
        text: "",
        motion: "none" as const,
        placement: "lower_third" as const,
        duration_seconds: null,
        data: [],
        source_ids: [],
      },
      quiz: {
        phase: "question" as const,
        question_number: number,
        question: `What is sea creature number ${number}?`,
        choices: ["A. Whale", "B. Shark", "C. Dolphin"],
        answer: "A. Whale",
        explanation: `Whale number ${number} is the largest animal.`,
        image_prompt: "A blue whale in the ocean",
      },
      audio_asset_path: null,
      audio_generated_at: null,
      audio_duration_seconds: null,
    })),
  );
  return { channel, episode, baseUrl: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2` };
}

afterEach(async () => {
  mocks.executeSinglePromptText.mockReset();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
});

describe("Quiz video title routes", () => {
  it("generates the title before the description and keeps both aligned", { timeout: 20_000 }, async () => {
    scriptLlmResponses();
    const app = await createTestApp();
    try {
      const { baseUrl } = await seedQuizEpisode(app);

      const generatedQuiz = (await app.server.inject({ method: "POST", url: `${baseUrl}/generate` })).json<MetadataResponse>();
      expect(generatedQuiz.title).toMatchObject({ title: LLM_TITLE, source: "llm" });
      expect(generatedQuiz.description?.primary_keyword).toBe("sea creature quiz");
      expect(lastDescriptionPrompt()).toContain(`"${LLM_TITLE}"`);

      const stored = await app.server.inject({ method: "GET", url: `${baseUrl}/title` });
      expect(stored.json<{ title: VideoTitle }>().title.title).toBe(LLM_TITLE);

      const regenerated = await app.server.inject({ method: "POST", url: `${baseUrl}/title/generate`, payload: { tone_hint: "Playful" } });
      expect(regenerated.statusCode).toBe(200);
      expect(regenerated.json<MetadataResponse>().description).not.toBeNull();

      const state = await app.server.inject({ method: "GET", url: baseUrl });
      expect(state.json<{ title: VideoTitle }>().title.title).toBe(LLM_TITLE);
    } finally {
      await app.close();
    }
  });

  it("saves a manual title and re-syncs the description to it", { timeout: 20_000 }, async () => {
    scriptLlmResponses();
    const app = await createTestApp();
    try {
      const { baseUrl } = await seedQuizEpisode(app);
      await app.server.inject({ method: "POST", url: `${baseUrl}/generate` });

      const manualTitle = "Deep Sea Quiz: 3 Questions About Strange Ocean Creatures";
      const saved = await app.server.inject({
        method: "PUT",
        url: `${baseUrl}/title`,
        payload: { title: manualTitle, primary_keyword: "deep sea quiz" },
      });
      expect(saved.statusCode).toBe(200);
      const body = saved.json<MetadataResponse>();
      expect(body.title).toMatchObject({ title: manualTitle, primary_keyword: "deep sea quiz", source: "manual" });
      expect(body.description?.primary_keyword).toBe("deep sea quiz");
      expect(lastDescriptionPrompt()).toContain(`"${manualTitle}"`);

      const rejected = await app.server.inject({ method: "PUT", url: `${baseUrl}/title`, payload: { title: "Deep <Sea> Quiz" } });
      expect(rejected.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});

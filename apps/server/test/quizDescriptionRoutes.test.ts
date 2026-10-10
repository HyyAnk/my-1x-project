import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeSinglePromptText: vi.fn().mockResolvedValue(
    JSON.stringify({
      topic_category: "Sea Creatures",
      primary_keyword: "sea creature trivia",
      keyword_variations: ["ocean quiz", "deep sea mysteries"],
      question_count: 3,
      hook_lines: "Sea creature trivia - How many ocean species do you know?\nTest your deep sea knowledge now!",
      semantic_paragraph: "Explore the vast ocean world with puzzles about amazing sea creatures.",
      scoring_cta: {
        beginner: "1 correct: Apprentice Sailor",
        intermediate: "2 correct: Sea Explorer",
        expert: "3 correct: Ocean Master",
        cta_text: "How many did you get right? Tell us below!",
      },
      suggested_playlist_category: "Sea Creatures & Oceans",
      hashtags: ["#quiz", "#seacreatures", "#ocean", "#trivia"],
    }),
  ),
}));

vi.mock("../src/utils/promptSanitizer.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/promptSanitizer.js")>();
  return {
    ...original,
    executeSinglePromptText: mocks.executeSinglePromptText,
  };
});

import { buildApp } from "../src/app.js";

type DescriptionResponse = {
  quiz?: unknown;
  description: { question_count: number; primary_keyword?: string; full_description_text?: string };
};

const roots: string[] = [];
const ROUTE_TIMEOUT_MS = 20_000;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
});

describe("Quiz Video Description API Routes (Step 1 & Step 3)", () => {
  it(
    "automatically generates description upon quiz creation & remix, and supports manual edits",
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "quiz-desc-route-"));
      roots.push(root);
      await mkdir(path.join(root, "templates"), { recursive: true });
      await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
      await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
      await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

      const app = await buildApp(root);
      try {
        const channel = await app.repository.createChannel({
          name: "Quiz Channel Description Test",
          description: "Test channel",
          target_audience: "General",
          language: "English",
          market: "US",
          dna_mode: "example",
        });

        const topics = Array.from({ length: 5 }, (_, index) => ({
          topic_id: "topic-" + index,
          channel_id: channel.channel_id,
          content_kind: "episode" as const,
          title: "Ocean Mysteries " + index,
          premise: "Discover strange sea creatures",
          why_it_fits: "Fits the channel theme",
          hook: "Do you know which fish glows in the deep sea?",
          estimated_potential: "High",
          generated_at: new Date().toISOString(),
          selected: false,
          quiz_format: "multiple_choice" as const,
          question_count: 3,
          age_band: "7-9" as const,
        }));

        await app.repository.saveTopicRun(channel.channel_id, topics);
        const episode = await app.repository.confirmTopic(channel.channel_id, topics[0].topic_id);

        // Seed quiz scenes
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

        // 1. Initial GET description -> returns null
        const initGet = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2/description`,
        });
        expect(initGet.statusCode).toBe(200);
        expect(initGet.json()).toEqual({ description: null });

        // 2. Generate Quiz V2 -> automatically generates description too!
        const genQuiz = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2/generate`,
        });
        expect(genQuiz.statusCode).toBe(200);
        const genResult = genQuiz.json<DescriptionResponse>();
        expect(genResult.quiz).toBeDefined();
        expect(genResult.description).toBeDefined();
        expect(genResult.description.question_count).toBe(3);

        // Verify description.md file was automatically written to disk
        const descMdPath = path.join(root, "channels", channel.slug, "episodes", episode.slug, "description.md");
        const mdContent = await readFile(descMdPath, "utf8");
        expect(mdContent).toContain("🏆 SCORING TIERS:");

        // 3. GET description returns the automatically generated artifact
        const getAfter = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2/description`,
        });
        expect(getAfter.statusCode).toBe(200);
        expect(getAfter.json<DescriptionResponse>().description.primary_keyword).toBe("sea creature trivia");

        // 4. Regenerate description with a custom tone hint
        const postGenerate = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2/description/generate`,
          payload: { tone_hint: "Engaging and curious" },
        });
        expect(postGenerate.statusCode).toBe(200);
        const generated = postGenerate.json<DescriptionResponse>();
        expect(generated.description).toBeDefined();
        expect(generated.description.question_count).toBe(3);

        // 5. PUT description updates custom user text
        const putRes = await app.server.inject({
          method: "PUT",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2/description`,
          payload: {
            full_description_text: "This description was manually edited by the user!\n\n#quiz #ocean",
            primary_keyword: "ocean mysteries",
          },
        });
        expect(putRes.statusCode).toBe(200);
        const updated = putRes.json<DescriptionResponse>();
        expect(updated.description.full_description_text).toBe("This description was manually edited by the user!\n\n#quiz #ocean");

        // Verify description.md on disk was updated
        const updatedMdContent = await readFile(descMdPath, "utf8");
        expect(updatedMdContent.trim()).toBe("This description was manually edited by the user!\n\n#quiz #ocean");

        // 6. Full QuizV2 state includes description
        const fullStateRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2`,
        });
        expect(fullStateRes.statusCode).toBe(200);
        expect(fullStateRes.json<DescriptionResponse>().description.full_description_text).toBe(
          "This description was manually edited by the user!\n\n#quiz #ocean",
        );
      } finally {
        await app.close();
      }
    },
    ROUTE_TIMEOUT_MS,
  );
});

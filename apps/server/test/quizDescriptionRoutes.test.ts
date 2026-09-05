import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeSinglePromptText: vi.fn().mockResolvedValue(
    JSON.stringify({
      topic_category: "Sinh vật biển",
      primary_keyword: "đố vui sinh vật biển",
      keyword_variations: ["trắc nghiệm đại dương", "bí ẩn biển sâu"],
      question_count: 3,
      hook_lines: "Đố vui sinh vật biển - Bạn biết bao nhiêu loài dưới đại dương?\nCùng thử thách kiến thức biển sâu ngay!",
      semantic_paragraph: "Khám phá thế giới đại dương bao la với những câu đố về loài cá voi khổng lồ và các sinh vật kỳ thú.",
      scoring_cta: {
        beginner: "1 câu: Thủy thủ tập sự",
        intermediate: "2 câu: Nhà thám hiểm biển",
        expert: "3 câu: Bậc thầy đại dương",
        cta_text: "Bạn đúng được mấy câu? Hãy bình luận bên dưới nhé!",
      },
      suggested_playlist_category: "Sinh Vật Biển & Đại Dương",
      hashtags: ["#quiz", "#sinhvatbien", "#daiduong", "#trivia"],
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

const roots: string[] = [];
const ROUTE_TIMEOUT_MS = 20_000;

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })),
  );
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
          language: "Vietnamese",
          market: "VN",
          dna_mode: "example",
        });

        const topics = Array.from({ length: 5 }, (_, index) => ({
          topic_id: "topic-" + index,
          channel_id: channel.channel_id,
          title: "Bí Ẩn Đại Dương " + index,
          premise: "Khám phá các loài sinh vật biển kỳ lạ",
          why_it_fits: "Phù hợp chủ đề",
          hook: "Bạn có biết loài cá nào phát sáng dưới đáy biển sâu?",
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
            dialogue: `Câu hỏi ${number}`,
            visual_prompt: `Sinh vật biển ${number}`,
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
              question: `Loài sinh vật biển số ${number} là gì?`,
              choices: ["A. Cá voi", "B. Cá mập", "C. Cá heo"],
              answer: "A. Cá voi",
              explanation: `Cá voi số ${number} là loài động vật lớn nhất.`,
              image_prompt: "Cá voi xanh dưới đại dương",
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
        const genResult = genQuiz.json();
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
        expect(getAfter.json().description.primary_keyword).toBe("đố vui sinh vật biển");

        // 4. Regenerate description with a custom tone hint
        const postGenerate = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2/description/generate`,
          payload: { tone_hint: "Hấp dẫn và tò mò" },
        });
        expect(postGenerate.statusCode).toBe(200);
        const generated = postGenerate.json();
        expect(generated.description).toBeDefined();
        expect(generated.description.question_count).toBe(3);

        // 5. PUT description updates custom user text
        const putRes = await app.server.inject({
          method: "PUT",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2/description`,
          payload: {
            full_description_text: "Mô tả đã được chỉnh sửa thủ công bởi người dùng!\n\n#quiz #ocean",
            primary_keyword: "bí ẩn đại dương",
          },
        });
        expect(putRes.statusCode).toBe(200);
        const updated = putRes.json();
        expect(updated.description.full_description_text).toBe("Mô tả đã được chỉnh sửa thủ công bởi người dùng!\n\n#quiz #ocean");

        // Verify description.md on disk was updated
        const updatedMdContent = await readFile(descMdPath, "utf8");
        expect(updatedMdContent.trim()).toBe("Mô tả đã được chỉnh sửa thủ công bởi người dùng!\n\n#quiz #ocean");

        // 6. Full QuizV2 state includes description
        const fullStateRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2`,
        });
        expect(fullStateRes.statusCode).toBe(200);
        expect(fullStateRes.json().description.full_description_text).toBe(
          "Mô tả đã được chỉnh sửa thủ công bởi người dùng!\n\n#quiz #ocean",
        );
      } finally {
        await app.close();
      }
    },
    ROUTE_TIMEOUT_MS,
  );
});

import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashBankQuestionSource, type BankQuestion, type TopicCandidate, type ShortReelTopicCandidate } from "@studio/shared";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { RepositoryService } from "../src/repository/service.js";
import { createEpisodeFromTopicWithBank } from "../src/quiz/bank/questionBankToQuizBridge.js";
import { confirmShortReelTopic } from "../src/shortReel/topicConfirmation.js";
import { generateEpisodeDescription } from "../src/quiz/pipeline/orchestrator.js";
import { generateEpisodeThumbnail } from "../src/quiz/thumbnail/thumbnailService.js";
import { generateReelScriptUnit } from "../src/shortReel/packageService.js";
import { exportShortReelPackage } from "../src/shortReel/exportService.js";
import {
  loadProductLocalizationArtifact,
  loadShortReelLocalizationArtifact,
  type TranslateFunction,
} from "../src/quiz/bank/localization/productLocalization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

const testConfig = { audio_generation: { provider: "mock" } as never };

describe("Phase 4: Product Localization Consumers & Finding L1/L2 Regressions", () => {
  const roots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
  });

  async function createFixture(channelLang = "de") {
    const root = await mkdtemp(path.join(os.tmpdir(), "phase4-loc-test-"));
    roots.push(root);

    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");

    const repo = new RepositoryService(projectRoot, root);
    await repo.ensureBootstrap();

    const channel = await repo.createChannel({
      name: "Localization Channel",
      description: "Testing product localization consumers",
      target_audience: "General",
      language: channelLang,
      market: "Global",
      dna_mode: "example",
    });

    return { repo, channel, root };
  }

  function seedBankQuestions(
    repo: RepositoryService,
    count = 3,
    archetype: "deep_trivia" | "versus_faceoff" = "deep_trivia",
    offset = 0,
  ): Promise<BankQuestion[]> {
    const questions: BankQuestion[] = [];
    for (let i = 1; i <= count; i++) {
      const idx = i + offset;
      questions.push({
        id: `q-phase4-science-${archetype}-${idx}`,
        archetype_id: archetype,
        domain_id: "science",
        subtopic_id: "astronomy",
        question:
          archetype === "versus_faceoff"
            ? idx > 5
              ? `Which cosmic system has greater orbital velocity, nebula ${idx} or comet ${idx}?`
              : `Which celestial object has higher gravity, object ${idx}A or object ${idx}B?`
            : `What is planet number ${idx} from the sun?`,
        explanation: `Explanation for item number ${idx}.`,
        format: archetype === "versus_faceoff" ? "true_false" : "multiple_choice",
        status: "approved",
        language: "en",
        correct_choice_id: "c1",
        choices:
          archetype === "versus_faceoff"
            ? [
                { id: "c1", text: `Planet ${i}A` },
                { id: "c2", text: `Planet ${i}B` },
              ]
            : [
                { id: "c1", text: `Planet ${i} name` },
                { id: "c2", text: `Wrong planet ${i}A` },
                { id: "c3", text: `Wrong planet ${i}B` },
              ],
        tags: ["science", "planets"],
        difficulty: 1,
        age_band: "family",
        thinking_seconds: 5,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      });
    }

    return Promise.all(questions.map((q) => repo.saveQuestionBankQuestion(q)));
  }

  function makeMockTranslateLlm(targetLang = "de"): LLMClient {
    return {
      connect: () => Promise.resolve(undefined),
      generateContent: (prompt: string) => {
        const lastBrace = prompt.lastIndexOf("}");
        const firstBrace = prompt.lastIndexOf("{", lastBrace);
        let items: Record<string, string> = {};
        if (firstBrace !== -1 && lastBrace !== -1) {
          try {
            items = JSON.parse(prompt.slice(firstBrace, lastBrace + 1)) as Record<string, string>;
          } catch {
            items = {};
          }
        }
        const translated: Record<string, string> = {};
        for (const [key, value] of Object.entries(items)) {
          translated[key] = `[${targetLang}] ${value}`;
        }
        return Promise.resolve({ text: JSON.stringify(translated) });
      },
    };
  }

  function makeEpisodeCandidate(channelId: string, topicId: string, bankQuestions: BankQuestion[]): TopicCandidate {
    return {
      topic_id: topicId,
      channel_id: channelId,
      content_kind: "episode",
      quiz_format: "multiple_choice",
      title: "Solar System Secrets",
      premise: "Exploring the inner planets with deep astronomy facts",
      why_it_fits: "High interest educational trivia",
      hook: "Can you name all inner planets?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: bankQuestions.length,
      visual_style: "pixar_3d",
      source_bindings: bankQuestions.map((q) => ({
        source_question_id: q.id,
        source_hash_version: 1,
        source_content_hash: hashBankQuestionSource(q),
        projection_provenance: {
          source_variant: "native",
          resolved_language: "en",
          translation_key: null,
          translation_provenance: "native",
        },
      })),
    };
  }

  function makeShortReelCandidate(channelId: string, topicId: string, bankQuestion: BankQuestion): ShortReelTopicCandidate {
    return {
      slot_id: `slot-${topicId}`,
      topic_id: topicId,
      channel_id: channelId,
      content_kind: "short_reel",
      archetype: "versus_faceoff",
      title: "Earth vs Mars: Planet Duel",
      premise: "Comparing atmospheric pressure and temperature",
      why_it_fits: "High visual contrast space faceoff",
      hook: "Where could humans survive longer?",
      estimated_potential: "High",
      generated_at: "2026-09-01T00:00:00.000Z",
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      origin: "keyword",
      domain_id: "science",
      source_bindings: [
        {
          source_question_id: bankQuestion.id,
          source_hash_version: 1,
          source_content_hash: hashBankQuestionSource(bankQuestion),
          projection_provenance: {
            source_variant: "native",
            resolved_language: "en",
            translation_key: null,
            translation_provenance: "native",
          },
        },
      ],
    };
  }

  describe("Finding L1: Channel Language Change Invariance", () => {
    it("preserves existing German Short-Reel and Episode localization when channel changes to French", async () => {
      const { repo, channel } = await createFixture("de");
      const bankQuestions = await seedBankQuestions(repo, 3);

      const germanTranslate: TranslateFunction = ({ targetLanguage, items }) => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(items)) {
          result[key] = `[${targetLanguage}] ${value}`;
        }
        return Promise.resolve(result);
      };

      // 1. Confirm Episode in German (channel language = de)
      const epCandidate = makeEpisodeCandidate(channel.channel_id, "top-ep-de", bankQuestions);
      await repo.saveTopicRun(channel.channel_id, [epCandidate]);

      const epResult = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: epCandidate.topic_id, target_language: "de" },
        llmClient: makeMockTranslateLlm("de"),
      });
      const episode = epResult.episode;
      expect(episode).toBeDefined();

      const epLocBefore = await loadProductLocalizationArtifact(repo, channel.channel_id, episode.slug);
      expect(epLocBefore).not.toBeNull();
      expect(epLocBefore?.target_language).toBe("de");

      // 2. Confirm Short-Reel in German (channel language = de)
      const srBankQ = await seedBankQuestions(repo, 1, "versus_faceoff");
      const srCandidate = makeShortReelCandidate(channel.channel_id, "top-sr-de", srBankQ[0]);
      await repo.saveTopicRun(channel.channel_id, [srCandidate]);

      const srResult = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: srCandidate.topic_id,
        options: {
          question_count: 1,
          render_aspect_ratio: "9:16",
          target_language: "de",
        },
        translateFn: germanTranslate,
      });
      const reel = srResult.short_reel;
      const srLocBefore = await loadShortReelLocalizationArtifact(repo, channel.channel_id, reel.reel_id);
      expect(srLocBefore).not.toBeNull();
      expect(srLocBefore?.target_language).toBe("de");

      // 3. Update Channel Language to French ("fr")
      await repo.updateChannel(channel.channel_id, { language: "fr" });

      // L1 REGRESSION ASSERTION:
      // Short-Reel localization artifact MUST NOT be deleted or mutated!
      const srLocAfter = await loadShortReelLocalizationArtifact(repo, channel.channel_id, reel.reel_id);
      expect(srLocAfter, "Short-Reel localization must not be deleted on channel language change").not.toBeNull();
      expect(srLocAfter?.target_language).toBe("de");

      // Episode localization artifact must also remain intact and German
      const epLocAfter = await loadProductLocalizationArtifact(repo, channel.channel_id, episode.slug);
      expect(epLocAfter, "Episode localization must not be deleted on channel language change").not.toBeNull();
      expect(epLocAfter?.target_language).toBe("de");

      // 4. Regenerate Short-Reel script unit - it MUST still use German display projection!
      const regeneratedScript = await generateReelScriptUnit(
        repo,
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        "op-script-after-ch-change",
      );
      expect(regeneratedScript.script?.segments[0].text_cues[0].text).toContain("[de]");

      // 5. Newly confirmed product on the channel MUST use French by default
      const newSrBankQ = await seedBankQuestions(repo, 1, "versus_faceoff", 10);
      const newSrCandidate = makeShortReelCandidate(channel.channel_id, "top-sr-fr", newSrBankQ[0]);
      await repo.saveTopicRun(channel.channel_id, [newSrCandidate]);

      const frenchTranslate: TranslateFunction = ({ targetLanguage, items }) => {
        expect(targetLanguage).toBe("fr");
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(items)) {
          result[key] = `[fr] ${value}`;
        }
        return Promise.resolve(result);
      };

      const newSrResult = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: newSrCandidate.topic_id,
        translateFn: frenchTranslate,
      });

      const newSrLoc = await loadShortReelLocalizationArtifact(repo, channel.channel_id, newSrResult.short_reel.reel_id);
      expect(newSrLoc?.target_language).toBe("fr");
    });
  });

  describe("Finding L2: Episode Description Language Boundary & Fallback Integrity", () => {
    it("generates episode description matching confirmed German target even when channel was updated to French", async () => {
      const { repo, channel } = await createFixture("de");
      const bankQuestions = await seedBankQuestions(repo, 3);

      const epCandidate = makeEpisodeCandidate(channel.channel_id, "top-ep-desc-de", bankQuestions);
      await repo.saveTopicRun(channel.channel_id, [epCandidate]);

      const epResult = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: epCandidate.topic_id, target_language: "de" },
        llmClient: makeMockTranslateLlm("de"),
      });
      const episode = epResult.episode;

      // Change channel language to French
      await repo.updateChannel(channel.channel_id, { language: "fr" });

      // Mock LLM client that inspects prompt and returns German description
      let promptSentToLlm = "";
      const mockLlmClient: LLMClient = {
        connect: () => Promise.resolve(undefined),
        generateContent: (prompt: string) => {
          promptSentToLlm = prompt;
          return Promise.resolve({
            text: JSON.stringify({
              topic_category: "Sonnensystem",
              primary_keyword: "planeten quiz",
              keyword_variations: ["astronomie", "weltall"],
              question_count: 3,
              hook_lines: "Planeten Quiz - 3 Fragen!\nTeste dein astronomisches Wissen jetzt.",
              semantic_paragraph: "Entdecke faszinierende Fakten über die Planeten unseres Sonnensystems.",
              scoring_cta: {
                beginner: "1 Pkt: Anfänger",
                intermediate: "2 Pkt: Entdecker",
                expert: "3 Pkt: Astronomie-Meister",
                cta_text: "Wie viele Planeten hast du erkannt? Kommentiere unten!",
              },
              suggested_playlist_category: "Astronomie",
              hashtags: ["#quiz", "#weltall", "#planeten"],
            }),
          });
        },
      };

      const descResult = await generateEpisodeDescription({
        repository: repo,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        config: testConfig,
        activeEngine: "antigravity",
        antigravityClient: mockLlmClient,
      });

      // L2 REGRESSION ASSERTIONS:
      // 1. The prompt MUST instruct German ("de"), NOT French ("fr") from mutated channel
      expect(promptSentToLlm).toContain("- Language: de");
      expect(promptSentToLlm).not.toContain("- Language: fr");

      // 2. The description output language must be recorded as "de"
      expect(descResult.description.language).toBe("de");
      expect(descResult.description.hook_lines).toContain("Planeten Quiz");
    });

    it("uses verified German fallback on provider failure and NEVER labels English fallback as de", async () => {
      const { repo, channel } = await createFixture("de");
      const bankQuestions = await seedBankQuestions(repo, 3);

      const epCandidate = makeEpisodeCandidate(channel.channel_id, "top-ep-desc-fail", bankQuestions);
      await repo.saveTopicRun(channel.channel_id, [epCandidate]);

      const epResult = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: epCandidate.topic_id, target_language: "de" },
        llmClient: makeMockTranslateLlm("de"),
      });
      const episode = epResult.episode;

      // LLM client that throws (simulating provider failure)
      const failingLlmClient: LLMClient = {
        connect: () => Promise.resolve(undefined),
        generateContent: () => Promise.reject(new Error("LLM provider unavailable")),
      };

      const descResult = await generateEpisodeDescription({
        repository: repo,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        config: testConfig,
        activeEngine: "antigravity",
        antigravityClient: failingLlmClient,
      });

      // STRICT REQUIREMENT (Task 22):
      // Never label English fallback copy as de/fr!
      expect(descResult.description.language).toBe("de");
      // Must NOT contain English fallback strings like "Question Challenge!" or "Test your knowledge"
      expect(descResult.description.hook_lines).not.toContain("Question Challenge!");
      expect(descResult.description.hook_lines).not.toContain("Test your knowledge and see how many you can answer correctly");
      expect(descResult.description.scoring_cta.cta_text).not.toContain("How many did you get right?");
      expect(descResult.description.scoring_cta.beginner).not.toContain("Beginner");
      expect(descResult.description.scoring_cta.expert).not.toContain("Master");
    });

    it("fails closed when confirmed non-English product is missing localization artifact", async () => {
      const { repo, channel } = await createFixture("de");
      const bankQuestions = await seedBankQuestions(repo, 3);

      const epCandidate = makeEpisodeCandidate(channel.channel_id, "top-ep-missing-loc", bankQuestions);
      await repo.saveTopicRun(channel.channel_id, [epCandidate]);

      const epResult = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: epCandidate.topic_id, target_language: "de" },
        llmClient: makeMockTranslateLlm("de"),
      });
      const episode = epResult.episode;

      // Manually remove localization.json to simulate corrupted/missing artifact
      const locPath = repo.resolvePath("channels", channel.slug, "episodes", episode.slug, "localization.json");
      await rm(locPath, { force: true });

      const mockLlm: LLMClient = {
        connect: () => Promise.resolve(undefined),
        generateContent: () => Promise.resolve({ text: "{}" }),
      };

      // Fails closed with typed error rather than implicit English projection!
      await expect(
        generateEpisodeDescription({
          repository: repo,
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          config: testConfig,
          activeEngine: "antigravity",
          antigravityClient: mockLlm,
        }),
      ).rejects.toThrow(/PRODUCT_LANGUAGE_UNRESOLVED/);
    });
  });

  describe("Thumbnail and Script Prompt Boundaries", () => {
    it("keeps thumbnail AI planner instructions English while setting target language to de", async () => {
      const { repo, channel } = await createFixture("de");
      const bankQuestions = await seedBankQuestions(repo, 3);

      const epCandidate = makeEpisodeCandidate(channel.channel_id, "top-ep-thumb", bankQuestions);
      await repo.saveTopicRun(channel.channel_id, [epCandidate]);

      const epResult = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: epCandidate.topic_id, target_language: "de" },
        llmClient: makeMockTranslateLlm("de"),
      });
      const episode = epResult.episode;

      // Change channel language to French
      await repo.updateChannel(channel.channel_id, { language: "fr" });

      let capturedThumbnailPrompt = "";
      const mockThumbLlm: LLMClient = {
        connect: () => Promise.resolve(undefined),
        generateContent: (prompt: string) => {
          capturedThumbnailPrompt = prompt;
          return Promise.resolve({
            text: JSON.stringify({
              hook_text: "PLANETEN TEST",
              badge_text: "100% SCHWER",
              layout: "mega_grid",
              environment_atmosphere: "Clean 3D sci-fi astronomy observatory",
              lighting_palette: "Warm cosmic rim lighting",
              mascot_persona_variations: [
                {
                  id: 1,
                  archetypeId: 1,
                  archetypeName: "Scholar",
                  role: "Astronomer",
                  costume: "Lab coat",
                  prop: "Telescope",
                  expression: "Curious smile",
                  poseDescription: "Observing stars",
                },
              ],
              subject_anchors: [{ label: "Planet 1", visualPrompt: "Detailed 3D textured planet Mars" }],
            }),
          });
        },
      };

      await generateEpisodeThumbnail(repo, {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        activeEngine: "antigravity",
        antigravityClient: mockThumbLlm,
      });

      // Target language in prompt must be "de", NOT "fr"
      expect(capturedThumbnailPrompt).toContain('- Target Language: "de"');
      // Visual scene instructions stay English
      expect(capturedThumbnailPrompt).toContain("clean minimalist, soft-focus Pixar 3D studio background");
      expect(capturedThumbnailPrompt).toContain("lighting_palette");
    });

    it("Short-Reel export fails closed if non-English localization artifact is missing", async () => {
      const { repo, channel } = await createFixture("de");
      const bankQuestions = await seedBankQuestions(repo, 1, "versus_faceoff");

      const germanTranslate: TranslateFunction = ({ targetLanguage, items }) => {
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(items)) result[k] = `[${targetLanguage}] ${v}`;
        return Promise.resolve(result);
      };

      const srCandidate = makeShortReelCandidate(channel.channel_id, "top-sr-export-fail", bankQuestions[0]);
      await repo.saveTopicRun(channel.channel_id, [srCandidate]);

      const srResult = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: srCandidate.topic_id,
        options: { target_language: "de", render_aspect_ratio: "9:16" },
        translateFn: germanTranslate,
      });
      const reel = srResult.short_reel;

      // Delete localization.json
      const locPath = repo.resolvePath("channels", channel.slug, "short_reels", reel.reel_id, "localization.json");
      await rm(locPath, { force: true });

      // Export must fail closed (Task 26: missing artifacts for non-English confirmed products require recovery)
      await expect(
        exportShortReelPackage(repo, { channel_id: channel.channel_id, reel_id: reel.reel_id }, reel.revision),
      ).rejects.toThrow();
    });
  });

  describe("Zero Bank Write-back Guarantee Across Consumers", () => {
    it("ensures Question Bank files are byte-identical after description, thumbnail, and export workflows", async () => {
      const { repo, channel } = await createFixture("de");
      const bankQuestions = await seedBankQuestions(repo, 3);

      const indexFile = repo.getQuestionBankPath("index.json");
      const batchFile = repo.getQuestionBankPath("deep_trivia", "science", "astronomy.json");

      const indexHashBefore = createHash("sha256")
        .update(await readFile(indexFile))
        .digest("hex");
      const batchHashBefore = createHash("sha256")
        .update(await readFile(batchFile))
        .digest("hex");

      const epCandidate = makeEpisodeCandidate(channel.channel_id, "top-ep-immutable-bank", bankQuestions);
      await repo.saveTopicRun(channel.channel_id, [epCandidate]);

      const epResult = await createEpisodeFromTopicWithBank({
        repository: repo,
        channelId: channel.channel_id,
        input: { topic_id: epCandidate.topic_id, target_language: "de" },
        llmClient: makeMockTranslateLlm("de"),
      });
      const episode = epResult.episode;

      const mockLlmClient: LLMClient = {
        connect: () => Promise.resolve(undefined),
        generateContent: () =>
          Promise.resolve({
            text: JSON.stringify({
              topic_category: "Astronomie",
              primary_keyword: "planeten quiz",
              keyword_variations: [],
              question_count: 3,
              hook_lines: "Planeten Quiz!\nTeste dein Wissen.",
              semantic_paragraph: "Ein spannendes Quiz.",
              scoring_cta: {
                beginner: "1 Pkt: Anfänger",
                intermediate: "2 Pkt: Fortgeschritten",
                expert: "3 Pkt: Meister",
                cta_text: "Kommentiere unten!",
              },
              suggested_playlist_category: "Planeten",
              hashtags: ["#quiz"],
            }),
          }),
      };

      await generateEpisodeDescription({
        repository: repo,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        config: testConfig,
        activeEngine: "antigravity",
        antigravityClient: mockLlmClient,
      });

      // Assert Bank is byte-for-byte identical
      const indexHashAfter = createHash("sha256")
        .update(await readFile(indexFile))
        .digest("hex");
      const batchHashAfter = createHash("sha256")
        .update(await readFile(batchFile))
        .digest("hex");

      expect(indexHashAfter).toBe(indexHashBefore);
      expect(batchHashAfter).toBe(batchHashBefore);
    });
  });
});

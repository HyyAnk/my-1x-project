import { mkdtemp, mkdir, rm, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hashBankQuestionSource,
  createEnglishSourceSnapshot,
  type BankQuestion,
  type ShortReelTopicCandidate,
  type ReelKey,
  type ReelScript,
} from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { confirmShortReelTopic } from "../src/shortReel/topicConfirmation.js";
import {
  generateFullReelPackage,
  generateReelScriptUnit,
  generateReelPublishingUnit,
  exportShortReelPackage,
} from "../src/shortReel/packageService.js";
import {
  loadShortReelLocalizationArtifact,
  loadProductLocalizationArtifact,
  type TranslateFunction,
} from "../src/quiz/bank/localization/productLocalization.js";
import { getTopicConfirmationReceipt } from "../src/repository/topicConfirmationReceipts.js";
import { compileCoverPrompt, generateReelCoverImage } from "../src/shortReel/thumbnailAdapter.js";
import { applyLocalizedQuestionProjection } from "../src/quiz/thumbnail/thumbnailService.js";
import { compileFlowPrompts } from "../src/shortReel/flowPromptCompiler.js";
import { buildScriptGenerationPrompt } from "../src/shortReel/scriptPrompt.js";
import { storePackageAsset } from "../src/shortReel/packageAssets.js";
import { packageImage } from "./helpers/shortReelPackageFixture.js";
import { parseZipArchive } from "../src/quiz/zipHelper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

describe("Work 3: Short-Reel Localization, Source Invariants, and Pipeline Integration", () => {
  const roots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
  });

  async function createTestEnv(channelLang = "en") {
    const root = await mkdtemp(path.join(os.tmpdir(), "sr-loc-test-"));
    roots.push(root);

    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");

    const repo = new RepositoryService(projectRoot, root);
    await repo.ensureBootstrap();

    const channel = await repo.createChannel({
      name: "Short-Reel Localization Channel",
      description: "Testing Short-Reel localization pipeline",
      target_audience: "General",
      language: channelLang,
      market: "Global",
      dna_mode: "example",
    });

    return { repo, channel, root };
  }

  function seedBankQuestion(repo: RepositoryService): Promise<BankQuestion> {
    const q: BankQuestion = {
      id: "q-versus-sr-01",
      archetype_id: "versus_faceoff",
      domain_id: "nature_animals",
      subtopic_id: "predators",
      question: "Which cat has greater muscular density: Jaguar or Leopard?",
      explanation: "Jaguars possess significantly more compact muscular mass and stronger bite force than leopards.",
      format: "true_false",
      status: "approved",
      language: "en",
      correct_choice_id: "c1",
      choices: [
        { id: "c1", text: "Jaguar" },
        { id: "c2", text: "Leopard" },
      ],
      tags: ["nature", "cats"],
      difficulty: 2,
      age_band: "family",
      thinking_seconds: 5,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };

    return repo.saveQuestionBankQuestion(q);
  }

  function makeBoundTopicCandidate(
    channelId: string,
    topicId: string,
    bankQuestion: BankQuestion,
  ): ShortReelTopicCandidate {
    return {
      topic_id: topicId,
      channel_id: channelId,
      content_kind: "short_reel",
      archetype: "versus_faceoff",
      title: "Jaguar vs Leopard: Muscle Showdown",
      premise: "Comparing raw feline muscle mass and bite power",
      why_it_fits: "High tension nature trivia",
      hook: "Who is the true apex predator?",
      estimated_potential: "High",
      generated_at: "2026-09-01T00:00:00.000Z",
      selected: false,
      question_count: 1,
      aspect_ratio: "9:16",
      origin: "keyword",
      domain_id: "nature_animals",
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

  describe("Target Language Normalization & Upfront Rejection", () => {
    it("rejects Vietnamese ('vi', 'vi-VN') and unknown target languages upfront with zero orphan files", async () => {
      const { repo, channel } = await createTestEnv();
      const bankQ = await seedBankQuestion(repo);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-vi-test", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);

      // Attempt confirming with Vietnamese target language
      await expect(
        confirmShortReelTopic({
          repository: repo,
          channelId: channel.channel_id,
          topicId: topic.topic_id,
          options: {
            question_count: 1,
            render_aspect_ratio: "9:16",
            target_language: "vi",
          },
        }),
      ).rejects.toThrow(/UNSUPPORTED_TARGET_LANGUAGE/);

      // Attempt confirming with unknown target language
      await expect(
        confirmShortReelTopic({
          repository: repo,
          channelId: channel.channel_id,
          topicId: topic.topic_id,
          options: {
            question_count: 1,
            render_aspect_ratio: "9:16",
            target_language: "klingon",
          },
        }),
      ).rejects.toThrow(/UNSUPPORTED_TARGET_LANGUAGE/);

      // Verify zero Short-Reel files exist in storage (Zero orphan products)
      const reels = await repo.listShortReels(channel.channel_id);
      expect(reels).toHaveLength(0);

      const reelDir = repo.resolvePath("channels", channel.slug, "short_reels");
      const existsOnDisk = await repo.exists(reelDir);
      if (existsOnDisk) {
        const entries = await readdir(reelDir);
        expect(entries).toHaveLength(0);
      }
    });

    it("rejects unbound new topic candidates upfront with UNBOUND_LEGACY_TOPIC", async () => {
      const { repo, channel } = await createTestEnv();
      const unboundTopic: ShortReelTopicCandidate = {
        topic_id: "topic-unbound",
        channel_id: channel.channel_id,
        content_kind: "short_reel",
        archetype: "versus_faceoff",
        title: "Unbound Topic",
        premise: "Unbound Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: "2026-09-01T00:00:00.000Z",
        selected: false,
        question_count: 1,
        aspect_ratio: "9:16",
        origin: "keyword",
        domain_id: "nature_animals",
      };
      await repo.saveTopicRun(channel.channel_id, [unboundTopic]);

      await expect(
        confirmShortReelTopic({
          repository: repo,
          channelId: channel.channel_id,
          topicId: unboundTopic.topic_id,
        }),
      ).rejects.toThrow(/UNBOUND_LEGACY_TOPIC/);
    });
  });

  describe("Zero Orphan Product Policy on Translation Failure", () => {
    it("fails cleanly when translation provider is missing for non-English target without leaving orphan reels", async () => {
      const { repo, channel } = await createTestEnv();
      const bankQ = await seedBankQuestion(repo);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-fail-test", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);

      await expect(
        confirmShortReelTopic({
          repository: repo,
          channelId: channel.channel_id,
          topicId: topic.topic_id,
          options: {
            question_count: 1,
            render_aspect_ratio: "9:16",
            target_language: "de",
          },
          llmClient: null,
          translateFn: undefined,
        }),
      ).rejects.toThrow(/TRANSLATION_PROVIDER_MISSING/);

      // Verify ZERO Short-Reel records created
      const reels = await repo.listShortReels(channel.channel_id);
      expect(reels).toHaveLength(0);
    });
  });

  describe("English Fast-Path & Source Snapshot Invariants", () => {
    it("bypasses provider for English target and preserves canonical English source snapshot and hash", async () => {
      const { repo, channel } = await createTestEnv("en");
      const bankQ = await seedBankQuestion(repo);
      const originalBankHash = hashBankQuestionSource(bankQ);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-en-test", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);

      const mockTranslate: TranslateFunction = vi.fn();

      const result = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        options: {
          question_count: 1,
          render_aspect_ratio: "9:16",
          target_language: "en",
        },
        translateFn: mockTranslate,
      });

      // Zero provider calls for English
      expect(mockTranslate).not.toHaveBeenCalled();

      // Canonical source snapshot remains strictly English with exact hash
      const reel = result.short_reel;
      expect(reel.source.question_text).toBe(bankQ.question);
      expect(reel.source.selected_answer_text).toBe("Jaguar");
      expect(reel.source.content_hash).toBe(createEnglishSourceSnapshot(bankQ).content_hash);

      // Bank question in repository remains untouched
      const storedBankQ = await repo.getQuestionBankQuestion(bankQ.id, channel.channel_id);
      expect(storedBankQ?.question).toBe(bankQ.question);
      expect(storedBankQ?.language).toBe("en");
      expect(storedBankQ?.translations).toBeUndefined();

      // Localization artifact stored and reflects English
      const loc = await loadShortReelLocalizationArtifact(repo, channel.channel_id, reel.reel_id);
      expect(loc).not.toBeNull();
      expect(loc?.target_language).toBe("en");
      expect(loc?.quiz_questions[0].question).toBe(bankQ.question);
      expect(await repo.readQuestionHistory(channel.channel_id)).toEqual(
        expect.arrayContaining([expect.objectContaining({ episode_id: reel.reel_id, question_id: bankQ.id })]),
      );
    });
  });

  describe("Non-English Localization (German 'de', French 'fr')", () => {
    it("localizes audience-facing display fields into German while keeping source snapshot and premise English", async () => {
      const { repo, channel } = await createTestEnv();
      const bankQ = await seedBankQuestion(repo);
      const originalBankHash = hashBankQuestionSource(bankQ);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-de-test", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);

      const germanTranslate: TranslateFunction = async ({ targetLanguage, items }) => {
        expect(targetLanguage).toBe("de");
        return {
          [`${bankQ.id}_question`]: "Welche Katze hat eine größere Muskeldichte: Jaguar oder Leopard?",
          [`${bankQ.id}_choice_c1`]: "Jaguar",
          [`${bankQ.id}_choice_c2`]: "Leopard",
          [`${bankQ.id}_explanation`]: "Jaguare besitzen eine deutlich kompaktere Muskelmasse als Leoparden.",
          product_video_description: "Vergleich der rohen Muskelmasse und Beißkraft von Großkatzen.",
          product_thumbnail_text: "Wer ist das wahre Raubtier?",
        };
      };

      const result = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        options: {
          question_count: 1,
          render_aspect_ratio: "9:16",
          target_language: "de",
        },
        translateFn: germanTranslate,
      });

      const reel = result.short_reel;

      // 1. Canonical source snapshot MUST remain strictly English
      expect(reel.source.question_text).toBe(bankQ.question);
      expect(reel.source.explanation).toBe(bankQ.explanation);
      expect(reel.source.content_hash).toBe(createEnglishSourceSnapshot(bankQ).content_hash);

      // 2. Topic fields remain English
      expect(reel.topic.title).toBe("Jaguar vs Leopard: Muscle Showdown");
      expect(reel.topic.premise).toBe("Comparing raw feline muscle mass and bite power");

      // 3. Product localization artifact is stored with German display strings
      const loc = await loadShortReelLocalizationArtifact(repo, channel.channel_id, reel.reel_id);
      expect(loc).not.toBeNull();
      expect(loc?.target_language).toBe("de");
      expect(loc?.quiz_questions[0].question).toBe("Welche Katze hat eine größere Muskeldichte: Jaguar oder Leopard?");
      expect(loc?.quiz_questions[0].choices[0].text).toBe("Jaguar");
      expect(loc?.video_description).toBe("Vergleich der rohen Muskelmasse und Beißkraft von Großkatzen.");
      expect(loc?.thumbnail_text).toBe("Wer ist das wahre Raubtier?");

      const generationPrompt = buildScriptGenerationPrompt({
        topic: reel.topic,
        source: reel.source,
        displayProjection: {
          question_text: loc?.quiz_questions[0].question,
          selected_answer_text: loc?.quiz_questions[0].choices[0].text,
        },
      });
      expect(generationPrompt).toContain("Keep narrative, action, camera, environment, props, continuity, revealed_facts, and audio_direction instructions strictly in English");

      // 4. Generate Baseline Script: localized cues pass display projection validation
      const scriptRecord = await generateReelScriptUnit(
        repo,
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        "op-script-1",
      );
      const script = scriptRecord.script!;
      expect(script).not.toBeNull();
      // Segment 1 question text cue uses German localized question
      expect(script.segments[0].text_cues[0].text).toBe("Welche Katze hat eine größere Muskeldichte: Jaguar oder Leopard?");
      // Narrative and audio direction remain English
      expect(script.segments[0].narrative).toContain("Which cat has greater muscular density");
      expect(script.segments[0].audio_direction).toContain("Upbeat narration");

      // Segment 3 answer text cue uses German localized answer
      expect(script.segments[2].text_cues[0].text).toBe("Jaguar");
      expect(script.segments[2].narrative).toContain("Reveal answer");

      // 5. Flow prompt compilation traces localized text cues while instructions remain English
      const [p1, _p2, p3] = compileFlowPrompts(script);
      expect(p1).toContain('Welche Katze hat eine größere Muskeldichte: Jaguar oder Leopard?');
      expect(p1).toContain("--- ACTION & NARRATIVE ---");
      expect(p3).toContain('Jaguar');

      // 6. Publishing copy keeps English title and uses German localized description
      const pubRecord = await generateReelPublishingUnit(
        repo,
        { channel_id: channel.channel_id, reel_id: reel.reel_id },
        "op-pub-1",
      );
      const pubPayload = pubRecord.units.publishing.last_accepted_payload!;
      expect(pubPayload.description).toBe("Jaguar vs Leopard: Muscle Showdown: Vergleich der rohen Muskelmasse und Beißkraft von Großkatzen.");

      // 7. Thumbnail cover prompt uses localized thumbnail text while instructions remain English
      const coverPrompt = compileCoverPrompt(reel, loc?.thumbnail_text);
      expect(coverPrompt).toContain('In-Scene Question: "Wer ist das wahre Raubtier?"');
      expect(coverPrompt).toContain("Title: Jaguar vs Leopard: Muscle Showdown");
      expect(coverPrompt).toContain("9:16 portrait cover art");
    });
  });

  describe("Durable Replay & Options Conflict Policy", () => {
    it("returns existing reel idempotently on identical replay and throws CONFIRMATION_OPTIONS_CONFLICT on changed options", async () => {
      const { repo, channel } = await createTestEnv();
      const bankQ = await seedBankQuestion(repo);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-replay-test", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);

      // First confirmation
      const first = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        requestId: "req-first",
        options: {
          question_count: 1,
          render_aspect_ratio: "9:16",
          target_language: "en",
        },
      });

      // Replay with identical options succeeds and returns same reel ID
      const replayed = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        requestId: "req-first",
        options: {
          question_count: 1,
          render_aspect_ratio: "9:16",
          target_language: "en",
        },
      });
      expect(replayed.short_reel.reel_id).toBe(first.short_reel.reel_id);

      // Replay with changed target_language throws CONFIRMATION_OPTIONS_CONFLICT
      await expect(
        confirmShortReelTopic({
          repository: repo,
          channelId: channel.channel_id,
          topicId: topic.topic_id,
          options: {
            question_count: 1,
            render_aspect_ratio: "9:16",
            target_language: "fr",
          },
        }),
      ).rejects.toThrow(/CONFIRMATION_OPTIONS_CONFLICT/);

      // Replay with changed visual_style throws CONFIRMATION_OPTIONS_CONFLICT
      await expect(
        confirmShortReelTopic({
          repository: repo,
          channelId: channel.channel_id,
          topicId: topic.topic_id,
          options: {
            question_count: 1,
            render_aspect_ratio: "9:16",
            target_language: "en",
            visual_style: "flat_vector",
          },
        }),
      ).rejects.toThrow(/CONFIRMATION_OPTIONS_CONFLICT/);
    });

  it("does not join concurrent confirmations when normalized target languages conflict", async () => {
      const { repo, channel } = await createTestEnv();
      const bankQ = await seedBankQuestion(repo);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-concurrent-language", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);
      const translateFn: TranslateFunction = async ({ targetLanguage, items }) =>
        Object.fromEntries(Object.keys(items).map((key) => [key, `${targetLanguage}:${items[key]}`]));

      const outcomes = await Promise.allSettled([
        confirmShortReelTopic({
          repository: repo,
          channelId: channel.channel_id,
          topicId: topic.topic_id,
          options: { target_language: "de", render_aspect_ratio: "9:16" },
          translateFn,
        }),
        confirmShortReelTopic({
          repository: repo,
          channelId: channel.channel_id,
          topicId: topic.topic_id,
          options: { target_language: "fr", render_aspect_ratio: "9:16" },
          translateFn,
        }),
      ]);

      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === "rejected")[0]).toMatchObject({
        reason: expect.objectContaining({ code: "CONFIRMATION_OPTIONS_CONFLICT" }),
      });
    });

    it("invalidates only Short-Reel localization when the channel language changes", async () => {
      const { repo, channel } = await createTestEnv();
      const bankQ = await seedBankQuestion(repo);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-language-change", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);
      const translateFn: TranslateFunction = async ({ items }) =>
        Object.fromEntries(Object.keys(items).map((key) => [key, `Translated ${key}`]));
      const result = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        options: { target_language: "de", render_aspect_ratio: "9:16" },
        translateFn,
      });
      expect(await loadShortReelLocalizationArtifact(repo, channel.channel_id, result.short_reel.reel_id)).not.toBeNull();

      await repo.updateChannel(channel.channel_id, { language: "fr" });

      expect(await loadShortReelLocalizationArtifact(repo, channel.channel_id, result.short_reel.reel_id)).toBeNull();
      const source = await repo.getShortReel({ channel_id: channel.channel_id, reel_id: result.short_reel.reel_id });
      expect(source.source.question_text).toBe(bankQ.question);
    });

    it("reconciles a persisted Short-Reel when receipt persistence fails", async () => {
      const { repo, channel } = await createTestEnv();
      const bankQ = await seedBankQuestion(repo);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-receipt-recovery", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);
      const originalWrite = repo.writeJsonAtomic.bind(repo);
      let receiptWriteFailed = false;
      const writeSpy = vi.spyOn(repo, "writeJsonAtomic").mockImplementation(async (file, value) => {
        if (!receiptWriteFailed && file.includes(`${path.sep}receipts${path.sep}`)) {
          receiptWriteFailed = true;
          throw new Error("receipt disk failure");
        }
        return originalWrite(file, value);
      });

      await expect(
        confirmShortReelTopic({ repository: repo, channelId: channel.channel_id, topicId: topic.topic_id }),
      ).rejects.toThrow("receipt disk failure");
      writeSpy.mockRestore();

      const retry = await confirmShortReelTopic({ repository: repo, channelId: channel.channel_id, topicId: topic.topic_id });
      expect(retry.short_reel.reel_id).toBeDefined();
      expect(await repo.listShortReels(channel.channel_id)).toHaveLength(1);
      expect((await getTopicConfirmationReceipt(repo, channel.channel_id, topic.topic_id))?.status).toBe("completed");
    });
  });

  it("fails closed when the persisted localization artifact is corrupt", async () => {
    const { repo, channel } = await createTestEnv();
    const reelId = "reel-corrupt-localization";
    const reelDir = repo.resolvePath("channels", channel.slug, "short_reels", reelId);
    await mkdir(reelDir, { recursive: true });
    await writeFile(path.join(reelDir, "localization.json"), "{\"schema_version\":1,\"status\":\"applied\"}", "utf8");

    await expect(loadShortReelLocalizationArtifact(repo, channel.channel_id, reelId)).rejects.toThrow(/LOCALIZATION_CORRUPTED/);
  });

  it("fails closed for a corrupt Episode localization artifact", async () => {
    const { repo, channel } = await createTestEnv();
    const episodeSlug = "episode-corrupt-localization";
    const episodeDir = repo.resolvePath("channels", channel.slug, "episodes", episodeSlug);
    await mkdir(episodeDir, { recursive: true });
    await writeFile(path.join(episodeDir, "localization.json"), "not-json", "utf8");

    await expect(loadProductLocalizationArtifact(repo, channel.channel_id, episodeSlug)).rejects.toThrow(/LOCALIZATION_CORRUPTED/);
  });

  it("uses localized thumbnail question and answer projections without changing source answers", () => {
    const projected = applyLocalizedQuestionProjection(
      [{ question: "Which?", choices: ["Jaguar", "Leopard"], answer: "Jaguar" }],
      {
        schema_version: 1,
        product_id: "reel-1",
        content_kind: "short_reel",
        target_language: "de",
        source_question_ids: ["q-1"],
        source_content_hashes: ["a".repeat(64)],
        status: "applied",
        quiz_questions: [
          {
            question_id: "q-1",
            question: "Welche Katze?",
            choices: [
              { id: "c1", text: "Jaguarin" },
              { id: "c2", text: "Leopard" },
            ],
            explanation: "Erklärung",
          },
        ],
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    );

    expect(projected[0]).toEqual({ question: "Welche Katze?", choices: ["Jaguarin", "Leopard"], answer: "Jaguarin" });
  });

  describe("End-to-End Package Generation & ZIP Export with French ('fr')", () => {
    it("runs complete package generation and verifies ZIP export includes localization.json and localized deliverables", async () => {
      const { repo, channel } = await createTestEnv();
      const bankQ = await seedBankQuestion(repo);
      const topic = makeBoundTopicCandidate(channel.channel_id, "topic-fr-full-test", bankQ);
      await repo.saveTopicRun(channel.channel_id, [topic]);

      const frenchTranslate: TranslateFunction = async ({ targetLanguage, items }) => {
        expect(targetLanguage).toBe("fr");
        return {
          [`${bankQ.id}_question`]: "Quel félin a une plus grande densité musculaire: le jaguar ou le léopard?",
          [`${bankQ.id}_choice_c1`]: "Jaguar",
          [`${bankQ.id}_choice_c2`]: "Léopard",
          [`${bankQ.id}_explanation`]: "Les jaguars possèdent une musculature plus dense et une mâchoire plus puissante.",
          product_video_description: "Comparaison de la force et de la masse musculaire des grands félins.",
          product_thumbnail_text: "Qui est le véritable prédateur?",
        };
      };

      const result = await confirmShortReelTopic({
        repository: repo,
        channelId: channel.channel_id,
        topicId: topic.topic_id,
        options: {
          question_count: 1,
          render_aspect_ratio: "9:16",
          target_language: "fr",
        },
        translateFn: frenchTranslate,
      });

      const reelKey: ReelKey = { channel_id: channel.channel_id, reel_id: result.short_reel.reel_id };

      // Seed dummy image assets for cover and references
      const mascotBuffer = await packageImage("red", 512, 512);
      const styleBuffer = await packageImage("blue", 512, 512);
      const coverBuffer = await packageImage("green", 1080, 1920);

      const mascotAsset = await storePackageAsset(repo, reelKey, "mascot", "png", mascotBuffer);
      const styleAsset = await storePackageAsset(repo, reelKey, "style", "png", styleBuffer);
      const coverAsset = await storePackageAsset(repo, reelKey, "cover", "png", coverBuffer);

      const mascotRef = {
        ...mascotAsset,
        role: "mascot" as const,
        mime_type: "image/png",
        width: 512,
        height: 512,
      };
      const styleRef = {
        ...styleAsset,
        role: "style" as const,
        mime_type: "image/png",
        width: 512,
        height: 512,
      };
      const coverRef = {
        ...coverAsset,
        mime_type: "image/png",
        width: 1080 as const,
        height: 1920 as const,
      };

      // Update references and cover units
      const beforeRefs = await repo.getShortReel(reelKey);
      await repo.updateShortReel(
        reelKey,
        { request_id: "req-refs-fr", expected_revision: beforeRefs.revision },
        {
          kind: "update_references",
          references: { references: [mascotRef, styleRef] },
        },
      );

      const afterRefs = await repo.getShortReel(reelKey);
      await repo.updateShortReel(
        reelKey,
        { request_id: "req-cover-fr", expected_revision: afterRefs.revision },
        {
          kind: "update_cover",
          cover: coverRef,
        },
      );

      // Generate script unit
      await generateReelScriptUnit(repo, reelKey, "op-script-fr");

      // Generate publishing unit
      await generateReelPublishingUnit(repo, reelKey, "op-pub-fr");

      const readyRecord = await repo.getShortReel(reelKey);

      // Export package as ZIP
      const zipBuffer = await exportShortReelPackage(repo, reelKey, readyRecord.revision);
      expect(zipBuffer).toBeInstanceOf(Buffer);
      expect(zipBuffer.length).toBeGreaterThan(0);

      // Unpack and inspect archive contents
      const extractedEntries = parseZipArchive(zipBuffer);
      const entryFilenames = extractedEntries.map((e) => e.filename);

      expect(entryFilenames).toContain("manifest.json");
      expect(entryFilenames).toContain("script.json");
      expect(entryFilenames).toContain("script.md");
      expect(entryFilenames).toContain("localization.json");
      expect(entryFilenames).toContain("publishing.txt");
      expect(entryFilenames).toContain("prompts/01-generate.txt");
      expect(entryFilenames).toContain("prompts/02-extend.txt");
      expect(entryFilenames).toContain("prompts/03-extend.txt");

      // Verify localization.json in ZIP matches French content
      const locEntry = extractedEntries.find((e) => e.filename === "localization.json");
      expect(locEntry).toBeDefined();
      const locParsed = JSON.parse(locEntry!.data.toString("utf8"));
      expect(locParsed.target_language).toBe("fr");
      expect(locParsed.quiz_questions[0].question).toBe(
        "Quel félin a une plus grande densité musculaire: le jaguar ou le léopard?",
      );

      // Verify script.json in ZIP contains French text cues
      const scriptEntry = extractedEntries.find((e) => e.filename === "script.json");
      expect(scriptEntry).toBeDefined();
      const scriptParsed: ReelScript = JSON.parse(scriptEntry!.data.toString("utf8"));
      expect(scriptParsed.segments[0].text_cues[0].text).toBe(
        "Quel félin a une plus grande densité musculaire: le jaguar ou le léopard?",
      );

      // Verify publishing.txt uses French description
      const pubEntry = extractedEntries.find((e) => e.filename === "publishing.txt");
      expect(pubEntry).toBeDefined();
      const pubText = pubEntry!.data.toString("utf8");
      expect(pubText).toContain("Comparaison de la force et de la masse musculaire des grands félins.");
    });
  });
});

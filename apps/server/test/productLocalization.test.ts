import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BankQuestionSchema, QuizQuestionSchema, type QuizQuestion } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import {
  normalizeTargetLanguage,
  localizeProductContent,
  saveProductLocalizationArtifact,
  loadProductLocalizationArtifact,
} from "../src/quiz/bank/localization/productLocalization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

describe("Stage 4: Product Localization and English Source Invariants", () => {
  const roots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true }).catch(() => {})));
  });

  async function createFixture() {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage4-loc-test-"));
    roots.push(root);

    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");

    const repo = new RepositoryService(projectRoot, root);
    await repo.ensureBootstrap();

    const channel = await repo.createChannel({
      name: "Localization Test Channel",
      description: "Testing product localization",
      target_audience: "General",
      language: "en",
      market: "Global",
      dna_mode: "example",
    });

    return { repo, channel, root };
  }

  function makeQuizQuestion(id: string, overrides: Partial<QuizQuestion> = {}): QuizQuestion {
    return QuizQuestionSchema.parse({
      id,
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: `English question text for ${id}?`,
      explanation: `English explanation for ${id}.`,
      choices: [
        { id: "choice_a", text: "Alpha" },
        { id: "choice_b", text: "Beta" },
        { id: "choice_c", text: "Gamma" },
      ],
      correct_choice_id: "choice_a",
      ...overrides,
    });
  }

  describe("Target Language Normalization and Rejection", () => {
    it("normalizes regional inputs correctly (de-DE to de, fr-FR to fr)", () => {
      expect(normalizeTargetLanguage("de-DE")).toBe("de");
      expect(normalizeTargetLanguage("de_DE")).toBe("de");
      expect(normalizeTargetLanguage("fr-FR")).toBe("fr");
      expect(normalizeTargetLanguage("es-MX")).toBe("es");
      expect(normalizeTargetLanguage("en-US")).toBe("en");
      expect(normalizeTargetLanguage("en")).toBe("en");
    });

    it("strictly rejects vi, vi-VN, and unknown languages with UNSUPPORTED_TARGET_LANGUAGE", () => {
      expect(() => normalizeTargetLanguage("vi")).toThrow(/UNSUPPORTED_TARGET_LANGUAGE/);
      expect(() => normalizeTargetLanguage("vi-VN")).toThrow(/UNSUPPORTED_TARGET_LANGUAGE/);
      expect(() => normalizeTargetLanguage("vi_VN")).toThrow(/UNSUPPORTED_TARGET_LANGUAGE/);
      expect(() => normalizeTargetLanguage("xyz_unknown")).toThrow(/UNSUPPORTED_TARGET_LANGUAGE/);
      expect(() => normalizeTargetLanguage("pirate")).toThrow(/UNSUPPORTED_TARGET_LANGUAGE/);
    });
  });

  describe("English Identity Localization (Zero Provider Calls)", () => {
    it("makes zero translation calls for 'en' target and outputs exact English source strings", async () => {
      const q1 = makeQuizQuestion("q1");
      const providerSpy = vi.fn();

      const result = await localizeProductContent({
        targetLanguage: "en",
        productId: "ep_test_001",
        contentKind: "episode",
        sourceQuestionIds: ["q1"],
        sourceContentHashes: ["0".repeat(64)],
        quizQuestions: [q1],
        videoDescription: "An exciting quiz episode about science.",
        thumbnailText: "CAN YOU PASS?",
        translateFn: providerSpy,
      });

      expect(providerSpy).not.toHaveBeenCalled();
      expect(result.status).toBe("applied");
      expect(result.target_language).toBe("en");
      expect(result.quiz_questions[0].question).toBe(q1.question);
      expect(result.video_description).toBe("An exciting quiz episode about science.");
      expect(result.thumbnail_text).toBe("CAN YOU PASS?");
    });
  });

  describe("Non-English Product Localization and Choice Integrity", () => {
    it.each(["q1_question", "q1_explanation", "product_video_description", "product_thumbnail_text"])(
      "rejects a missing required translation: %s",
      async (missingKey) => {
        await expect(
          localizeProductContent({
            targetLanguage: "de",
            productId: "incomplete-translation",
            contentKind: "episode",
            sourceQuestionIds: ["q1"],
            sourceContentHashes: ["0".repeat(64)],
            quizQuestions: [makeQuizQuestion("q1")],
            videoDescription: "English description",
            thumbnailText: "English thumbnail",
            translateFn: ({ items }) =>
              Promise.resolve(
                Object.fromEntries(
                  Object.entries(items)
                    .filter(([key]) => key !== missingKey)
                    .map(([key, value]) => [key, `[de] ${value}`]),
                ),
              ),
          }),
        ).rejects.toThrow(/LOCALIZATION_CONTENT_INCOMPLETE/);
      },
    );

    it("localizes approved display fields while preserving exact choice IDs and order", async () => {
      const q1 = makeQuizQuestion("q1");

      const mockTranslateFn = vi.fn().mockImplementation(({ targetLanguage, items }) => {
        // Items is a dictionary of keys to English strings
        const translated: Record<string, string> = {};
        for (const [key, text] of Object.entries(items as Record<string, string>)) {
          translated[key] = `[${targetLanguage}] ${text}`;
        }
        return translated;
      });

      const result = await localizeProductContent({
        targetLanguage: "de-DE",
        productId: "ep_de_001",
        contentKind: "episode",
        sourceQuestionIds: ["q1"],
        sourceContentHashes: ["0".repeat(64)],
        quizQuestions: [q1],
        videoDescription: "English description",
        thumbnailText: "TOP SECRET",
        translateFn: mockTranslateFn,
      });

      expect(result.target_language).toBe("de");
      expect(result.status).toBe("applied");
      expect(result.quiz_questions[0].question).toContain("[de] English question text for q1?");
      expect(result.quiz_questions[0].choices).toHaveLength(3);
      expect(result.quiz_questions[0].choices[0].id).toBe("choice_a");
      expect(result.quiz_questions[0].choices[0].text).toContain("[de] Alpha");
      expect(result.quiz_questions[0].choices[1].id).toBe("choice_b");
      expect(result.video_description).toContain("[de] English description");
      expect(result.thumbnail_text).toContain("[de] TOP SECRET");
    });

    it("rejects localization if provider drops, duplicates, or corrupts choice IDs", async () => {
      const q1 = makeQuizQuestion("q1");

      const corruptedTranslateFn = vi.fn().mockResolvedValue({
        q1_question: "Welche Farbe?",
        q1_choice_choice_a: "Rot",
        // Notice: choice_b, choice_c missing!
      });

      await expect(
        localizeProductContent({
          targetLanguage: "de",
          productId: "ep_corrupt_001",
          contentKind: "episode",
          sourceQuestionIds: ["q1"],
          sourceContentHashes: ["0".repeat(64)],
          quizQuestions: [q1],
          translateFn: corruptedTranslateFn,
        }),
      ).rejects.toThrow(/LOCALIZATION_CHOICE_INTEGRITY_FAILED/);
    });
  });

  describe("Zero Bank Translation Writeback Guarantee", () => {
    it("ensures Question Bank files on disk remain byte-for-byte identical after non-English localization", async () => {
      const { repo, channel } = await createFixture();

      const bankQ = BankQuestionSchema.parse({
        id: "q_bank_loc_1",
        format: "multiple_choice",
        archetype_id: "deep_trivia",
        domain_id: "science",
        subtopic_id: "space",
        language: "English",
        status: "approved",
        age_band: "7-9",
        question: "What is the red planet?",
        explanation: "Mars is red because of iron oxide.",
        choices: [
          { id: "c1", text: "Mars", is_correct: true },
          { id: "c2", text: "Venus", is_correct: false },
          { id: "c3", text: "Jupiter", is_correct: false },
        ],
        correct_choice_id: "c1",
      });

      await repo.saveQuestionBankQuestion(bankQ);

      // Calculate byte hashes of bank files before localization
      const indexFile = repo.getQuestionBankPath("index.json");
      const batchFile = repo.getQuestionBankPath("deep_trivia", "science", "space.json");

      const indexHashBefore = createHash("sha256")
        .update(await readFile(indexFile))
        .digest("hex");
      const batchHashBefore = createHash("sha256")
        .update(await readFile(batchFile))
        .digest("hex");

      // Perform non-English localization of product
      const q1 = makeQuizQuestion("q_bank_loc_1");
      const mockTranslateFn = vi.fn().mockImplementation(({ items }) => {
        const res: Record<string, string> = {};
        for (const [k, v] of Object.entries(items as Record<string, string>)) {
          res[k] = `[fr] ${v}`;
        }
        return res;
      });

      const artifact = await localizeProductContent({
        targetLanguage: "fr",
        productId: "ep_fr_loc_01",
        contentKind: "episode",
        sourceQuestionIds: ["q_bank_loc_1"],
        sourceContentHashes: ["0".repeat(64)],
        quizQuestions: [q1],
        translateFn: mockTranslateFn,
      });

      // Save localization artifact to episode directory
      const episodeDir = repo.resolvePath("channels", channel.slug, "episodes", "ep-fr-test");
      await mkdir(episodeDir, { recursive: true });
      await saveProductLocalizationArtifact(repo, channel.channel_id, "ep-fr-test", artifact);

      // Verify artifact was written
      const loaded = await loadProductLocalizationArtifact(repo, channel.channel_id, "ep-fr-test");
      expect(loaded).toBeDefined();
      expect(loaded?.target_language).toBe("fr");

      // Assert Bank batches and index are byte-identical (NO TRANSLATION WRITEBACK!)
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

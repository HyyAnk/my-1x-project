import { describe, expect, it } from "vitest";
import {
  BankChoiceSchema,
  BankGameplayArchetypeIdSchema,
  BankIndexSchema,
  BankQuestionSchema,
  BankSubtopicBatchSchema,
  BankTaxonomySchema,
  BankTranslationContentSchema,
  normalizeLanguageCode,
  isSameLanguage,
  getLanguageDisplayLabel,
  type BankQuestion,
  type BankSubtopicBatch,
} from "@studio/shared";

describe("Question Bank Schemas", () => {
  it("validates BankGameplayArchetypeIdSchema with all 8 archetypes", () => {
    const validArchetypes = [
      "deep_trivia",
      "visual_spotting",
      "verdict_fact_myth",
      "versus_faceoff",
      "visual_identification",
      "speed_blitz",
      "mystery_reveal",
      "clue_deduction",
    ];

    for (const id of validArchetypes) {
      expect(BankGameplayArchetypeIdSchema.safeParse(id).success).toBe(true);
    }

    expect(BankGameplayArchetypeIdSchema.safeParse("unknown_gameplay").success).toBe(false);
  });

  it("validates a true_false verdict_fact_myth question", () => {
    const question: BankQuestion = {
      id: "VFM-NAT-OCN-0001",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "ocean_giants",
      question: "Cá voi xanh là sinh vật lớn nhất từng tồn tại trên Trái Đất, đúng hay sai?",
      format: "true_false",
      choices: [
        { id: "A", text: "ĐÚNG", is_correct: true },
        { id: "B", text: "SAI", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Cá voi xanh có thể dài hơn 30 mét và nặng tới 190 tấn.",
      fun_fact: "Trái tim của cá voi xanh to bằng một chiếc ô tô nhỏ.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "A massive realistic blue whale swimming deep underwater, cinematic lighting",
        aspect_ratio: "16:9",
      },
      age_band: "family",
      difficulty: 2,
      tags: ["ocean", "blue_whale"],
      status: "approved",
    };

    const parsed = BankQuestionSchema.safeParse(question);
    expect(parsed.success).toBe(true);
  });

  it("validates a speed_blitz tricky riddle question", () => {
    const question: BankQuestion = {
      id: "SPB-LOG-TRK-0001",
      archetype_id: "speed_blitz",
      domain_id: "logic_puzzles",
      subtopic_id: "tricky_riddles",
      question: "Một chiếc gậy có 2 đầu. Một nửa chiếc gậy có mấy đầu?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "1 đầu", is_correct: false },
        { id: "B", text: "2 đầu", is_correct: true },
        { id: "C", text: "Không có đầu nào", is_correct: false },
      ],
      correct_choice_id: "B",
      explanation: "Bẻ gãy nửa chiếc gậy thì đoạn gậy đó vẫn có đủ 2 đầu!",
      fun_fact: "",
      age_band: "family",
      difficulty: 3,
      thinking_seconds: 4.5,
      tags: ["riddle", "trick_question"],
      status: "approved",
    };

    const parsed = BankQuestionSchema.safeParse(question);
    expect(parsed.success).toBe(true);
  });

  it("fails if correct_choice_id does not exist in choices", () => {
    const invalidQuestion = {
      id: "ERR-001",
      archetype_id: "verdict_fact_myth",
      domain_id: "test",
      subtopic_id: "test",
      question: "Test question?",
      format: "true_false",
      choices: [
        { id: "A", text: "ĐÚNG" },
        { id: "B", text: "SAI" },
      ],
      correct_choice_id: "C", // Does not exist!
      explanation: "Explanation",
      tags: [],
      status: "approved",
    };

    const result = BankQuestionSchema.safeParse(invalidQuestion);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('correct_choice_id "C" must exist in choices');
    }
  });

  it("validates a complete BankSubtopicBatch", () => {
    const batch: BankSubtopicBatch = {
      schema_version: 2,
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "ocean_giants",
      subtopic_title: "Những gã khổng lồ đại dương",
      updated_at: new Date().toISOString(),
      questions: [
        {
          id: "VFM-NAT-OCN-0001",
          archetype_id: "verdict_fact_myth",
          domain_id: "nature_animals",
          subtopic_id: "ocean_giants",
          question: "Bạch tuộc có 3 trái tim, đúng hay sai?",
          format: "true_false",
          choices: [
            { id: "A", text: "ĐÚNG", is_correct: true },
            { id: "B", text: "SAI", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Bạch tuộc có 2 tim bơm qua mang và 1 tim bơm toàn thân.",
          fun_fact: "",
          tags: ["octopus", "ocean"],
          status: "approved",
          age_band: "family",
          difficulty: 2,
        },
      ],
    };

    const parsed = BankSubtopicBatchSchema.safeParse(batch);
    expect(parsed.success).toBe(true);
  });

  it("validates BankTaxonomySchema and BankIndexSchema", () => {
    const taxonomy = {
      schema_version: 2,
      updated_at: new Date().toISOString(),
      domains: [
        {
          id: "nature_animals",
          title: "Tự nhiên & Động vật kỳ thú",
          description: "Khám phá thế giới động thực vật hoang dã",
          icon: "PawPrint",
          subtopics: [
            {
              id: "ocean_giants",
              title: "Sinh vật đại dương khổng lồ",
              description: "Cá voi, mực khổng lồ, cá mập megalodon",
            },
          ],
        },
      ],
    };

    const parsedTaxonomy = BankTaxonomySchema.safeParse(taxonomy);
    expect(parsedTaxonomy.success).toBe(true);

    const index = {
      schema_version: 2,
      target_total: 10000,
      current_total: 150,
      by_archetype: {
        verdict_fact_myth: 100,
        speed_blitz: 50,
      },
      by_domain: {
        nature_animals: 100,
        logic_puzzles: 50,
      },
      updated_at: new Date().toISOString(),
    };

    const parsedIndex = BankIndexSchema.safeParse(index);
    expect(parsedIndex.success).toBe(true);
  });

  it("validates actual seeded files from .quiz-studio/question_bank on disk", async () => {
    const { readFile } = await import("node:fs/promises");
    const { existsSync } = await import("node:fs");
    const path = await import("node:path");

    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    const bankRoot = path.resolve(curr, ".quiz-studio", "question_bank");

    // 1. taxonomy.json
    const taxRaw = JSON.parse(await readFile(path.join(bankRoot, "taxonomy.json"), "utf8"));
    const taxParsed = BankTaxonomySchema.safeParse(taxRaw);
    expect(taxParsed.success).toBe(true);
    if (taxParsed.success) {
      expect(taxParsed.data.domains.length).toBe(8);
    }

    // 2. index.json
    const indexRaw = JSON.parse(await readFile(path.join(bankRoot, "index.json"), "utf8"));
    const indexParsed = BankIndexSchema.safeParse(indexRaw);
    expect(indexParsed.success).toBe(true);

    // 3. ocean_giants.json
    const oceanRaw = JSON.parse(await readFile(path.join(bankRoot, "verdict_fact_myth", "nature_animals", "ocean_giants.json"), "utf8"));
    const oceanParsed = BankSubtopicBatchSchema.safeParse(oceanRaw);
    expect(oceanParsed.success).toBe(true);
    if (oceanParsed.success) {
      expect(oceanParsed.data.questions.length).toBeGreaterThanOrEqual(5);
    }

    // 4. tricky_riddles.json
    const riddleRaw = JSON.parse(await readFile(path.join(bankRoot, "speed_blitz", "logic_puzzles", "tricky_riddles.json"), "utf8"));
    const riddleParsed = BankSubtopicBatchSchema.safeParse(riddleRaw);
    expect(riddleParsed.success).toBe(true);
    if (riddleParsed.success) {
      expect(riddleParsed.data.questions.length).toBeGreaterThanOrEqual(5);
    }
  });

  describe("Multilingual Transcreation Contracts & Language Utilities", () => {
    it("validates a BankQuestion with localized translations", () => {
      const translation = {
        language: "es",
        question: "¿Es la ballena azul el animal más grande que ha existido jamás?",
        choices: [
          { id: "A", text: "VERDADERO" },
          { id: "B", text: "FALSO" },
        ],
        explanation: "La ballena azul puede medir más de 30 metros.",
        fun_fact: "El corazón de una ballena azul pesa tanto como un automóvil.",
        verified: true,
      };

      const parsedTrans = BankTranslationContentSchema.safeParse(translation);
      expect(parsedTrans.success).toBe(true);

      const questionWithTrans: BankQuestion = {
        id: "TEST-MULTILINGUAL-01",
        archetype_id: "verdict_fact_myth",
        domain_id: "nature_animals",
        subtopic_id: "ocean_giants",
        language: "en",
        question: "Is the blue whale the largest creature ever?",
        format: "true_false",
        choices: [
          { id: "A", text: "TRUE", is_correct: true },
          { id: "B", text: "FALSE", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "The blue whale can reach 30 meters.",
        status: "approved",
        translations: {
          es: parsedTrans.data!,
        },
      };

      const parsedQuestion = BankQuestionSchema.safeParse(questionWithTrans);
      expect(parsedQuestion.success).toBe(true);
      if (parsedQuestion.success) {
        expect(parsedQuestion.data.language).toBe("en");
        expect(parsedQuestion.data.translations?.es?.question).toContain("ballena azul");
        expect(parsedQuestion.data.translations?.es?.verified).toBe(true);
      }

      // Normalization helpers
      expect(normalizeLanguageCode("Vietnamese")).toBe("en");
      expect(normalizeLanguageCode("Tiếng Việt")).toBe("en");
      expect(normalizeLanguageCode("ENGLISH")).toBe("en");
      expect(normalizeLanguageCode("Spanish")).toBe("es");
      expect(normalizeLanguageCode("Japanese")).toBe("ja");
      expect(isSameLanguage("spanish", "ES")).toBe(true);
      expect(isSameLanguage("en", "Vietnamese")).toBe(true);
      expect(getLanguageDisplayLabel("es")).toContain("Español");
    });

    it("verifies optional language falls back to 'en' via normalizeLanguageCode", () => {
      const rawQuestion = {
        id: "MINIMAL-QUESTION",
        archetype_id: "speed_blitz",
        domain_id: "logic_puzzles",
        subtopic_id: "tricky_riddles",
        question: "Quick riddle?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "A", is_correct: true },
          { id: "B", text: "B", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Short explanation.",
      };

      const parsed = BankQuestionSchema.parse(rawQuestion);
      expect(parsed.language).toBeUndefined();
      expect(normalizeLanguageCode(parsed.language)).toBe("en");
      expect(parsed.translations).toBeUndefined();
    });
  });
});

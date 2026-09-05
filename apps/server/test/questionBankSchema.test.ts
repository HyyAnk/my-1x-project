import { describe, expect, it } from "vitest";
import {
  BankChoiceSchema,
  BankGameplayArchetypeIdSchema,
  BankIndexSchema,
  BankQuestionSchema,
  BankSubtopicBatchSchema,
  BankTaxonomySchema,
  BankTranslationContentSchema,
  bankRequiredChoiceCountForArchetype,
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
      "verdict_true_false",
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

  it("validates a true_false verdict_fact_myth question with exactly 2 choices", () => {
    const question: BankQuestion = {
      id: "VFM-NAT-OCN-0001",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "ocean_giants",
      question: "The blue whale is the largest creature ever known to have lived on Earth. True or False?",
      format: "true_false",
      choices: [
        { id: "A", text: "True", is_correct: true },
        { id: "B", text: "False", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Blue whales can exceed 30 meters in length and weigh up to 190 metric tons.",
      fun_fact: "A blue whale heart is roughly the size of a small car.",
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

  it("validates a speed_blitz tricky riddle question with exactly 3 choices", () => {
    const question: BankQuestion = {
      id: "SPB-LOG-TRK-0001",
      archetype_id: "speed_blitz",
      domain_id: "logic_puzzles",
      subtopic_id: "tricky_riddles",
      question: "A wooden stick has 2 ends. How many ends does half a stick have?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "1 end", is_correct: false },
        { id: "B", text: "2 ends", is_correct: true },
        { id: "C", text: "0 ends", is_correct: false },
      ],
      correct_choice_id: "B",
      explanation: "When you break a stick in half, the broken piece still has 2 ends!",
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

  describe("Strict Choice Count Enforcement per Archetype", () => {
    it("returns expected count via bankRequiredChoiceCountForArchetype helper", () => {
      expect(bankRequiredChoiceCountForArchetype("verdict_true_false")).toBe(2);
      expect(bankRequiredChoiceCountForArchetype("verdict_fact_myth")).toBe(2);
      expect(bankRequiredChoiceCountForArchetype("versus_faceoff")).toBe(2);

      expect(bankRequiredChoiceCountForArchetype("deep_trivia")).toBe(3);
      expect(bankRequiredChoiceCountForArchetype("visual_spotting")).toBe(3);
      expect(bankRequiredChoiceCountForArchetype("visual_identification")).toBe(3);
      expect(bankRequiredChoiceCountForArchetype("speed_blitz")).toBe(3);
      expect(bankRequiredChoiceCountForArchetype("mystery_reveal")).toBe(3);
      expect(bankRequiredChoiceCountForArchetype("clue_deduction")).toBe(3);
    });

    it("rejects 2-choice archetypes when given 3 choices", () => {
      const invalid2Choice = {
        id: "ERR-2CH-001",
        archetype_id: "versus_faceoff",
        domain_id: "nature_animals",
        subtopic_id: "predators",
        question: "Who is faster: Cheetah or Peregrine Falcon?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "Cheetah", is_correct: false },
          { id: "B", text: "Peregrine Falcon", is_correct: true },
          { id: "C", text: "Golden Eagle", is_correct: false },
        ],
        correct_choice_id: "B",
        explanation: "Peregrine falcons reach over 240 mph during hunting dives.",
        status: "approved",
        tags: [],
      };

      const result = BankQuestionSchema.safeParse(invalid2Choice);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Archetype "versus_faceoff" requires exactly 2 choices, received 3');
      }
    });

    it("rejects 3-choice archetypes when given 2 choices", () => {
      const invalid3Choice = {
        id: "ERR-3CH-001",
        archetype_id: "deep_trivia",
        domain_id: "science_tech",
        subtopic_id: "space_universe",
        question: "Which planet has the most volcanic activity in our solar system?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "Io (Moon of Jupiter)", is_correct: true },
          { id: "B", text: "Venus", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Jupiter's moon Io has hundreds of continuously erupting volcanoes.",
        status: "approved",
        tags: [],
      };

      const result = BankQuestionSchema.safeParse(invalid3Choice);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Archetype "deep_trivia" requires exactly 3 choices, received 2');
      }
    });

    it("strictly rejects 4 choices on deep_trivia and visual_spotting", () => {
      const deepTrivia4Choices = {
        id: "ERR-DT-4CH",
        archetype_id: "deep_trivia",
        domain_id: "science_tech",
        subtopic_id: "space_universe",
        question: "Which celestial body possesses the strongest magnetic field?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "Magnetar", is_correct: true },
          { id: "B", text: "Pulsar", is_correct: false },
          { id: "C", text: "White Dwarf", is_correct: false },
          { id: "D", text: "Neutron Star", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Magnetars are a type of neutron star with an extremely powerful magnetic field.",
        status: "approved",
        tags: [],
      };

      const resultDT = BankQuestionSchema.safeParse(deepTrivia4Choices);
      expect(resultDT.success).toBe(false);

      const visualSpotting4Choices = {
        id: "ERR-VS-4CH",
        archetype_id: "visual_spotting",
        domain_id: "nature_animals",
        subtopic_id: "camouflage",
        question: "Spot the camouflaged snow leopard in these mountain photos.",
        format: "odd_one_out",
        choices: [
          { id: "A", text: "Cliff ledge", is_correct: true },
          { id: "B", text: "Boulder field", is_correct: false },
          { id: "C", text: "Snow drift", is_correct: false },
          { id: "D", text: "Ridge crest", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "The leopard is blending perfectly into the rocky cliff ledge.",
        status: "approved",
        tags: [],
      };

      const resultVS = BankQuestionSchema.safeParse(visualSpotting4Choices);
      expect(resultVS.success).toBe(false);
    });

    it("rejects translations with 4 choices", () => {
      const translation4Choices = {
        language: "es",
        question: "¿Pregunta de prueba?",
        choices: [
          { id: "A", text: "Opción A" },
          { id: "B", text: "Opción B" },
          { id: "C", text: "Opción C" },
          { id: "D", text: "Opción D" },
        ],
        explanation: "Explicación",
        fun_fact: "",
        verified: true,
      };

      const parsedTrans = BankTranslationContentSchema.safeParse(translation4Choices);
      expect(parsedTrans.success).toBe(false);
    });
  });

  it("fails if correct_choice_id does not exist in choices", () => {
    const invalidQuestion = {
      id: "ERR-001",
      archetype_id: "verdict_fact_myth",
      domain_id: "test",
      subtopic_id: "test",
      question: "Test statement ending with True or False?",
      format: "true_false",
      choices: [
        { id: "A", text: "True" },
        { id: "B", text: "False" },
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
      subtopic_title: "Ocean Giants",
      updated_at: new Date().toISOString(),
      questions: [
        {
          id: "VFM-NAT-OCN-0001",
          archetype_id: "verdict_fact_myth",
          domain_id: "nature_animals",
          subtopic_id: "ocean_giants",
          question: "An octopus has three hearts. True or False?",
          format: "true_false",
          choices: [
            { id: "A", text: "True", is_correct: true },
            { id: "B", text: "False", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Two hearts pump blood to the gills, while a third circulates it to the rest of the body.",
          fun_fact: "Octopus blood is blue because it contains hemocyanin.",
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
          title: "Nature & Animals",
          description: "Wildlife and biodiversity wonders",
          icon: "PawPrint",
          subtopics: [
            {
              id: "ocean_giants",
              title: "Ocean Giants",
              description: "Whales, colossal squid, and marine wonders",
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

  it("validates taxonomy.json and index.json from .quiz-studio/question_bank on disk", async () => {
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
      expect(taxParsed.data.domains.length).toBeGreaterThanOrEqual(14);
    }

    // 2. index.json
    const indexRaw = JSON.parse(await readFile(path.join(bankRoot, "index.json"), "utf8"));
    const indexParsed = BankIndexSchema.safeParse(indexRaw);
    expect(indexParsed.success).toBe(true);
    if (indexParsed.success) {
      expect(indexParsed.data.target_total).toBeGreaterThanOrEqual(20000);
      expect(indexParsed.data.current_total).toBeGreaterThanOrEqual(0);
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
        question: "Quick reflex riddle?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "Option A", is_correct: true },
          { id: "B", text: "Option B", is_correct: false },
          { id: "C", text: "Option C", is_correct: false },
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

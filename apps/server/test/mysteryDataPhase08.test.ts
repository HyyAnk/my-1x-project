import { describe, expect, it } from "vitest";
import {
  BankQuestionSchema,
  bankRequiredChoiceCountForArchetype,
  preferredAutoLayout,
  QuizQuestionSchema,
  QuizSceneContentSchema,
  resolveQuizLayout,
  type BankQuestion,
  type Episode,
  type QuizQuestion,
  type Scene,
} from "@studio/shared";
import { parseBatchGenerationOutput } from "../src/quiz/bank/prompts/batchPromptOutputParser.js";
import {
  convertBankQuestionToQuizQuestion,
  convertBankQuestionToQuizQuestionLossless,
} from "../src/quiz/bank/bridge/bankQuestionConverter.js";
import { assertQuizSceneChoicePolicy } from "../src/repository/scenes.js";

describe("Phase 08 - Mystery Single-Answer Domain & Data Flow", () => {
  describe("QuizQuestionSchema single_reveal validation", () => {
    it("accepts a single_reveal question with exactly 1 choice and matching correct_choice_id", () => {
      const valid: QuizQuestion = {
        id: "q_mystery_1",
        number: 1,
        format: "image_guess",
        answer_mode: "single_reveal",
        difficulty: 1,
        question: "Who is this mystery figure?",
        choices: [{ id: "c_custom_99", text: "Leonardo da Vinci" }],
        correct_choice_id: "c_custom_99",
        explanation: "He painted the Mona Lisa.",
        fun_fact: "He wrote in mirror-image cursive.",
        source_ids: ["src1"],
        visual_opportunity: "Renaissance workshop",
        validation: {
          semantic_status: "validated",
          source_coverage: true,
          fact_locked: true,
        },
      };

      const result = QuizQuestionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts non-conventional choice IDs for single_reveal questions", () => {
      const valid: QuizQuestion = {
        id: "q_mystery_custom_id",
        number: 2,
        format: "multiple_choice",
        answer_mode: "single_reveal",
        difficulty: 2,
        question: "Identify the hidden constellation.",
        choices: [{ id: "star_cluster_alpha", text: "Pleiades" }],
        correct_choice_id: "star_cluster_alpha",
        explanation: "Also known as the Seven Sisters.",
        fun_fact: "Visible to the naked eye.",
        source_ids: ["src2"],
        visual_opportunity: "Night sky nebula",
        validation: {
          semantic_status: "validated",
          source_coverage: true,
          fact_locked: true,
        },
      };

      const result = QuizQuestionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects single_reveal with 0 choices", () => {
      const invalid = {
        id: "q_bad_0",
        number: 1,
        format: "image_guess",
        answer_mode: "single_reveal",
        difficulty: 1,
        question: "Mystery question?",
        choices: [],
        correct_choice_id: "c1",
        explanation: "Exp",
        fun_fact: "Fact",
        source_ids: ["src1"],
        visual_opportunity: "Vis",
        validation: {
          semantic_status: "validated",
          source_coverage: true,
          fact_locked: true,
        },
      };

      const result = QuizQuestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some((i) => i.message.includes("Single reveal requires exactly one choice"))).toBe(true);
    });

    it("rejects single_reveal with multiple choices (distractors present)", () => {
      const invalid = {
        id: "q_bad_multi",
        number: 1,
        format: "image_guess",
        answer_mode: "single_reveal",
        difficulty: 1,
        question: "Mystery question?",
        choices: [
          { id: "c1", text: "Answer 1" },
          { id: "c2", text: "Distractor 2" },
        ],
        correct_choice_id: "c1",
        explanation: "Exp",
        fun_fact: "Fact",
        source_ids: ["src1"],
        visual_opportunity: "Vis",
        validation: {
          semantic_status: "validated",
          source_coverage: true,
          fact_locked: true,
        },
      };

      const result = QuizQuestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some((i) => i.message.includes("Single reveal requires exactly one choice"))).toBe(true);
    });

    it("rejects single_reveal when correct_choice_id does not match the single choice", () => {
      const invalid = {
        id: "q_bad_id",
        number: 1,
        format: "image_guess",
        answer_mode: "single_reveal",
        difficulty: 1,
        question: "Mystery question?",
        choices: [{ id: "c_real", text: "Real Answer" }],
        correct_choice_id: "c_mismatched",
        explanation: "Exp",
        fun_fact: "Fact",
        source_ids: ["src1"],
        visual_opportunity: "Vis",
        validation: {
          semantic_status: "validated",
          source_coverage: true,
          fact_locked: true,
        },
      };

      const result = QuizQuestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some((i) => i.message.includes("Canonical answer must reference"))).toBe(true);
    });

    it("rejects single_reveal with incompatible formats like true_false or odd_one_out", () => {
      const invalid = {
        id: "q_bad_format",
        number: 1,
        format: "true_false",
        answer_mode: "single_reveal",
        difficulty: 1,
        question: "Mystery question?",
        choices: [{ id: "c1", text: "True" }],
        correct_choice_id: "c1",
        explanation: "Exp",
        fun_fact: "Fact",
        source_ids: ["src1"],
        visual_opportunity: "Vis",
        validation: {
          semantic_status: "validated",
          source_coverage: true,
          fact_locked: true,
        },
      };

      const result = QuizQuestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some((i) => i.message.includes("Single reveal answer mode is invalid with format"))).toBe(true);
    });
  });

  describe("Bank archetype choice counts & BankQuestionSchema", () => {
    it("enforces required count of 1 for mystery_reveal archetype", () => {
      expect(bankRequiredChoiceCountForArchetype("mystery_reveal")).toBe(1);
      expect(bankRequiredChoiceCountForArchetype("deep_trivia")).toBe(3);
      expect(bankRequiredChoiceCountForArchetype("verdict_true_false")).toBe(2);
      expect(bankRequiredChoiceCountForArchetype("versus_faceoff")).toBe(2);
    });

    it("validates a BankQuestion for mystery_reveal with 1 choice", () => {
      const bankItem: BankQuestion = {
        id: "bq_mystery_1",
        archetype_id: "mystery_reveal",
        domain_id: "history",
        subtopic_id: "ancient_monuments",
        language: "en",
        format: "image_guess",
        difficulty: 1,
        question: "What ancient wonder stood here?",
        choices: [{ id: "arch_1", text: "Colossus of Rhodes" }],
        correct_choice_id: "arch_1",
        explanation: "It was a statue of the Greek sun-god Helios.",
        fun_fact: "It was roughly the same height as the Statue of Liberty.",
        source_ids: ["src_rhodes"],
        visual_opportunity: "Ancient Rhodes harbor",
      };

      const result = BankQuestionSchema.safeParse(bankItem);
      expect(result.success).toBe(true);
    });

    it("rejects choice_illustration for mystery_reveal questions", () => {
      const bankItem = {
        id: "bq_mystery_ill",
        archetype_id: "mystery_reveal",
        domain_id: "history",
        subtopic_id: "ancient_monuments",
        language: "en",
        format: "image_guess",
        difficulty: 1,
        question: "What ancient wonder stood here?",
        choices: [{ id: "arch_1", text: "Colossus of Rhodes" }],
        correct_choice_id: "arch_1",
        explanation: "It was a statue of the Greek sun-god Helios.",
        fun_fact: "It was roughly the same height as the Statue of Liberty.",
        source_ids: ["src_rhodes"],
        visual_opportunity: "Ancient Rhodes harbor",
        visual_spec: {
          intent: "choice_illustration",
          prompt: "Statue of Rhodes",
          aspect_ratio: "16:9",
        },
      };

      const result = BankQuestionSchema.safeParse(bankItem);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some((i) => i.message.includes("does not support choice illustrations"))).toBe(true);
    });

    it("enforces matching translated choice IDs for mystery questions", () => {
      const bankItem = {
        id: "bq_mystery_trans",
        archetype_id: "mystery_reveal",
        domain_id: "history",
        subtopic_id: "ancient_monuments",
        language: "en",
        format: "image_guess",
        difficulty: 1,
        question: "What ancient wonder stood here?",
        choices: [{ id: "arch_1", text: "Colossus of Rhodes" }],
        correct_choice_id: "arch_1",
        explanation: "It was a statue of the Greek sun-god Helios.",
        fun_fact: "Tenía aproximadamente la misma altura que la Estatua de la Libertad.",
        source_ids: ["src_rhodes"],
        visual_opportunity: "Ancient Rhodes harbor",
        translations: {
          es: {
            language: "es",
            question: "¿Qué maravilla antigua se alzaba aquí?",
            choices: [{ id: "arch_wrong", text: "Coloso de Rodas" }],
            correct_choice_id: "arch_wrong",
            explanation: "Era una estatua del dios del sol Helios.",
            fun_fact: "Tenía aproximadamente la misma altura que la Estatua de la Libertad.",
          },
        },
      };

      const result = BankQuestionSchema.safeParse(bankItem);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some((i) => i.message.includes("missing choice ID"))).toBe(true);
    });
  });

  describe("Batch prompt output parsing for mystery archetype", () => {
    it("parses mystery question with single choice cleanly", () => {
      const rawJson = JSON.stringify([
        {
          question: "What is concealed behind the curtain?",
          choices: [{ id: "secret_1", text: "The Holy Grail", is_correct: true }],
          correct_choice_id: "secret_1",
          explanation: "The grail was said to possess miraculous powers.",
          format: "image_guess",
        },
      ]);

      const [parsed] = parseBatchGenerationOutput(rawJson, {
        archetypeId: "mystery_reveal",
        domainId: "mythology",
        subtopicId: "relics",
      });

      expect(parsed).toBeDefined();
      expect(parsed.choices).toHaveLength(1);
      expect(parsed.choices[0].id).toBe("secret_1");
      expect(parsed.choices[0].text).toBe("The Holy Grail");
      expect(parsed.correct_choice_id).toBe("secret_1");
    });

    it("rejects mystery output that contains 2 or more choices instead of silently trimming", () => {
      const rawJson = JSON.stringify([
        {
          question: "What is concealed behind the curtain?",
          choices: [
            { id: "a", text: "The Holy Grail", is_correct: true },
            { id: "b", text: "The Golden Fleece", is_correct: false },
          ],
          correct_choice_id: "a",
          explanation: "The grail.",
          format: "image_guess",
        },
      ]);

      const results = parseBatchGenerationOutput(rawJson, {
        archetypeId: "mystery_reveal",
        domainId: "mythology",
        subtopicId: "relics",
      });

      expect(results).toHaveLength(0);
    });

    it("rejects mystery output with 0 choices instead of padding", () => {
      const rawJson = JSON.stringify([
        {
          question: "What is concealed behind the curtain?",
          choices: [],
          correct_choice_id: "a",
          explanation: "The grail.",
          format: "image_guess",
        },
      ]);

      const results = parseBatchGenerationOutput(rawJson, {
        archetypeId: "mystery_reveal",
        domainId: "mythology",
        subtopicId: "relics",
      });

      expect(results).toHaveLength(0);
    });
  });

  describe("Bank question converters", () => {
    const mysteryBankQuestion: BankQuestion = {
      id: "bq_mystery_conv",
      archetype_id: "mystery_reveal",
      domain_id: "science",
      subtopic_id: "astronomy",
      language: "en",
      format: "image_guess",
      difficulty: 2,
      question: "Which celestial body is magnified here?",
      choices: [{ id: "opt_custom_id_77", text: "Europa" }],
      correct_choice_id: "opt_custom_id_77",
      explanation: "Europa is an icy moon of Jupiter.",
      fun_fact: "It may harbor a subsurface ocean.",
      source_ids: ["nasa_jpl"],
      visual_opportunity: "Close up icy ridges",
    };

    it("lossless converter sets single_reveal answer_mode and preserves exact single choice and ID", () => {
      const quizQ = convertBankQuestionToQuizQuestionLossless(mysteryBankQuestion, 1);

      expect(quizQ.answer_mode).toBe("single_reveal");
      expect(quizQ.format).toBe("image_guess");
      expect(quizQ.choices).toHaveLength(1);
      expect(quizQ.choices[0].id).toBe("opt_custom_id_77");
      expect(quizQ.choices[0].text).toBe("Europa");
      expect(quizQ.correct_choice_id).toBe("opt_custom_id_77");
    });

    it("historical converter preserves single choice and custom ID for mystery questions without padding", () => {
      const quizQ = convertBankQuestionToQuizQuestion(mysteryBankQuestion, 1);

      expect(quizQ.answer_mode).toBe("single_reveal");
      expect(quizQ.choices).toHaveLength(1);
      expect(quizQ.choices[0].id).toBe("opt_custom_id_77");
      expect(quizQ.choices[0].text).toBe("Europa");
      expect(quizQ.correct_choice_id).toBe("opt_custom_id_77");
    });
  });

  describe("Layout resolution & auto-layout policy", () => {
    it("preferredAutoLayout selects mystery_reveal for choiceCount: 1", () => {
      expect(
        preferredAutoLayout({
          archetype: "mystery_reveal",
          questionFormat: "image_guess",
          choiceCount: 1,
        }),
      ).toBe("mystery_reveal");

      expect(
        preferredAutoLayout({
          archetype: "mystery_reveal",
          questionFormat: "image_guess",
          choiceCount: 1,
          answerMode: "single_reveal",
        }),
      ).toBe("mystery_reveal");
    });

    it("preferredAutoLayout selects mystery_reveal when answerMode is single_reveal", () => {
      expect(
        preferredAutoLayout({
          archetype: "mystery_reveal",
          questionFormat: "image_guess",
          choiceCount: 1,
          answerMode: "single_reveal",
        }),
      ).toBe("mystery_reveal");
    });

    it("resolveQuizLayout resolves mystery_reveal with single choice and single_reveal answer_mode", () => {
      const result = resolveQuizLayout({
        archetype: "mystery_reveal",
        questionFormat: "image_guess",
        choiceCount: 1,
        requestedLayout: "mystery_reveal",
        answerMode: "single_reveal",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.layoutId).toBe("mystery_reveal");
      }
    });

    it("resolveQuizLayout rejects mystery_reveal layout when choiceCount > 1", () => {
      const result = resolveQuizLayout({
        archetype: "mystery_reveal",
        questionFormat: "multiple_choice",
        choiceCount: 3,
        requestedLayout: "mystery_reveal",
        answerMode: "choice_selection",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0].message).toContain("Mystery Reveal requires exactly one choice");
      }
    });

    it("resolveQuizLayout rejects single_reveal answer_mode with non-mystery layout", () => {
      const result = resolveQuizLayout({
        archetype: "mystery_reveal",
        questionFormat: "multiple_choice",
        choiceCount: 1,
        requestedLayout: "media_left_choices_right",
        answerMode: "single_reveal",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0].message).toContain("does not support single reveal answer mode");
      }
    });
  });

  describe("Scene serialization & policy assertion", () => {
    it("QuizSceneContentSchema parses single_reveal answer_mode", () => {
      const parsed = QuizSceneContentSchema.parse({
        phase: "reveal",
        question_number: 1,
        question: "Who is this?",
        choices: ["Galileo Galilei"],
        answer: "Galileo Galilei",
        explanation: "Father of observational astronomy.",
        image_prompt: "Portrait of Galileo",
        answer_mode: "single_reveal",
      });

      expect(parsed.answer_mode).toBe("single_reveal");
      expect(parsed.choices).toEqual(["Galileo Galilei"]);
    });

    const mockEpisode: Episode = {
      episode_id: "ep_1",
      slug: "ep_1",
      title: "Episode 1",
      description: "Test",
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      quiz_config: {
        quiz_format: "image_guess",
        question_count: 1,
        time_per_question: 10,
        reveal_duration: 3,
      },
    };

    it("assertQuizSceneChoicePolicy permits 1 choice when answer_mode is single_reveal", () => {
      const scene: Scene = {
        scene_id: "s1",
        episode_id: "ep_1",
        scene_number: 1,
        duration_seconds: 5,
        dialogue: "Who is this?",
        visual_prompt: "A telescope",
        asset_type: "ai_reconstruction",
        continuity_bundle_id: "",
        continuity_note: "",
        transition_note: "",
        sequence_id: "seq-1",
        sequence_title: "Seq 1",
        shot_id: "",
        reference_asset_ids: [],
        source_ids: [],
        reconstruction: true,
        sound_cue: "",
        editorial_overlay: { style: "none", primary_text: "" },
        quiz: {
          phase: "question",
          question_number: 1,
          question: "Identify the object",
          choices: ["Hubble Telescope"],
          answer: "Hubble Telescope",
          explanation: "Space observatory.",
          image_prompt: "Telescope in orbit",
          answer_mode: "single_reveal",
        },
      };

      expect(() => assertQuizSceneChoicePolicy([scene], mockEpisode)).not.toThrow();
    });

    it("assertQuizSceneChoicePolicy rejects multiple choices when answer_mode is single_reveal", () => {
      const scene: Scene = {
        scene_id: "s1",
        episode_id: "ep_1",
        scene_number: 1,
        duration_seconds: 5,
        dialogue: "Who is this?",
        visual_prompt: "A telescope",
        asset_type: "ai_reconstruction",
        continuity_bundle_id: "",
        continuity_note: "",
        transition_note: "",
        sequence_id: "seq-1",
        sequence_title: "Seq 1",
        shot_id: "",
        reference_asset_ids: [],
        source_ids: [],
        reconstruction: true,
        sound_cue: "",
        editorial_overlay: { style: "none", primary_text: "" },
        quiz: {
          phase: "question",
          question_number: 1,
          question: "Identify the object",
          choices: ["Hubble Telescope", "James Webb"],
          answer: "Hubble Telescope",
          explanation: "Space observatory.",
          image_prompt: "Telescope in orbit",
          answer_mode: "single_reveal",
        },
      };

      expect(() => assertQuizSceneChoicePolicy([scene], mockEpisode)).toThrow(/must have exactly 1 choices; received 2/);
    });
  });
});

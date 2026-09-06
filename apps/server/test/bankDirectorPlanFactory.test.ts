import { describe, expect, it } from "vitest";
import type { Channel, QuizQuestion, QuizV2, TopicCandidate } from "@studio/shared";
import {
  buildSingleQuestionDirectorPlan,
  buildTopicDirectorPlan,
  mapToDirectorArchetype,
  resolveTargetLayoutForTopic,
} from "../src/quiz/bank/bridge/bankDirectorPlanFactory.js";

describe("bankDirectorPlanFactory", () => {
  const mockChannel: Channel = {
    id: "channel-test",
    name: "Quiz Channel",
    language: "en",
    default_palette_id: "candy_punch",
    default_thinking_bar_style: "auto",
    default_counter_style: "auto",
    default_question_box_style: "auto",
    default_answer_card_style: "auto",
    default_background_style: "auto",
  };

  describe("resolveTargetLayoutForTopic", () => {
    describe("9:16 Portrait Aspect Ratio", () => {
      it("resolves true/false archetypes to portrait_verdict_tf", () => {
        const tfTopic: TopicCandidate = {
          topic_id: "t-tf",
          title: "Fact or Myth",
          archetype: "verdict_true_false",
          quiz_format: "true_false",
        };
        expect(resolveTargetLayoutForTopic(tfTopic, "9:16")).toBe("portrait_verdict_tf");

        const factMythTopic: TopicCandidate = {
          topic_id: "t-fm",
          title: "Fact or Myth 2",
          archetype: "verdict_fact_myth",
        };
        expect(resolveTargetLayoutForTopic(factMythTopic, "9:16")).toBe("portrait_verdict_tf");

        const formatTfTopic: TopicCandidate = {
          topic_id: "t-fmt",
          title: "General TF",
          quiz_format: "true_false",
        };
        expect(resolveTargetLayoutForTopic(formatTfTopic, "9:16")).toBe("portrait_verdict_tf");
      });

      it("resolves versus_faceoff archetype to portrait_split_versus", () => {
        const versusTopic: TopicCandidate = {
          topic_id: "t-vs",
          title: "Lion vs Tiger",
          archetype: "versus_faceoff",
        };
        expect(resolveTargetLayoutForTopic(versusTopic, "9:16")).toBe("portrait_split_versus");
      });

      it("resolves speed_blitz archetype to portrait_stack_list", () => {
        const blitzTopic: TopicCandidate = {
          topic_id: "t-blitz",
          title: "Rapid Fire Quiz",
          archetype: "speed_blitz",
        };
        expect(resolveTargetLayoutForTopic(blitzTopic, "9:16")).toBe("portrait_stack_list");
      });

      it("resolves visual and knowledge archetypes to portrait_hero_choices", () => {
        const visualIdent: TopicCandidate = {
          topic_id: "t-ident",
          title: "Identify Creature",
          archetype: "visual_identification",
        };
        expect(resolveTargetLayoutForTopic(visualIdent, "9:16")).toBe("portrait_hero_choices");

        const deepTrivia: TopicCandidate = {
          topic_id: "t-deep",
          title: "Space Trivia",
          archetype: "deep_trivia",
        };
        expect(resolveTargetLayoutForTopic(deepTrivia, "9:16")).toBe("portrait_hero_choices");

        const mysteryReveal: TopicCandidate = {
          topic_id: "t-mystery",
          title: "Mystery Figure",
          archetype: "mystery_reveal",
        };
        expect(resolveTargetLayoutForTopic(mysteryReveal, "9:16")).toBe("portrait_hero_choices");

        const clueDeduction: TopicCandidate = {
          topic_id: "t-clue",
          title: "Who Am I",
          archetype: "clue_deduction",
        };
        expect(resolveTargetLayoutForTopic(clueDeduction, "9:16")).toBe("portrait_hero_choices");
      });

      it("strictly rejects visual_spotting and odd_one_out for 9:16 vertical ratio", () => {
        const visualSpotting: TopicCandidate = {
          topic_id: "t-spot",
          title: "Odd One Out",
          archetype: "visual_spotting",
        };
        expect(() => resolveTargetLayoutForTopic(visualSpotting, "9:16")).toThrow(
          "Archetype 'visual_spotting' and format 'odd_one_out' (3-image visual choices) are strictly unsupported for 9:16 vertical video",
        );

        const oddOneOutTopic: TopicCandidate = {
          topic_id: "t-odd",
          title: "Spot the Odd",
          quiz_format: "odd_one_out",
        };
        expect(() => resolveTargetLayoutForTopic(oddOneOutTopic, "9:16")).toThrow(
          "Archetype 'visual_spotting' and format 'odd_one_out' (3-image visual choices) are strictly unsupported for 9:16 vertical video",
        );
      });

      it("handles suggested_layout cleanly for 9:16", () => {
        const explicitPortrait: TopicCandidate = {
          topic_id: "t-exp",
          title: "Custom 9:16",
          suggested_layout: "portrait_split_versus",
        };
        expect(resolveTargetLayoutForTopic(explicitPortrait, "9:16")).toBe("portrait_split_versus");

        const legacySuggested: TopicCandidate = {
          topic_id: "t-leg",
          title: "Legacy Suggested",
          suggested_layout: "split_versus_two",
        };
        expect(resolveTargetLayoutForTopic(legacySuggested, "9:16")).toBe("portrait_split_versus");
      });
    });

    describe("16:9 Landscape Aspect Ratio (Backwards Compatibility)", () => {
      it("preserves exact landscape layouts for 16:9", () => {
        expect(
          resolveTargetLayoutForTopic({ topic_id: "1", title: "TF", archetype: "verdict_true_false" }, "16:9"),
        ).toBe("verdict_true_false");

        expect(
          resolveTargetLayoutForTopic({ topic_id: "2", title: "VS", archetype: "versus_faceoff" }, "16:9"),
        ).toBe("split_versus_two");

        expect(
          resolveTargetLayoutForTopic({ topic_id: "3", title: "Spot", archetype: "visual_spotting" }, "16:9"),
        ).toBe("visual_choices_three_pure");

        expect(
          resolveTargetLayoutForTopic({ topic_id: "4", title: "Ident", archetype: "visual_identification" }, "16:9"),
        ).toBe("visual_choices_three");

        expect(
          resolveTargetLayoutForTopic({ topic_id: "5", title: "Deep", archetype: "deep_trivia" }, "16:9"),
        ).toBe("media_left_choices_right");

        expect(
          resolveTargetLayoutForTopic({ topic_id: "6", title: "Blitz", archetype: "speed_blitz" }, "16:9"),
        ).toBe("full_stack_list");
      });

      it("defaults to 16:9 when aspectRatio parameter is omitted", () => {
        expect(
          resolveTargetLayoutForTopic({ topic_id: "def", title: "Default", archetype: "versus_faceoff" }),
        ).toBe("split_versus_two");
      });
    });
  });

  describe("mapToDirectorArchetype", () => {
    it("maps quiz archetype strings to director archetype identifiers", () => {
      expect(mapToDirectorArchetype("mystery_reveal")).toBe("mystery_reveal");
      expect(mapToDirectorArchetype("clue_deduction")).toBe("clue_deduction");
      expect(mapToDirectorArchetype("versus_faceoff")).toBe("visual_multiple_choice");
      expect(mapToDirectorArchetype("visual_identification")).toBe("visual_multiple_choice");
      expect(mapToDirectorArchetype("verdict_true_false")).toBe("true_false");
      expect(mapToDirectorArchetype("verdict_fact_myth")).toBe("true_false");
      expect(mapToDirectorArchetype("visual_spotting")).toBe("odd_one_out");
      expect(mapToDirectorArchetype("speed_blitz")).toBe("speed_round");
      expect(mapToDirectorArchetype("unknown_archetype")).toBe("text_multiple_choice");
    });
  });

  describe("buildSingleQuestionDirectorPlan", () => {
    it("creates a valid DirectorPlan with portrait layout", () => {
      const mockQuestion: QuizQuestion = {
        id: "q-1",
        question: "Is the Eiffel Tower in Paris?",
        options: ["True", "False"],
        correct_answer: "True",
        format: "true_false",
      };

      const plan = buildSingleQuestionDirectorPlan({
        episodeId: "ep-portrait-1",
        quizQuestion: mockQuestion,
        archetypeId: "verdict_true_false",
        channel: mockChannel,
        targetLayout: "portrait_verdict_tf",
      });

      expect(plan.episode_id).toBe("ep-portrait-1");
      expect(plan.beats).toHaveLength(1);
      expect(plan.beats[0]?.layout_id).toBe("portrait_verdict_tf");
      expect(plan.beats[0]?.archetype).toBe("true_false");
    });
  });

  describe("buildTopicDirectorPlan", () => {
    it("creates a valid multi-beat DirectorPlan with portrait layout", () => {
      const mockQuiz: QuizV2 = {
        id: "quiz-1",
        episode_id: "ep-topic-1",
        title: "Geography Battle",
        age_band: "7-9",
        questions: [
          {
            id: "q-1",
            question: "Lion vs Tiger: Who is bigger?",
            format: "multiple_choice",
            choices: [
              { id: "c1", text: "Lion" },
              { id: "c2", text: "Tiger" },
            ],
            options: ["Lion", "Tiger"],
            correct_answer: "Tiger",
          },
          {
            id: "q-2",
            question: "Cheetah vs Falcon: Who is faster?",
            format: "multiple_choice",
            choices: [
              { id: "c1", text: "Cheetah" },
              { id: "c2", text: "Falcon" },
            ],
            options: ["Cheetah", "Falcon"],
            correct_answer: "Falcon",
          },
        ],
      } as any;

      const mockTopic: TopicCandidate = {
        topic_id: "t-vs-multi",
        title: "Wildlife Battle",
        archetype: "versus_faceoff",
      };

      const plan = buildTopicDirectorPlan(mockQuiz, mockTopic, mockChannel, "portrait_split_versus");

      expect(plan.beats).toHaveLength(2);
      expect(plan.beats[0]?.layout_id).toBe("portrait_split_versus");
      expect(plan.beats[1]?.layout_id).toBe("portrait_split_versus");
    });

    it("passes 9:16 aspect ratio to createDefaultDirectorPlan", () => {
      const mockQuiz: QuizV2 = {
        id: "quiz-2",
        episode_id: "ep-topic-2",
        title: "Trivia Battle",
        age_band: "7-9",
        questions: [
          {
            id: "q-1",
            question: "Question 1",
            format: "multiple_choice",
            choices: [
              { id: "c1", text: "A" },
              { id: "c2", text: "B" },
              { id: "c3", text: "C" },
            ],
            options: ["A", "B", "C"],
            correct_answer: "A",
          },
        ],
      } as any;

      const mockTopic: TopicCandidate = {
        topic_id: "t-trivia",
        title: "Trivia",
        archetype: "deep_trivia",
      };

      const plan = buildTopicDirectorPlan(mockQuiz, mockTopic, mockChannel, "portrait_hero_choices", "9:16");

      expect(plan.beats[0]?.layout_id).toBe("portrait_hero_choices");
    });
  });
});

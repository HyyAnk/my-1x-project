import { describe, expect, it } from "vitest";
import { resolveLayoutRequirements } from "./components/design/sandboxLayoutRequirements";
import { buildEpisodePreviewRequest } from "../episode/services/buildEpisodePreviewRequest";
import { buildTopicTemplatePreviewQuestion } from "../episode/utils/episodePreviewQuestions";
import { validateQuestionForm } from "../questionBank/utils/questionBankFormValidation";
import { getQuizLayoutUiDefinition } from "../quizLayouts/quizLayoutUiCatalog";
import type { Channel, Episode } from "@studio/shared";
import type { ResolvedEpisodePreviewStyle } from "../episode/types/episodeStylePreview.types";

const mockResolved: ResolvedEpisodePreviewStyle = {
  theme: "candy_arcade",
  paletteId: "lime",
  thinkingBarStyle: "star_slider",
  questionBoxStyle: "candy_pop",
  answerCardStyle: "glossy_arcade",
  counterStyle: "hanging_woodsign",
  backgroundStyle: "candy_rays",
  totalQuestions: 5,
  channelBrandName: "Test Channel",
};

const mockChannel = {
  channel_id: "ch-1",
  display_name: "Quiz Channel",
  mascot_id: "none",
  mascot_config: { enabled: false },
} as unknown as Channel;

describe("Phase 11 - Dashboard, Preview and Requirements Synchronization", () => {
  describe("Layout Image Requirements Resolution", () => {
    it("returns zero image requirements for full_stack_list", () => {
      const requirements = resolveLayoutRequirements("full_stack_list");
      expect(requirements).toHaveLength(0);
    });

    it("returns exactly one 16:9 contain image requirement for mystery_reveal", () => {
      const requirements = resolveLayoutRequirements("mystery_reveal");
      expect(requirements).toHaveLength(1);
      expect(requirements[0].role).toBe("hero");
      expect(requirements[0].aspectRatio).toBe("16:9");
      expect(requirements[0].recommended).toEqual({ width: 1408, height: 792 });
      expect(requirements[0].fit).toBe("contain");
      expect(requirements[0].label).toBe("Mystery Subject");
    });

    it("returns 4:3 cover hero requirement for media_left_choices_right", () => {
      const requirements = resolveLayoutRequirements("media_left_choices_right");
      expect(requirements).toHaveLength(1);
      expect(requirements[0].role).toBe("hero");
      expect(requirements[0].aspectRatio).toBe("4:3");
      expect(requirements[0].recommended).toEqual({ width: 1120, height: 840 });
      expect(requirements[0].fit).toBe("cover");
    });

    it("returns 1:1 cover choices requirement for visual_choices_three", () => {
      const requirements = resolveLayoutRequirements("visual_choices_three");
      expect(requirements).toHaveLength(1);
      expect(requirements[0].role).toBe("choice");
      expect(requirements[0].aspectRatio).toBe("1:1");
      expect(requirements[0].recommended).toEqual({ width: 664, height: 664 });
      expect(requirements[0].fit).toBe("cover");
    });

    it("returns 3:4 cover choices requirement for visual_choices_three_pure", () => {
      const requirements = resolveLayoutRequirements("visual_choices_three_pure");
      expect(requirements).toHaveLength(1);
      expect(requirements[0].role).toBe("choice");
      expect(requirements[0].aspectRatio).toBe("3:4");
      expect(requirements[0].recommended).toEqual({ width: 648, height: 864 });
      expect(requirements[0].fit).toBe("cover");
    });

    it("returns 16:9 cover choices requirement for split_versus_two", () => {
      const requirements = resolveLayoutRequirements("split_versus_two");
      expect(requirements).toHaveLength(1);
      expect(requirements[0].role).toBe("choice");
      expect(requirements[0].aspectRatio).toBe("16:9");
      expect(requirements[0].recommended).toEqual({ width: 1152, height: 648 });
      expect(requirements[0].fit).toBe("cover");
    });

    it("returns 4:3 cover hero requirement for verdict_true_false", () => {
      const requirements = resolveLayoutRequirements("verdict_true_false");
      expect(requirements).toHaveLength(1);
      expect(requirements[0].role).toBe("hero");
      expect(requirements[0].aspectRatio).toBe("4:3");
      expect(requirements[0].recommended).toEqual({ width: 1216, height: 912 });
      expect(requirements[0].fit).toBe("cover");
    });
  });

  describe("Episode Preview Request Single-Answer Mystery Protection", () => {
    it("ensures Mystery questions submit exactly one choice and correctChoiceIndex 0 even if multi-choice passed", () => {
      const request = buildEpisodePreviewRequest({
        channel: mockChannel,
        override: {},
        resolved: mockResolved,
        question: {
          id: "q-mystery-1",
          number: 1,
          text: "Who is this Pokemon?",
          choices: ["Charmander", "Pikachu", "Bulbasaur"],
          correctChoiceIndex: 1,
          factText: "It's Pikachu!",
          totalQuestions: 5,
          layoutId: "mystery_reveal",
          questionFormat: "image_guess",
          archetype: "mystery_reveal",
          layoutSource: "director",
        },
      });

      expect(request.layout_id).toBe("mystery_reveal");
      expect(request.choices).toHaveLength(1);
      expect(request.choices?.[0]).toBe("Pikachu");
      expect(request.correct_choice_index).toBe(0);
    });

    it("preserves standard 3 choices for media_left layout", () => {
      const request = buildEpisodePreviewRequest({
        channel: mockChannel,
        override: {},
        resolved: mockResolved,
        question: {
          id: "q-std-1",
          number: 1,
          text: "Which planet has rings?",
          choices: ["Jupiter", "Saturn", "Uranus"],
          correctChoiceIndex: 1,
          factText: "Saturn has prominent rings",
          totalQuestions: 5,
          layoutId: "media_left_choices_right",
          questionFormat: "multiple_choice",
          archetype: "text_multiple_choice",
          layoutSource: "director",
        },
      });

      expect(request.layout_id).toBe("media_left_choices_right");
      expect(request.choices).toHaveLength(3);
      expect(request.correct_choice_index).toBe(1);
    });
  });

  describe("Question Bank Mystery Validation", () => {
    const dummyTranslator = (key: string) => key;

    it("rejects mystery question with multiple choices", () => {
      const err = validateQuestionForm(
        "Who is this character?",
        "It's a mystery",
        [
          { id: "A", text: "Answer A", is_correct: true },
          { id: "B", text: "Answer B", is_correct: false },
        ],
        dummyTranslator,
        "mystery_reveal",
      );
      expect(err).toBe("questionBank.form.errorMysterySingleChoice");
    });

    it("rejects mystery question with empty reveal answer", () => {
      const err = validateQuestionForm(
        "Who is this character?",
        "It's a mystery",
        [{ id: "A", text: "   ", is_correct: true }],
        dummyTranslator,
        "mystery_reveal",
      );
      expect(err).toBe("questionBank.form.errorEnterRevealAnswer");
    });

    it("accepts valid mystery question with exactly 1 non-empty choice", () => {
      const err = validateQuestionForm(
        "Who is this character?",
        "It's Pikachu!",
        [{ id: "A", text: "Pikachu", is_correct: true }],
        dummyTranslator,
        "mystery_reveal",
      );
      expect(err).toBeNull();
    });

    it("validates non-mystery question requiring at least 2 choices", () => {
      const err = validateQuestionForm(
        "Is Paris the capital of France?",
        "Yes it is",
        [{ id: "A", text: "Option A", is_correct: true }],
        dummyTranslator,
        "media_left_choices_right",
      );
      expect(err).toBe("questionBank.form.errorMinChoices");
    });
  });

  describe("Topic Template Preview Question", () => {
    it("builds topic template question with exactly 1 choice for mystery episode archetype", () => {
      const episode = {
        episode_id: "ep-1",
        quiz_config: {
          gameplay_archetype: "mystery_reveal",
          quiz_format: "image_guess",
        },
        topic: {
          title: "Anime Legends",
        },
      } as unknown as Episode;

      const previewQuestion = buildTopicTemplatePreviewQuestion(episode);
      expect(previewQuestion.layoutId).toBe("mystery_reveal");
      expect(previewQuestion.choices).toHaveLength(1);
      expect(previewQuestion.correctChoiceIndex).toBe(0);
    });
  });

  describe("useSandboxLayoutSync Draft Preservation", () => {
    it("preserves multi-choice draft on reversible switch into and out of mystery_reveal", async () => {
      const { renderHook, act } = await import("@testing-library/react");
      const { useSandboxLayoutSync } = await import("./hooks/useSandboxLayoutSync");

      let currentLayout = "media_left_choices_right";
      let choices = ["Jupiter", "Saturn", "Uranus"];
      let correctChoiceIndex = 1;

      const mockDesign = {
        layoutId: currentLayout,
        setLayoutId: (l: any) => {
          currentLayout = l;
        },
      } as any;

      const mockQuestion = {
        choices,
        setChoices: (c: any) => {
          choices = c;
          mockQuestion.choices = c;
        },
        correctChoiceIndex,
        setCorrectChoiceIndex: (i: any) => {
          correctChoiceIndex = i;
          mockQuestion.correctChoiceIndex = i;
        },
      } as any;

      const { result } = renderHook(() =>
        useSandboxLayoutSync({
          design: mockDesign,
          question: mockQuestion,
          viewport: { aspectRatio: "16:9" } as any,
          mascot: {} as any,
        }),
      );

      // Switch to mystery_reveal
      act(() => {
        result.current.handleLayoutChange("mystery_reveal");
      });

      expect(currentLayout).toBe("mystery_reveal");
      expect(choices).toEqual(["Saturn"]);
      expect(correctChoiceIndex).toBe(0);

      // Switch back to media_left_choices_right
      act(() => {
        result.current.handleLayoutChange("media_left_choices_right");
      });

      expect(currentLayout).toBe("media_left_choices_right");
      expect(choices).toEqual(["Jupiter", "Saturn", "Uranus"]);
      expect(correctChoiceIndex).toBe(1);
    });
  });

  describe("Quiz Layout UI Catalog and Wireframe Metadata", () => {
    it("classifies mystery_reveal with preview mystery-reveal", () => {
      const uiDef = getQuizLayoutUiDefinition("mystery_reveal");
      expect(uiDef.preview).toBe("mystery-reveal");
      expect(uiDef.icon).toBe("visual");
    });

    it("classifies split_versus_two with preview split-versus", () => {
      const uiDef = getQuizLayoutUiDefinition("split_versus_two");
      expect(uiDef.preview).toBe("split-versus");
      expect(uiDef.icon).toBe("split");
    });

    it("classifies verdict_true_false with preview verdict", () => {
      const uiDef = getQuizLayoutUiDefinition("verdict_true_false");
      expect(uiDef.preview).toBe("verdict");
      expect(uiDef.icon).toBe("split");
    });
  });
});

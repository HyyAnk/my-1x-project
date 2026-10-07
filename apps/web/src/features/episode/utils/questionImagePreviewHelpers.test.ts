import { describe, expect, it } from "vitest";
import type { QuestionImageItem } from "../types/questionImages.types";
import {
  buildQuestionImagePreviewList,
  findPreviewIndex,
} from "./questionImagePreviewHelpers";

describe("questionImagePreviewHelpers", () => {
  const singleSlotItem: QuestionImageItem = {
    question_number: 1,
    question_id: "q1",
    question_text: "What is the largest animal?",
    asset_id: "q1_hero",
    status: "ai_generated",
    source: "provider",
    image_url: "/blue_whale.png",
    prompt: "Blue whale swimming in ocean",
    aspect_ratio: "16:9",
    user_selected: false,
    slots: [],
  };

  const multiSlotItem: QuestionImageItem = {
    question_number: 2,
    question_id: "q2",
    question_text: "Which of these is a gas giant?",
    layout_id: "visual_choices_three",
    asset_id: "asset-q2-c1",
    status: "ai_generated",
    source: "provider",
    image_url: "/jupiter.png",
    prompt: "Jupiter planet",
    aspect_ratio: "1:1",
    user_selected: false,
    slots: [
      {
        slot_id: "c1",
        asset_id: "asset-q2-c1",
        label: "Choice A",
        choice_id: "c1",
        choice_text: "Jupiter",
        purpose: "answer_option",
        aspect_ratio: "1:1",
        status: "ai_generated",
        source: "provider",
        image_url: "/jupiter.png",
        prompt: "Jupiter planet",
        user_selected: false,
      },
      {
        slot_id: "c2",
        asset_id: "asset-q2-c2",
        label: "Choice B",
        choice_id: "c2",
        choice_text: "Mars",
        purpose: "answer_option",
        aspect_ratio: "1:1",
        status: "missing",
        source: "none",
        image_url: null,
        prompt: "Mars planet",
        user_selected: false,
      },
      {
        slot_id: "c3",
        asset_id: "asset-q2-c3",
        label: "Choice C",
        choice_id: "c3",
        choice_text: "Venus",
        purpose: "answer_option",
        aspect_ratio: "1:1",
        status: "user_uploaded",
        source: "explicit_episode",
        image_url: "/venus.png",
        prompt: "Venus planet",
        user_selected: true,
      },
    ],
  };

  describe("buildQuestionImagePreviewList", () => {
    it("builds flat preview list skipping missing slots and formatting metadata", () => {
      const getImageUrl = (qNum: number, slotId?: string) => {
        if (qNum === 1) return "/blue_whale.png";
        if (qNum === 2 && slotId === "c1") return "/jupiter.png";
        if (qNum === 2 && slotId === "c3") return "/venus.png";
        return null;
      };

      const previews = buildQuestionImagePreviewList([singleSlotItem, multiSlotItem], getImageUrl);

      // Total previewable: 1 from Q1 + 2 from Q2 (Choice B is missing) = 3
      expect(previews).toHaveLength(3);

      expect(previews[0]).toEqual({
        url: "/blue_whale.png",
        filename: "q1.png",
        bundleId: "Q#1",
        title: "What is the largest animal?",
        prompt: "Blue whale swimming in ocean",
        aspectRatio: "16:9",
        priceVnd: undefined,
        model: undefined,
        counter: "Question #1",
      });

      expect(previews[1].bundleId).toBe("Q#2 [Choice A]");
      expect(previews[1].title).toBe("Choice A: Jupiter");
      expect(previews[1].subtitle).toBe("Which of these is a gas giant?");
      expect(previews[1].counter).toBe("Choice 1 of 3");
      expect(previews[1].aspectRatio).toBe("1:1");

      expect(previews[2].bundleId).toBe("Q#2 [Choice C]");
      expect(previews[2].title).toBe("Choice C: Venus");
      expect(previews[2].counter).toBe("Choice 3 of 3");
    });
  });

  describe("findPreviewIndex", () => {
    it("finds matching preview by url or bundleId", () => {
      const list = [
        { url: "/a.png", bundleId: "Q#1", filename: "a.png", title: "A", prompt: "" },
        { url: "/b.png", bundleId: "Q#2 [Choice A]", filename: "b.png", title: "B", prompt: "" },
      ];

      expect(findPreviewIndex(list, list[1])).toBe(1);
      expect(findPreviewIndex(list, { url: "/notfound.png", bundleId: "Q#9", filename: "", title: "", prompt: "" })).toBe(-1);
      expect(findPreviewIndex(list, null)).toBe(-1);
    });
  });
});

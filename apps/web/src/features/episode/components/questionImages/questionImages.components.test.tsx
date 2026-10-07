import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuestionImageStatusBadge } from "./QuestionImageStatusBadge";
import { QuestionImageUploader } from "./QuestionImageUploader";
import { QuestionImageActionBar } from "./QuestionImageActionBar";
import { QuestionImageCard } from "./QuestionImageCard";
import type { QuestionImageItem } from "../../types/questionImages.types";

describe("Question Images Sub-Components", () => {
  describe("QuestionImageStatusBadge", () => {
    it("renders corresponding labels for each status", () => {
      const { rerender } = render(<QuestionImageStatusBadge status="user_uploaded" />);
      expect(screen.getByText("Manual Upload")).toBeDefined();

      rerender(<QuestionImageStatusBadge status="ai_generated" />);
      expect(screen.getByText("AI Generated")).toBeDefined();

      rerender(<QuestionImageStatusBadge status="generating" />);
      expect(screen.getByText("Generating...")).toBeDefined();

      rerender(<QuestionImageStatusBadge status="missing" />);
      expect(screen.getByText("Missing")).toBeDefined();
    });
  });

  describe("QuestionImageUploader", () => {
    it("renders upload call to action and triggers onUpload on file selection", () => {
      const onUpload = vi.fn();
      render(<QuestionImageUploader questionNumber={1} onUpload={onUpload} />);

      expect(screen.getByText("Click to upload image")).toBeDefined();

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDefined();

      const file = new File(["dummy"], "sample.png", { type: "image/png" });
      fireEvent.change(input, { target: { files: [file] } });

      expect(onUpload).toHaveBeenCalledWith(file);
    });

    it("displays spinner during uploading", () => {
      render(<QuestionImageUploader questionNumber={1} uploading={true} onUpload={vi.fn()} />);
      expect(screen.getByText("Uploading image...")).toBeDefined();
    });
  });

  describe("QuestionImageActionBar", () => {
    const defaultItem: QuestionImageItem = {
      question_number: 1,
      question_id: "q1",
      question_text: "Sample question?",
      asset_id: "q1_hero",
      status: "ai_generated",
      source: "provider",
      image_url: "/img.png",
      prompt: "prompt",
      aspect_ratio: "16:9",
      user_selected: false,
      slots: [],
    };

    it("shows Reset to AI button only for user uploaded items", () => {
      const onReset = vi.fn();
      const { rerender } = render(
        <QuestionImageActionBar
          item={defaultItem}
          hasImage={true}
          onTriggerUpload={vi.fn()}
          onReset={onReset}
        />,
      );

      expect(screen.queryByText("Reset to AI")).toBeNull();

      rerender(
        <QuestionImageActionBar
          item={{ ...defaultItem, status: "user_uploaded", user_selected: true }}
          hasImage={true}
          onTriggerUpload={vi.fn()}
          onReset={onReset}
        />,
      );

      const resetBtn = screen.getByText("Reset to AI");
      expect(resetBtn).toBeDefined();
      fireEvent.click(resetBtn);
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe("QuestionImageCard", () => {
    const item: QuestionImageItem = {
      question_number: 2,
      question_id: "q2",
      question_text: "What is the capital of Japan?",
      asset_id: "q2_hero",
      status: "user_uploaded",
      source: "explicit_episode",
      image_url: "/tokyo.png",
      prompt: "Tokyo skyline in spring",
      aspect_ratio: "16:9",
      user_selected: true,
      filename: "tokyo.png",
      slots: [],
    };

    it("renders question text, image, and toggles prompt visibility", () => {
      render(
        <QuestionImageCard
          item={item}
          imageUrl="/tokyo.png"
          onUpload={vi.fn()}
          onReset={vi.fn()}
          onGenerate={vi.fn()}
        />,
      );

      expect(screen.getByText("Q#2")).toBeDefined();
      expect(screen.getByText("What is the capital of Japan?")).toBeDefined();
      expect(screen.getByAltText("Question #2")).toBeDefined();

      const toggleBtn = screen.getByText("View Prompt");
      fireEvent.click(toggleBtn);

      expect(screen.getByText("Tokyo skyline in spring")).toBeDefined();
      expect(screen.getByText("Hide Prompt")).toBeDefined();
    });

    it("renders multi-slot 3-choice layout with layout pill and slot cards", () => {
      const multiSlotItem: QuestionImageItem = {
        question_number: 1,
        question_id: "q1",
        question_text: "Which planet is the largest?",
        layout_id: "visual_choices_three",
        asset_id: "asset-q1-c1",
        status: "ai_generated",
        source: "provider",
        image_url: "/jupiter.png",
        prompt: "Jupiter planet",
        aspect_ratio: "1:1",
        user_selected: false,
        slots: [
          {
            slot_id: "c1",
            asset_id: "asset-q1-c1",
            label: "Choice A",
            choice_id: "c1",
            choice_text: "Jupiter",
            purpose: "answer_option",
            aspect_ratio: "1:1",
            status: "ai_generated",
            source: "provider",
            image_url: "/jupiter.png",
            prompt: "Jupiter",
            user_selected: false,
          },
          {
            slot_id: "c2",
            asset_id: "asset-q1-c2",
            label: "Choice B",
            choice_id: "c2",
            choice_text: "Saturn",
            purpose: "answer_option",
            aspect_ratio: "1:1",
            status: "user_uploaded",
            source: "explicit_episode",
            image_url: "/saturn.png",
            prompt: "Saturn",
            user_selected: true,
          },
          {
            slot_id: "c3",
            asset_id: "asset-q1-c3",
            label: "Choice C",
            choice_id: "c3",
            choice_text: "Earth",
            purpose: "answer_option",
            aspect_ratio: "1:1",
            status: "missing",
            source: "none",
            image_url: null,
            prompt: "Earth",
            user_selected: false,
          },
        ],
      };

      const onUploadSlot = vi.fn();
      const onResetSlot = vi.fn();

      render(
        <QuestionImageCard
          item={multiSlotItem}
          imageUrl="/jupiter.png"
          onUpload={vi.fn()}
          onReset={vi.fn()}
          onGenerate={vi.fn()}
          onUploadSlot={onUploadSlot}
          onResetSlot={onResetSlot}
          getImageUrlForSlot={(slot) => slot.image_url}
        />,
      );

      expect(screen.getByText("3 Choices (1:1)")).toBeDefined();
      expect(screen.getByText("Choice A")).toBeDefined();
      expect(screen.getByText("Jupiter")).toBeDefined();
      expect(screen.getByText("Choice B")).toBeDefined();
      expect(screen.getByText("Saturn")).toBeDefined();
      expect(screen.getByText("Choice C")).toBeDefined();
      expect(screen.getByText("Earth")).toBeDefined();

      // Choice B is user_uploaded so it should have a Reset button
      const resetBtn = screen.getByRole("button", { name: "Reset Choice B" });
      expect(resetBtn).toBeDefined();
      fireEvent.click(resetBtn);
      expect(onResetSlot).toHaveBeenCalledWith("c2");
    });
  });
});

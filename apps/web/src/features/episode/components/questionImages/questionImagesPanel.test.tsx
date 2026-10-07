import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { quizApi } from "../../../../api/quizApi";
import { QuestionImagesPanel } from "./QuestionImagesPanel";
import { QuestionImagesSummaryHeader } from "./QuestionImagesSummaryHeader";
import { EpisodeWorkspaceTabBar } from "../EpisodeWorkspaceTabBar";
import type { QuestionImagesOverviewResponse } from "../../types/questionImages.types";
import type { Channel } from "@studio/shared";

const mockOverview: QuestionImagesOverviewResponse = {
  channel_id: "ch-test",
  episode_id: "ep-test",
  total_questions: 3,
  ready_count: 2,
  uploaded_count: 1,
  missing_count: 1,
  items: [
    {
      question_number: 1,
      question_id: "q1",
      question_text: "What is the largest ocean?",
      asset_id: "q1_hero",
      status: "ai_generated",
      source: "provider",
      image_url: "/ocean.png",
      prompt: "Pacific Ocean view",
      aspect_ratio: "16:9",
      user_selected: false,
      slots: [],
    },
    {
      question_number: 2,
      question_id: "q2",
      question_text: "What is the deepest trench?",
      asset_id: "q2_hero",
      status: "user_uploaded",
      source: "explicit_episode",
      image_url: "/trench.png",
      prompt: "Mariana trench view",
      aspect_ratio: "16:9",
      user_selected: true,
      filename: "trench_custom.png",
      slots: [],
    },
    {
      question_number: 3,
      question_id: "q3",
      question_text: "Which sea is the saltiest?",
      asset_id: "q3_hero",
      status: "missing",
      source: "none",
      image_url: null,
      prompt: "Dead Sea surface",
      aspect_ratio: "16:9",
      user_selected: false,
      slots: [],
    },
  ],
};

describe("QuestionImagesPanel & Tab Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("QuestionImagesSummaryHeader", () => {
    it("renders metric badges and triggers refresh on click", () => {
      const onRefresh = vi.fn();
      render(
        <QuestionImagesSummaryHeader
          overview={mockOverview}
          loading={false}
          onRefresh={onRefresh}
        />,
      );

      expect(screen.getByText("Question Images & Visual Assets")).toBeDefined();
      expect(screen.getByText("Total: 3")).toBeDefined();
      expect(screen.getByText("Ready: 2/3")).toBeDefined();
      expect(screen.getByText("Custom: 1")).toBeDefined();
      expect(screen.getByText("Missing: 1")).toBeDefined();

      const refreshBtn = screen.getByTitle("Refresh question images status");
      fireEvent.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("QuestionImagesPanel", () => {
    it("renders overview questions grid and allows preview modal interaction", async () => {
      vi.spyOn(quizApi, "getQuestionImages").mockResolvedValue(mockOverview);

      render(
        <QuestionImagesPanel
          channelId="ch-test"
          episodeId="ep-test"
          hasQuiz={true}
        />,
      );

      await act(async () => {});

      expect(screen.getByText("Q#1")).toBeDefined();
      expect(screen.getByText("What is the largest ocean?")).toBeDefined();
      expect(screen.getByText("Q#2")).toBeDefined();
      expect(screen.getByText("What is the deepest trench?")).toBeDefined();
      expect(screen.getByText("Q#3")).toBeDefined();
      expect(screen.getByText("Which sea is the saltiest?")).toBeDefined();

      // Open preview modal for Q#1
      const previewButtons = screen.getAllByTitle("Preview image in full view");
      expect(previewButtons.length).toBeGreaterThan(0);
      fireEvent.click(previewButtons[0]);

      // Check preview modal elements
      expect(screen.getByRole("dialog", { name: "Image preview" })).toBeDefined();
      expect(screen.getByText("Pacific Ocean view")).toBeDefined();

      // Navigate to next image
      const nextBtn = screen.getByRole("button", { name: "Next image" });
      fireEvent.click(nextBtn);
      expect(screen.getByText("Mariana trench view")).toBeDefined();

      // Close modal
      const closeBtn = screen.getByRole("button", { name: "Close" });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole("dialog", { name: "Image preview" })).toBeNull();
    });

    it("renders empty state message when questions list is empty", async () => {
      vi.spyOn(quizApi, "getQuestionImages").mockResolvedValue({
        channel_id: "ch-test",
        episode_id: "ep-test",
        total_questions: 0,
        ready_count: 0,
        uploaded_count: 0,
        missing_count: 0,
        items: [],
      });

      render(
        <QuestionImagesPanel
          channelId="ch-test"
          episodeId="ep-test"
          hasQuiz={true}
        />,
      );

      await act(async () => {});

      expect(screen.getByText("No questions found in this episode yet.")).toBeDefined();
    });
  });

  describe("EpisodeWorkspaceTabBar", () => {
    it("renders Question Images as the very first tab before Script", () => {
      const dummyChannel = {
        channel_id: "ch-test",
        display_name: "Test Channel",
        language: "English",
        created_at: new Date().toISOString(),
      } as unknown as Channel;

      const dummyPipeline = {
        workflowTab: "question_images",
        switchWorkflowTab: vi.fn(),
        readiness: { script: true },
        historyCheck: null,
      };

      const { container } = render(
        <EpisodeWorkspaceTabBar
          channel={dummyChannel}
          episodeId="ep-test"
          simplifyMode={false}
          pipeline={dummyPipeline as never}
          bundleImages={[]}
          sceneCount={0}
        />,
      );

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBeGreaterThanOrEqual(4);

      // First tab must be Question Images
      expect(tabs[0].textContent).toContain("1. Question Images");
      // Second tab must be Script
      expect(tabs[1].textContent).toContain("2. Script");
    });
  });
});

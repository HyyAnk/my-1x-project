import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import type {
  Channel,
  Episode,
  MotionPromptOutput,
  MotionTemplateDefinition,
} from "@studio/shared";
import { api } from "../../api";
import { MotionCategoryBadge } from "./components/MotionCategoryBadge";
import { MotionPreviewIframe } from "./components/MotionPreviewIframe";
import { MotionTemplateCard } from "./components/MotionTemplateCard";
import { MotionFilterBar } from "./components/MotionFilterBar";
import { MotionPromptGeneratorModal } from "./components/MotionPromptGeneratorModal";
import { MotionTemplateSelector } from "./components/MotionTemplateSelector";
import { IntroOutroStyleDropdown } from "../episode/components/customization/IntroOutroStyleDropdown";

const sampleTemplates: MotionTemplateDefinition[] = [
  {
    id: "kinetic_punch",
    name: "Kinetic Punch",
    description: "Punchy typography and dynamic scale",
    placement: "intro",
    category: "kinetic",
    defaultDurationSeconds: 2.5,
    minDurationSeconds: 1.5,
    maxDurationSeconds: 5.0,
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    description: "Futuristic neon wireframe and glowing grid",
    placement: "intro",
    category: "cyber",
    defaultDurationSeconds: 3.0,
    minDurationSeconds: 2.0,
    maxDurationSeconds: 6.0,
  },
  {
    id: "interactive_cta",
    name: "Interactive CTA",
    description: "Pulsating subscribe buttons and interactive quiz recap",
    placement: "outro",
    category: "gamified",
    defaultDurationSeconds: 3.5,
    minDurationSeconds: 2.0,
    maxDurationSeconds: 7.0,
  },
];

describe("Motion Intro/Outro Studio UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "listMotionTemplates").mockResolvedValue({ templates: sampleTemplates });
    vi.spyOn(api, "previewMotionMarkup").mockResolvedValue({
      html: "<div class='motion-root'>Preview Content</div>",
      templateId: "kinetic_punch",
      durationSeconds: 2.5,
      aspectRatio: "16:9",
    });
    vi.spyOn(api, "listIntroOutroStyles").mockResolvedValue({ styles: [] });
    vi.spyOn(api, "listIntroOutroCategories").mockResolvedValue({ categories: [] });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("MotionCategoryBadge", () => {
    it("renders kinetic category badge correctly", () => {
      render(<MotionCategoryBadge category="kinetic" />);
      expect(screen.getByText("Kinetic")).toBeDefined();
    });

    it("renders cyber category badge correctly", () => {
      render(<MotionCategoryBadge category="cyber" />);
      expect(screen.getByText("Cyberpunk")).toBeDefined();
    });
  });

  describe("MotionPreviewIframe", () => {
    it("renders sandboxed iframe with provided markup and responds to ratio toggles", () => {
      const handleReplay = vi.fn();
      const handleToggleRatio = vi.fn();

      render(
        <MotionPreviewIframe
          htmlMarkup="<div class='preview'>Anim</div>"
          aspectRatio="16:9"
          isLoading={false}
          error={null}
          replayKey={1}
          onReplay={handleReplay}
          onToggleAspectRatio={handleToggleRatio}
        />,
      );

      const iframe = screen.getByTitle("Motion Template Live Preview") as HTMLIFrameElement;
      expect(iframe).toBeDefined();
      expect(iframe.srcdoc).toContain("Anim");

      const portraitBtn = screen.getByLabelText("Preview in 9:16 portrait");
      fireEvent.click(portraitBtn);
      expect(handleToggleRatio).toHaveBeenCalledWith("9:16");

      const replayBtn = screen.getByLabelText("Replay motion animation");
      fireEvent.click(replayBtn);
      expect(handleReplay).toHaveBeenCalledTimes(1);
    });
  });

  describe("MotionTemplateCard", () => {
    it("renders template info and fires onSelect and onPreview callbacks", () => {
      const handleSelect = vi.fn();
      const handlePreview = vi.fn();

      render(
        <MotionTemplateCard
          template={sampleTemplates[0]}
          isSelected={false}
          isPreviewing={false}
          onSelect={handleSelect}
          onPreview={handlePreview}
        />,
      );

      expect(screen.getByText("Kinetic Punch")).toBeDefined();
      expect(screen.getByText("Punchy typography and dynamic scale")).toBeDefined();

      const previewBtn = screen.getByLabelText("Preview Kinetic Punch");
      fireEvent.click(previewBtn);
      expect(handlePreview).toHaveBeenCalledWith(sampleTemplates[0]);

      const selectBtn = screen.getByLabelText("Select Kinetic Punch");
      fireEvent.click(selectBtn);
      expect(handleSelect).toHaveBeenCalledWith(sampleTemplates[0]);
    });
  });

  describe("MotionFilterBar", () => {
    it("allows switching placement tabs and search input", () => {
      const handlePlacement = vi.fn();
      const handleCategory = vi.fn();
      const handleSearch = vi.fn();

      render(
        <MotionFilterBar
          placementFilter="all"
          categoryFilter="all"
          searchQuery=""
          onPlacementChange={handlePlacement}
          onCategoryChange={handleCategory}
          onSearchChange={handleSearch}
        />,
      );

      const introTab = screen.getByRole("button", { name: "Intros" });
      fireEvent.click(introTab);
      expect(handlePlacement).toHaveBeenCalledWith("intro");

      const searchInput = screen.getByPlaceholderText("Search templates...");
      fireEvent.change(searchInput, { target: { value: "cyber" } });
      expect(handleSearch).toHaveBeenCalledWith("cyber");
    });
  });

  describe("MotionPromptGeneratorModal", () => {
    it("generates AI motion prompts and allows applying result", async () => {
      const mockOutput: MotionPromptOutput = {
        recommendedTemplateId: "kinetic_punch",
        placement: "intro",
        mood: "high_energy",
        generatedOptions: {
          headlineText: "Top 5 Mysteries",
          subheadlineText: "Guess in 3 seconds!",
          accentColor: "#facc15",
        },
        animationPhilosophy: "Rapid kinetic typography with elastic bounce",
        llmPromptRecipe: "Render punchy headline with dynamic scaling",
      };

      vi.spyOn(api, "generateMotionPrompt").mockResolvedValue(mockOutput);

      const handleApply = vi.fn();
      const handleClose = vi.fn();

      render(
        <MotionPromptGeneratorModal
          isOpen={true}
          defaultPlacement="intro"
          onClose={handleClose}
          onApply={handleApply}
        />,
      );

      const topicInput = screen.getByPlaceholderText("e.g. World Geography Trivia Challenge");
      fireEvent.change(topicInput, { target: { value: "Top 5 Mysteries" } });

      const generateBtn = screen.getByText("⚡ Generate Motion Hook with AI");
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByText("kinetic_punch")).toBeDefined();
        expect(screen.getByText("Top 5 Mysteries")).toBeDefined();
      });

      const applyBtn = screen.getByText("Apply This Motion Configuration");
      fireEvent.click(applyBtn);

      expect(handleApply).toHaveBeenCalledWith(mockOutput);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("MotionTemplateSelector", () => {
    it("loads templates and applies selection", async () => {
      const handleApply = vi.fn();
      const handleClose = vi.fn();

      render(
        <MotionTemplateSelector
          isOpen={true}
          initialIntroTemplateId="kinetic_punch"
          onClose={handleClose}
          onApply={handleApply}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Kinetic Punch")).toBeDefined();
        expect(screen.getByText("Interactive CTA")).toBeDefined();
      });

      const applyBtn = screen.getByRole("button", { name: "Apply Motion Templates" });
      fireEvent.click(applyBtn);

      expect(handleApply).toHaveBeenCalledWith(
        expect.objectContaining({
          introTemplateId: "kinetic_punch",
        }),
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("IntroOutroStyleDropdown with Motion Template", () => {
    const mockChannel = {
      channel_id: "ch_01",
      name: "Main Channel",
      default_intro_outro_style_id: null,
    } as unknown as Channel;

    const mockEpisode = {
      episode_id: "ep_01",
      channel_id: "ch_01",
      title: "Episode 1",
      quiz_config: {
        intro_outro_selection: {
          mode: "motion_template",
          intro_template_id: "kinetic_punch",
        },
      },
    } as unknown as Episode;

    it("displays motion template in customization pill", () => {
      const handleSave = vi.fn();
      const handleToggle = vi.fn();

      render(
        <IntroOutroStyleDropdown
          channel={mockChannel}
          episode={mockEpisode}
          isOpen={false}
          onToggle={handleToggle}
          onSaveIntroOutroSelection={handleSave}
        />,
      );

      expect(screen.getByText("Motion · Intro: kinetic_punch")).toBeDefined();
    });
  });
});

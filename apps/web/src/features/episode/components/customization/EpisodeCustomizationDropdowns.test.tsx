import type React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { Channel, Episode } from "@studio/shared";
import { LanguageProvider } from "../../../../i18n";
import { BackgroundDropdown } from "./BackgroundDropdown";
import { QuestionBoxDropdown } from "./QuestionBoxDropdown";
import { AnswerCardDropdown } from "./AnswerCardDropdown";
import { CounterBadgeDropdown } from "./CounterBadgeDropdown";
import { ThinkingBarDropdown } from "./ThinkingBarDropdown";
import { PresetPickerDropdown } from "./PresetPickerDropdown";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockChannel = {
  channel_id: "ch-test",
  display_name: "Test Channel",
  selected_styles: [],
} as unknown as Channel;

const mockEpisode = {
  episode_id: "ep-test",
  channel_id: "ch-test",
  quiz_config: {
    background_style: "candy_rays",
    question_box_style: "candy_pop",
    answer_card_style: "glossy_arcade",
    question_counter_style: "hanging_woodsign",
    thinking_bar_style: "star_slider",
  },
} as unknown as Episode;

describe("Episode Customization Dropdowns - Full Style Coverage", () => {
  afterEach(() => {
    cleanup();
  });

  describe("BackgroundDropdown", () => {
    it("renders active background and all 6 background options when opened", () => {
      const onSelectStyle = vi.fn();
      const onPreview = vi.fn();

      render(
        <BackgroundDropdown
          channel={mockChannel}
          episode={mockEpisode}
          disabled={false}
          saving={false}
          isOpen={true}
          onToggle={vi.fn()}
          onSelectStyle={onSelectStyle}
          onPreview={onPreview}
        />,
        { wrapper },
      );

      // Verify all 6 options are rendered
      expect(screen.getAllByText("Candy Rays").length).toBeGreaterThan(0);
      expect(screen.getByText("Aurora Glow")).toBeDefined();
      expect(screen.getByText("Comic Action Burst")).toBeDefined();
      expect(screen.getByText("Construction Blueprint")).toBeDefined();
      expect(screen.getByText("Cosmic Starfield")).toBeDefined();
      expect(screen.getByText("Floating Clouds")).toBeDefined();

      // Trigger hover preview on comic_burst
      const comicOption = screen.getByText("Comic Action Burst");
      fireEvent.mouseEnter(comicOption);
      expect(onPreview).toHaveBeenCalledWith({
        override: { backgroundStyle: "comic_burst" },
        label: "Comic Action Burst",
      });

      // Trigger select on construction_blueprint
      const blueprintOption = screen.getByText("Construction Blueprint");
      fireEvent.click(blueprintOption);
      expect(onSelectStyle).toHaveBeenCalledWith("construction_blueprint");
    });
  });

  describe("QuestionBoxDropdown", () => {
    it("renders active question box and all 7 question box options when opened", () => {
      const onSelectStyle = vi.fn();
      const onPreview = vi.fn();

      render(
        <QuestionBoxDropdown
          channel={mockChannel}
          episode={mockEpisode}
          disabled={false}
          saving={false}
          isOpen={true}
          onToggle={vi.fn()}
          onSelectStyle={onSelectStyle}
          onPreview={onPreview}
        />,
        { wrapper },
      );

      // Verify all 7 options are rendered
      expect(screen.getAllByText("Candy Pop Card").length).toBeGreaterThan(0);
      expect(screen.getByText("Comic Book Bubble")).toBeDefined();
      expect(screen.getByText("Frosted Glassmorphism")).toBeDefined();
      expect(screen.getByText("Adventure Parchment Scroll")).toBeDefined();
      expect(screen.getByText("Hazard Worksite Frame")).toBeDefined();
      expect(screen.getByText("Cockpit Sci-Fi HUD")).toBeDefined();
      expect(screen.getByText("Pastel Fluffy Cloud")).toBeDefined();

      // Trigger hover preview on hazard_stripes
      const hazardOption = screen.getByText("Hazard Worksite Frame");
      fireEvent.mouseEnter(hazardOption);
      expect(onPreview).toHaveBeenCalledWith({
        override: { questionBoxStyle: "hazard_stripes" },
        label: "Hazard Worksite Frame",
      });

      // Trigger select on cockpit_hud
      const hudOption = screen.getByText("Cockpit Sci-Fi HUD");
      fireEvent.click(hudOption);
      expect(onSelectStyle).toHaveBeenCalledWith("cockpit_hud");
    });
  });

  describe("AnswerCardDropdown", () => {
    it("renders active answer card and all 6 answer card options when opened", () => {
      const onSelectStyle = vi.fn();
      const onPreview = vi.fn();

      render(
        <AnswerCardDropdown
          channel={mockChannel}
          episode={mockEpisode}
          disabled={false}
          saving={false}
          isOpen={true}
          onToggle={vi.fn()}
          onSelectStyle={onSelectStyle}
          onPreview={onPreview}
        />,
        { wrapper },
      );

      // Verify all 6 options are rendered
      expect(screen.getAllByText("Glossy Arcade 3D").length).toBeGreaterThan(0);
      expect(screen.getByText("Comic Pop Art")).toBeDefined();
      expect(screen.getByText("Glassmorphism Neon")).toBeDefined();
      expect(screen.getByText("Minimalist Soft Card")).toBeDefined();
      expect(screen.getByText("Steel Beam Plate")).toBeDefined();
      expect(screen.getByText("Pastel Marshmallow")).toBeDefined();

      // Trigger hover preview on steel_beam_plate
      const steelOption = screen.getByText("Steel Beam Plate");
      fireEvent.mouseEnter(steelOption);
      expect(onPreview).toHaveBeenCalledWith({
        override: { answerCardStyle: "steel_beam_plate" },
        label: "Steel Beam Plate",
      });

      // Trigger select on pastel_marshmallow
      const marshmallowOption = screen.getByText("Pastel Marshmallow");
      fireEvent.click(marshmallowOption);
      expect(onSelectStyle).toHaveBeenCalledWith("pastel_marshmallow");
    });
  });

  describe("CounterBadgeDropdown", () => {
    it("renders active counter and all 6 counter options when opened", () => {
      const onSelectStyle = vi.fn();
      const onPreview = vi.fn();

      render(
        <CounterBadgeDropdown
          channel={mockChannel}
          episode={mockEpisode}
          disabled={false}
          saving={false}
          isOpen={true}
          onToggle={vi.fn()}
          onSelectStyle={onSelectStyle}
          onPreview={onPreview}
        />,
        { wrapper },
      );

      // Verify all 6 options are rendered
      expect(screen.getAllByText("Hanging Wood Sign").length).toBeGreaterThan(0);
      expect(screen.getByText("Cyber Neon Badge")).toBeDefined();
      expect(screen.getByText("Floating Party Balloon")).toBeDefined();
      expect(screen.getByText("Golden Trophy Shield")).toBeDefined();
      expect(screen.getByText("Space Radar Scope")).toBeDefined();
      expect(screen.getByText("Glossy Bubble Badge")).toBeDefined();

      // Trigger hover preview on space_radar
      const radarOption = screen.getByText("Space Radar Scope");
      fireEvent.mouseEnter(radarOption);
      expect(onPreview).toHaveBeenCalledWith({
        override: { counterStyle: "space_radar" },
        label: "Space Radar Scope",
      });

      // Trigger select on bubble_badge
      const bubbleOption = screen.getByText("Glossy Bubble Badge");
      fireEvent.click(bubbleOption);
      expect(onSelectStyle).toHaveBeenCalledWith("bubble_badge");
    });
  });

  describe("ThinkingBarDropdown", () => {
    it("renders active thinking bar and all 6 thinking bar options when opened", () => {
      const onSelectStyle = vi.fn();
      const onPreview = vi.fn();

      render(
        <ThinkingBarDropdown
          channel={mockChannel}
          episode={mockEpisode}
          disabled={false}
          saving={false}
          isOpen={true}
          onToggle={vi.fn()}
          onSelectStyle={onSelectStyle}
          onPreview={onPreview}
        />,
        { wrapper },
      );

      // Verify all 6 options are rendered
      expect(screen.getAllByText("Arcade Star Runner").length).toBeGreaterThan(0);
      expect(screen.getByText("Neon Jelly Liquid")).toBeDefined();
      expect(screen.getByText("Cyber Plasma Bar")).toBeDefined();
      expect(screen.getByText("Dozer Crate Push")).toBeDefined();
      expect(screen.getByText("Ember Trail")).toBeDefined();
      expect(screen.getByText("Cosmic Rocket Warp")).toBeDefined();

      // Trigger hover preview on construction_machine
      const dozerOption = screen.getByText("Dozer Crate Push");
      fireEvent.mouseEnter(dozerOption);
      expect(onPreview).toHaveBeenCalledWith({
        override: { thinkingBarStyle: "construction_machine" },
        label: "Dozer Crate Push",
      });

      // Trigger select on cosmic_rocket
      const rocketOption = screen.getByText("Cosmic Rocket Warp");
      fireEvent.click(rocketOption);
      expect(onSelectStyle).toHaveBeenCalledWith("cosmic_rocket");
    });
  });

  describe("PresetPickerDropdown", () => {
    it("includes backgroundStyle in preview candidate on hover", () => {
      const onPreview = vi.fn();

      render(
        <PresetPickerDropdown
          episode={mockEpisode}
          disabled={false}
          saving={false}
          isOpen={true}
          onToggle={vi.fn()}
          onSelectPreset={vi.fn()}
          onPreview={onPreview}
        />,
        { wrapper },
      );

      // Hover on Build Zone Crew
      const buildZoneOption = screen.getByText("Build Zone Crew");
      fireEvent.mouseEnter(buildZoneOption);
      expect(onPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          override: expect.objectContaining({
            backgroundStyle: "construction_blueprint",
            questionBoxStyle: "hazard_stripes",
            answerCardStyle: "steel_beam_plate",
            thinkingBarStyle: "construction_machine",
          }),
        }),
      );
    });
  });
});

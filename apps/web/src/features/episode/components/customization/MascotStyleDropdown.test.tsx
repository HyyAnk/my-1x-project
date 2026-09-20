import type React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { Channel, Episode, MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../../i18n";
import { MascotStyleDropdown } from "./MascotStyleDropdown";
import { buildEpisodePreviewRequest } from "../../services/buildEpisodePreviewRequest";
import type { EpisodeStyleOverride, ResolvedEpisodePreviewStyle } from "../../types/episodeStylePreview.types";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockChannelWithMascot: Channel = {
  channel_id: "ch-test",
  slug: "ch-test",
  display_name: "Test Channel",
  description: "",
  target_audience: "",
  language: "English",
  country: "GLOBAL",
  market: "",
  channel_dna_path: "path",
  style_guide_path: null,
  status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  episode_count: 0,
  voice_reference_path: null,
  selected_styles: ["pixar_3d"],
  mascot_id: "mascot-fox-1",
  mascot_config: {
    enabled: true,
    position: "bottom_left",
    scale: 1.0,
  },
} as unknown as Channel;

const mockEpisode: Episode = {
  id: "ep-1",
  channelId: "ch-test",
  title: "Test Episode",
  status: "draft",
  quiz_config: {
    visual_theme: "candy_arcade",
    visual_style: "mixed",
    resolved_visual_style: "pixar_3d",
    question_count: 8,
    style_preset_id: "preset_arcade_classic",
    mascot_style_selection: { mode: "style_builtin" },
    mascot_style_id: undefined,
  },
} as unknown as Episode;

const mockStyles: MascotStyle[] = [
  {
    id: "core",
    name: "Core Style",
    built_in_preset_id: "preset_arcade_classic",
    keyword: "",
    is_default: true,
    states: { thinking: [], celebrate: [] },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "style-military",
    name: "Military Squad",
    built_in_preset_id: "preset_build_zone",
    keyword: "military",
    is_default: false,
    states: { thinking: [], celebrate: [] },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "style-cyber",
    name: "Cyber Neon",
    built_in_preset_id: "preset_cyber_neon",
    keyword: "cyberpunk",
    is_default: false,
    states: { thinking: [], celebrate: [] },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

const mockResolved: ResolvedEpisodePreviewStyle = {
  theme: "candy_arcade",
  paletteId: "lime",
  thinkingBarStyle: "star_slider",
  questionBoxStyle: "candy_pop",
  answerCardStyle: "glossy_arcade",
  counterStyle: "hanging_woodsign",
  backgroundStyle: "candy_rays",
  totalQuestions: 8,
  channelBrandName: "Test Channel",
};

const emptyOverride: EpisodeStyleOverride = {};

describe("MascotStyleDropdown", () => {
  afterEach(() => {
    cleanup();
  });

  it("disables control and shows 'No Mascot' when channel has no mascot assigned", () => {
    const channelNoMascot = {
      ...mockChannelWithMascot,
      mascot_id: null,
    } as unknown as Channel;

    render(<MascotStyleDropdown channel={channelNoMascot} episode={mockEpisode} isOpen={false} onToggle={vi.fn()} />, { wrapper });

    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("No Mascot")).toBeDefined();
  });

  it("disables control and shows 'Disabled' when channel mascot is disabled", () => {
    const channelDisabledMascot = {
      ...mockChannelWithMascot,
      mascot_config: { ...mockChannelWithMascot.mascot_config, enabled: false },
    };

    render(<MascotStyleDropdown channel={channelDisabledMascot} episode={mockEpisode} isOpen={false} onToggle={vi.fn()} />, { wrapper });

    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Disabled")).toBeDefined();
  });

  it("shows the preset-bound Built-in Style by default", () => {
    render(
      <MascotStyleDropdown
        channel={mockChannelWithMascot}
        episode={mockEpisode}
        isOpen={false}
        onToggle={vi.fn()}
        availableMascotStyles={mockStyles}
      />,
      { wrapper },
    );

    expect(screen.getByText("Built-in Style · Core Style")).toBeDefined();
  });

  it("shows active style name when a custom style is selected", () => {
    render(
      <MascotStyleDropdown
        channel={mockChannelWithMascot}
        episode={mockEpisode}
        isOpen={false}
        onToggle={vi.fn()}
        mascotStyleSelection={{ mode: "specific_style", style_id: "style-military" }}
        availableMascotStyles={mockStyles}
      />,
      { wrapper },
    );

    expect(screen.getByText("Military Squad")).toBeDefined();
  });

  it("shows 'Cycle All Styles' when cycle is selected", () => {
    render(
      <MascotStyleDropdown
        channel={mockChannelWithMascot}
        episode={mockEpisode}
        isOpen={false}
        onToggle={vi.fn()}
        mascotStyleSelection={{ mode: "cycle" }}
        availableMascotStyles={mockStyles}
      />,
      { wrapper },
    );

    expect(screen.getByText("Cycle Styles")).toBeDefined();
  });

  it("renders Built-in, specific styles, and Cycle options without redundant badges", () => {
    render(
      <MascotStyleDropdown
        channel={mockChannelWithMascot}
        episode={mockEpisode}
        isOpen={true}
        onToggle={vi.fn()}
        availableMascotStyles={mockStyles}
      />,
      { wrapper },
    );

    expect(screen.getAllByText("Built-in Style · Core Style").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Specific · Core Style")).toBeDefined();
    expect(screen.getByText("Specific · Military Squad")).toBeDefined();
    expect(screen.queryByText("military")).toBeNull();
    expect(screen.getByText("Specific · Cyber Neon")).toBeDefined();
    expect(screen.queryByText("cyberpunk")).toBeNull();
    expect(screen.getByText("Cycle Styles")).toBeDefined();
  });

  it("saves style_builtin when the preset-bound option is clicked", () => {
    const onSave = vi.fn();
    render(
      <MascotStyleDropdown
        channel={mockChannelWithMascot}
        episode={mockEpisode}
        isOpen={true}
        onToggle={vi.fn()}
        availableMascotStyles={mockStyles}
        mascotStyleSelection={{ mode: "specific_style", style_id: "style-military" }}
        onSaveMascotStyleSelection={onSave}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByText("Built-in Style · Core Style"));
    expect(onSave).toHaveBeenCalledWith({ mode: "style_builtin" });
  });

  it("saves specific_style with the selected style id", () => {
    const onSave = vi.fn();
    render(
      <MascotStyleDropdown
        channel={mockChannelWithMascot}
        episode={mockEpisode}
        isOpen={true}
        onToggle={vi.fn()}
        availableMascotStyles={mockStyles}
        onSaveMascotStyleSelection={onSave}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByText("Specific · Military Squad"));
    expect(onSave).toHaveBeenCalledWith({ mode: "specific_style", style_id: "style-military" });
  });

  it("saves cycle mode when Cycle Styles is clicked", () => {
    const onSave = vi.fn();
    render(
      <MascotStyleDropdown
        channel={mockChannelWithMascot}
        episode={mockEpisode}
        isOpen={true}
        onToggle={vi.fn()}
        availableMascotStyles={mockStyles}
        onSaveMascotStyleSelection={onSave}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByText("Cycle Styles"));
    expect(onSave).toHaveBeenCalledWith({ mode: "cycle" });
  });

  it("renders style thumbnail avatars without redundant readiness chips", () => {
    const stylesWithAnchors: MascotStyle[] = [
      {
        id: "core",
        name: "Core Style",
        keyword: "",
        anchor_image_url: "https://example.com/core-anchor.png",
        is_default: true,
        states: {
          thinking: Array.from({ length: 10 }, (_, i) => ({
            id: `t_${i}`,
            slot_index: i + 1,
            image_url: `https://example.com/think_${i}.png`,
          })),
          celebrate: Array.from({ length: 10 }, (_, i) => ({
            id: `c_${i}`,
            slot_index: i + 1,
            image_url: `https://example.com/celeb_${i}.png`,
          })),
        },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "style-concept",
        name: "Steampunk Explorer",
        keyword: "steampunk",
        anchor_image_url: "https://example.com/steampunk-anchor.png",
        is_default: false,
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    render(
      <MascotStyleDropdown
        channel={mockChannelWithMascot}
        episode={mockEpisode}
        isOpen={true}
        onToggle={vi.fn()}
        availableMascotStyles={stylesWithAnchors}
      />,
      { wrapper },
    );

    // Verify thumbnail images
    const coreImg = screen.getByAltText("Built-in Core Style");
    expect(coreImg).toBeDefined();
    expect(coreImg.getAttribute("src")).toBe("https://example.com/core-anchor.png");

    const steampunkImg = screen.getByAltText("Specific Steampunk Explorer");
    expect(steampunkImg).toBeDefined();
    expect(steampunkImg.getAttribute("src")).toBe("https://example.com/steampunk-anchor.png");

    // Verify readiness chips are omitted
    expect(screen.queryByText("20 Poses")).toBeNull();
    expect(screen.queryByText("Concept Locked")).toBeNull();
  });
});

describe("buildEpisodePreviewRequest Mascot Style Forwarding", () => {
  it("forwards mascot_style_id from episode.quiz_config into SandboxPreviewRequest", () => {
    const episodeWithStyle = {
      ...mockEpisode,
      quiz_config: {
        ...mockEpisode.quiz_config,
        mascot_style_id: "style-military",
      },
    } as unknown as Episode;

    const request = buildEpisodePreviewRequest({
      channel: mockChannelWithMascot,
      episode: episodeWithStyle,
      override: emptyOverride,
      resolved: mockResolved,
    });

    expect(request.mascot_id).toBe("mascot-fox-1");
    expect(request.mascot_style_id).toBe("style-military");
  });

  it("leaves mascot_style_id undefined when episode has no mascot_style_id", () => {
    const request = buildEpisodePreviewRequest({
      channel: mockChannelWithMascot,
      episode: mockEpisode,
      override: emptyOverride,
      resolved: mockResolved,
    });

    expect(request.mascot_style_id).toBeUndefined();
  });

  it("leaves mascot_style_id undefined when episode is omitted", () => {
    const request = buildEpisodePreviewRequest({
      channel: mockChannelWithMascot,
      override: emptyOverride,
      resolved: mockResolved,
    });

    expect(request.mascot_style_id).toBeUndefined();
  });

  it("forwards a preview preset override so Built-in Style follows the hovered preset", () => {
    const request = buildEpisodePreviewRequest({
      channel: mockChannelWithMascot,
      episode: mockEpisode,
      override: { stylePresetId: "preset_cyber_neon" },
      resolved: mockResolved,
    });

    expect(request.style_preset_id).toBe("preset_cyber_neon");
    expect(request.mascot_style_selection).toEqual({ mode: "style_builtin" });
  });
});

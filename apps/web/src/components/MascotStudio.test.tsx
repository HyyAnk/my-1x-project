import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import type { Channel, MascotProfile } from "@studio/shared";
import { MascotStudioView } from "./MascotStudio";
import { LanguageProvider } from "../i18n";
import { api } from "../api";

const mockMascot: MascotProfile = {
  id: "mascot-test-1",
  name: "Sparky the Robot",
  description: "A cute helpful robot",
  visual_style: "pixar_3d",
  master_prompt: "Cute metallic robot with bright blue eyes",
  master_image_url: "https://example.com/sparky.png",
  color_theme: "#06b6d4",
  actions: {},
  assigned_channel_ids: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const mockChannels: Channel[] = [
  {
    channel_id: "ch-1",
    slug: "ch-1",
    display_name: "Channel 1",
    description: "",
    target_audience: "all",
    language: "en",
    country: "US",
    market: "general",
    channel_dna_path: "",
    style_guide_path: null,
    status: "ACTIVE",
    episode_count: 0,
    voice_reference_path: null,
    selected_styles: [],
    default_thinking_bar_style: "auto",
    default_question_box_style: "auto",
    default_answer_card_style: "auto",
    default_counter_style: "auto",
    default_background_style: "auto",
    default_palette_id: "auto",
    mascot_id: null,
    mascot_config: {
      enabled: true,
      position: "bottom_left",
      scale: 2.31,
      offset_x: 127,
      offset_y: 119,
      flip_x: false,
      show_in_intro: false,
      show_in_outro: false,
      show_in_question: true,
    },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("MascotStudioView Routing & Rehydration", () => {
  beforeEach(() => {
    vi.spyOn(api, "mascots").mockResolvedValue({ mascots: [mockMascot] });
    vi.spyOn(api, "mascot").mockResolvedValue({ mascot: mockMascot });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders library tab by default and triggers openMascot on card Studio click", async () => {
    const openMascot = vi.fn();
    render(
      <LanguageProvider>
        <MascotStudioView
          channels={mockChannels}
          onNotice={vi.fn()}
          onRefreshChannels={vi.fn()}
          openMascot={openMascot}
          activeTab="library"
        />
      </LanguageProvider>,
    );

    const mascotCard = await screen.findByText("Sparky the Robot");
    expect(mascotCard).toBeTruthy();

    const studioBtn = screen.getByRole("button", { name: /Studio/i });
    fireEvent.click(studioBtn);

    expect(openMascot).toHaveBeenCalledWith("mascot-test-1", 1);
  });

  it("rehydrates mascot and step on F5 reload when mascotId and step are passed", async () => {
    const setQueryParam = vi.fn();
    render(
      <LanguageProvider>
        <MascotStudioView
          channels={mockChannels}
          onNotice={vi.fn()}
          onRefreshChannels={vi.fn()}
          mascotId="mascot-test-1"
          step={2}
          activeTab="generator"
          setQueryParam={setQueryParam}
        />
      </LanguageProvider>,
    );

    // Should display the mascot name in generator tab badge
    await waitFor(() => {
      expect(screen.getByText("Sparky the Robot")).toBeTruthy();
    });

    // Generator stepper step 2 should be active
    const step2Btn = screen.getByRole("button", { name: /2\. Expressive States/i });
    expect(step2Btn.className).toContain("is-active");
  });

  it("rehydrates mascot via direct API call if not initially in library cache", async () => {
    vi.spyOn(api, "mascots").mockResolvedValue({ mascots: [] });
    vi.spyOn(api, "mascot").mockResolvedValue({ mascot: mockMascot });

    render(
      <LanguageProvider>
        <MascotStudioView
          channels={mockChannels}
          onNotice={vi.fn()}
          onRefreshChannels={vi.fn()}
          mascotId="mascot-test-1"
          step={1}
          activeTab="generator"
        />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(api.mascot).toHaveBeenCalledWith("mascot-test-1");
      expect(screen.getByText("Sparky the Robot")).toBeTruthy();
    });
  });

  it("initializes clean new mascot form when mascotId is 'new'", async () => {
    render(
      <LanguageProvider>
        <MascotStudioView channels={mockChannels} onNotice={vi.fn()} onRefreshChannels={vi.fn()} mascotId="new" activeTab="generator" />
      </LanguageProvider>,
    );

    const step1Btn = screen.getByRole("button", { name: /1\. Concept/i });
    expect(step1Btn.className).toContain("is-active");
  });

  it("navigates back to mascot library when clicking the header back button", async () => {
    const openMascot = vi.fn();
    render(
      <LanguageProvider>
        <MascotStudioView
          channels={mockChannels}
          onNotice={vi.fn()}
          onRefreshChannels={vi.fn()}
          openMascot={openMascot}
          mascotId="mascot-test-1"
          step={1}
          activeTab="generator"
        />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sparky the Robot")).toBeTruthy();
    });

    const headerBackBtn = screen.getByRole("button", { name: /Mascot Library/i });
    fireEvent.click(headerBackBtn);

    expect(openMascot).toHaveBeenCalledWith(null);
  });

  it("navigates back to mascot library when clicking the Mascot Library tab", async () => {
    const openMascot = vi.fn();
    render(
      <LanguageProvider>
        <MascotStudioView
          channels={mockChannels}
          onNotice={vi.fn()}
          onRefreshChannels={vi.fn()}
          openMascot={openMascot}
          mascotId="mascot-test-1"
          step={1}
          activeTab="generator"
        />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sparky the Robot")).toBeTruthy();
    });

    const libraryTab = screen.getByRole("tab", { name: /Mascot Library/i });
    fireEvent.click(libraryTab);

    expect(openMascot).toHaveBeenCalledWith(null);
  });
});

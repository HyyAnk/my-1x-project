import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Channel, Episode, IntroOutroStyle } from "@studio/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../../api";
import { IntroOutroStyleDropdown } from "./IntroOutroStyleDropdown";

vi.mock("../../../../api", () => ({
  api: {
    listIntroOutroStyles: vi.fn(),
    listIntroOutroCategories: vi.fn(),
  },
}));

const channel = {
  channel_id: "channel-1",
  display_name: "Test Channel",
} as Channel;

const episode = {
  episode_id: "episode-1",
  quiz_config: {
    style_preset_id: "preset_cyber_neon",
    intro_outro_selection: { mode: "specific_pair", style_id: "pair-active" },
  },
} as Episode;

const styles = [
  {
    style_id: "pair-active",
    name: "Neon Pulse",
    status: "active",
  },
  {
    style_id: "pair-disabled",
    name: "Disabled Pair",
    status: "disabled",
  },
] as IntroOutroStyle[];

describe("IntroOutroStyleDropdown", () => {
  beforeEach(() => {
    vi.mocked(api.listIntroOutroStyles).mockResolvedValue({ styles });
    vi.mocked(api.listIntroOutroCategories).mockResolvedValue({
      categories: [
        {
          style_preset_id: "preset_cyber_neon",
          name: "Cyber Neon",
          icon: "🌃",
          total_count: 0,
          ready_count: 0,
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("offers the effective built-in category and reports an empty inventory", async () => {
    render(
      <IntroOutroStyleDropdown channel={channel} episode={episode} isOpen={true} onToggle={vi.fn()} onSaveIntroOutroSelection={vi.fn()} />,
    );

    expect(screen.getByText("Specific Pair")).toBeDefined();
    expect((await screen.findAllByText("Built-in Style · Cyber Neon Pulse")).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText("No ready pairs in Cyber Neon Pulse")).toBeDefined();
    expect((await screen.findAllByText("Neon Pulse")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Disabled Pair")).toBeNull();
  });

  it("saves built-in style mode without exposing a pair choice requirement", async () => {
    const onSave = vi.fn();
    render(
      <IntroOutroStyleDropdown channel={channel} episode={episode} isOpen={true} onToggle={vi.fn()} onSaveIntroOutroSelection={onSave} />,
    );

    fireEvent.click(await screen.findByRole("radio", { name: "Built-in Style · Cyber Neon Pulse" }));

    expect(onSave).toHaveBeenCalledWith({ mode: "style_builtin" });
  });

  it("shows the pinned pair and ignores conflicting legacy fields", async () => {
    const pinned: Episode = {
      ...episode,
      quiz_config: {
        ...episode.quiz_config,
        intro_outro_style_id: "none",
        intro_outro_selection: { mode: "style_builtin" },
        intro_outro_snapshot: {
          version: 1,
          selection_key: "test",
          style_preset_id: "preset_cyber_neon",
          resolved_visual_style: "pixar_3d",
          pair_id: "pair-active",
          fingerprint: "test",
          intro_duration_seconds: 2,
          outro_duration_seconds: 3,
          intro_has_audio: true,
          outro_has_audio: true,
          selected_at: new Date().toISOString(),
        },
      },
    };
    render(
      <IntroOutroStyleDropdown channel={channel} episode={pinned} isOpen={true} onToggle={vi.fn()} onSaveIntroOutroSelection={vi.fn()} />,
    );
    expect(await screen.findByText("Selected pair: Neon Pulse")).toBeDefined();
    expect(screen.queryByText("No ready pairs in Cyber Neon Pulse")).toBeNull();
    expect((screen.getByRole("radio", { name: "Built-in Style · Cyber Neon Pulse" }) as HTMLInputElement).checked).toBe(true);
  });
});

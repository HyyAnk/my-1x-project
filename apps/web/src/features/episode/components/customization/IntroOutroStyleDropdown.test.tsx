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
});

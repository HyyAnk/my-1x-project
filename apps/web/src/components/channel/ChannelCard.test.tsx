import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChannelCard } from "./ChannelCard";
import { LanguageProvider } from "../../i18n";
import type { Channel } from "@studio/shared";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

function createMockChannel(overrides?: Partial<Channel>): Channel {
  return {
    channel_id: "ch_test",
    slug: "ch-test",
    display_name: "Test Channel",
    description: "A test channel",
    target_audience: "General",
    language: "English",
    country: "GLOBAL",
    market: "",
    channel_dna_path: "channels/ch_test/channel_dna.md",
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    episode_count: 5,
    voice_reference_path: null,
    selected_styles: ["pixar_3d"],
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
      scale: 1.0,
      offset_x: 0,
      offset_y: 0,
      flip_x: false,
      show_in_intro: true,
      show_in_outro: true,
      show_in_question: true,
    },
    ...overrides,
  };
}

describe("ChannelCard - Video Count Highlight Badge", () => {
  it("renders highlighted badge with multiple videos", () => {
    const channel = createMockChannel({ episode_count: 8 });
    const { container } = render(
      <ChannelCard channel={channel} index={1} onOpen={vi.fn()} onDelete={vi.fn()} />,
      { wrapper },
    );

    const badge = container.querySelector(".channel-video-count-badge");
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains("has-videos")).toBe(true);
    expect(badge?.querySelector(".count-number")?.textContent).toBe("8");
    expect(badge?.querySelector(".count-label")?.textContent).toBe("videos");
  });

  it("renders singular video label when episode_count is 1", () => {
    const channel = createMockChannel({ episode_count: 1 });
    const { container } = render(
      <ChannelCard channel={channel} index={1} onOpen={vi.fn()} onDelete={vi.fn()} />,
      { wrapper },
    );

    const badge = container.querySelector(".channel-video-count-badge");
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains("has-videos")).toBe(true);
    expect(badge?.querySelector(".count-number")?.textContent).toBe("1");
    expect(badge?.querySelector(".count-label")?.textContent).toBe("video");
  });

  it("renders is-empty badge when episode_count is 0", () => {
    const channel = createMockChannel({ episode_count: 0 });
    const { container } = render(
      <ChannelCard channel={channel} index={1} onOpen={vi.fn()} onDelete={vi.fn()} />,
      { wrapper },
    );

    const badge = container.querySelector(".channel-video-count-badge");
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains("is-empty")).toBe(true);
    expect(badge?.querySelector(".count-number")?.textContent).toBe("0");
    expect(badge?.querySelector(".count-label")?.textContent).toBe("videos");
  });
});

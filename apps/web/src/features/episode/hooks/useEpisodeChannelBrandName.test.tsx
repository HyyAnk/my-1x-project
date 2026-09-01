import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, render, fireEvent, screen } from "@testing-library/react";
import type { Channel, Episode } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { api } from "../../../api";
import { useEpisodeChannelBrandName } from "./useEpisodeChannelBrandName";
import { useEpisodeStylePreview } from "./useEpisodeStylePreview";
import { ChannelBrandNameControl } from "../components/customization/ChannelBrandNameControl";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockChannel: Channel = {
  channel_id: "ch-1",
  slug: "tino-quiz",
  display_name: "Tino Channel",
  description: "Quiz channel",
  status: "ACTIVE",
  target_audience: "kids",
  default_palette_id: "sunny",
  default_thinking_bar_style: "star_slider",
  default_question_box_style: "candy_pop",
  default_counter_style: "hanging_woodsign",
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
  mascot_id: "mascot-tino",
  mascot_config: {
    enabled: true,
    position: "bottom_left",
    scale: 1.0,
    offset_x: 0,
    offset_y: 0,
    flip_x: false,
    show_in_intro: false,
    show_in_outro: false,
    show_in_question: true,
  },
} as unknown as Channel;

const mockEpisode: Episode = {
  episode_id: "ep-1",
  channel_id: "ch-1",
  slug: "planets-quiz",
  topic: {
    title: "Planets Quiz",
    hook: "Discover space",
    premise: "Fun facts",
  },
  stage: "SELECTED",
  script_path: "episodes/ep-1/script.md",
  scene_plan_path: "episodes/ep-1/scenes.json",
  dialogue_script_path: "episodes/ep-1/dialogue.json",
  video_prompts_path: "episodes/ep-1/prompts.json",
  target_duration_minutes: 8,
  target_word_count: 1050,
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
  quiz_config: {
    visual_theme: "candy_arcade",
    palette_id: "sunny",
    style_preset_id: "custom",
    question_box_style: "candy_pop",
    answer_card_style: "glossy_arcade",
    question_counter_style: "hanging_woodsign",
    thinking_bar_style: "star_slider",
    visual_style: "mixed",
    quiz_format: "multiple_choice",
    age_band: "7-9",
    answer_mode: "voice_and_reveal",
    resolved_visual_style: "flat_vector",
    question_count: 8,
    channel_brand_name: "Tino",
  },
} as unknown as Episode;

describe("useEpisodeChannelBrandName", () => {
  let setEpisode: ReturnType<typeof vi.fn>;
  let onNotice: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    setEpisode = vi.fn();
    onNotice = vi.fn();
  });

  it("initializes draft from episode.quiz_config.channel_brand_name", () => {
    const { result } = renderHook(
      () =>
        useEpisodeChannelBrandName({
          channel: mockChannel,
          episode: mockEpisode,
          setEpisode,
          onNotice,
        }),
      { wrapper },
    );

    expect(result.current.draft).toBe("Tino");
    expect(result.current.effectiveBrandName).toBe("Tino");
  });

  it("falls back to channel.display_name when episode brand override is empty", () => {
    const episodeWithoutBrand: Episode = {
      ...mockEpisode,
      quiz_config: { ...mockEpisode.quiz_config, channel_brand_name: "" },
    };

    const { result } = renderHook(
      () =>
        useEpisodeChannelBrandName({
          channel: mockChannel,
          episode: episodeWithoutBrand,
          setEpisode,
          onNotice,
        }),
      { wrapper },
    );

    expect(result.current.draft).toBe("Tino Channel");
    expect(result.current.effectiveBrandName).toBe("Tino Channel");
  });

  it("updates draft immediately when setDraft is called", () => {
    const { result } = renderHook(
      () =>
        useEpisodeChannelBrandName({
          channel: mockChannel,
          episode: mockEpisode,
          setEpisode,
          onNotice,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setDraft("Robot World");
    });

    expect(result.current.draft).toBe("Robot World");
    expect(result.current.effectiveBrandName).toBe("Robot World");
  });

  it("saves changes to the server and applies updated episode state without reload", async () => {
    const updatedEpisode: Episode = {
      ...mockEpisode,
      quiz_config: { ...mockEpisode.quiz_config, channel_brand_name: "Robot World" },
    };

    const updateEpisodeSpy = vi.spyOn(api, "updateEpisode").mockResolvedValue(updatedEpisode);

    const { result } = renderHook(
      () =>
        useEpisodeChannelBrandName({
          channel: mockChannel,
          episode: mockEpisode,
          setEpisode,
          onNotice,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setDraft("Robot World");
    });

    await act(async () => {
      await result.current.save();
    });

    expect(updateEpisodeSpy).toHaveBeenCalledWith("ch-1", "ep-1", { channel_brand_name: "Robot World" });
    expect(setEpisode).toHaveBeenCalledWith(updatedEpisode);
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good" }));
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("prevents duplicate submissions while save is in-flight", async () => {
    let resolvePromise!: (val: Episode) => void;
    const pendingPromise = new Promise<Episode>((res) => {
      resolvePromise = res;
    });
    const updateEpisodeSpy = vi.spyOn(api, "updateEpisode").mockReturnValue(pendingPromise);

    const { result } = renderHook(
      () =>
        useEpisodeChannelBrandName({
          channel: mockChannel,
          episode: mockEpisode,
          setEpisode,
          onNotice,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setDraft("Brand A");
    });

    let savePromise1: Promise<void>;
    act(() => {
      savePromise1 = result.current.save();
    });

    expect(result.current.saving).toBe(true);

    // Call save again while saving is true
    act(() => {
      void result.current.save();
    });

    expect(updateEpisodeSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePromise(mockEpisode);
      await savePromise1;
    });

    expect(result.current.saving).toBe(false);
  });

  it("handles server failure by keeping the user draft intact and providing error + retry", async () => {
    vi.spyOn(api, "updateEpisode").mockRejectedValue(new Error("Network timeout"));

    const { result } = renderHook(
      () =>
        useEpisodeChannelBrandName({
          channel: mockChannel,
          episode: mockEpisode,
          setEpisode,
          onNotice,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setDraft("Jurassic World");
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.draft).toBe("Jurassic World");
    expect(result.current.error).toBe("Network timeout");
    expect(result.current.saving).toBe(false);

    // Retry
    const updated: Episode = {
      ...mockEpisode,
      quiz_config: { ...mockEpisode.quiz_config, channel_brand_name: "Jurassic World" },
    };
    vi.spyOn(api, "updateEpisode").mockResolvedValue(updated);

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.error).toBeNull();
    expect(setEpisode).toHaveBeenCalledWith(updated);
  });

  it("reverts draft on revert() (e.g. Escape key pressed)", () => {
    const { result } = renderHook(
      () =>
        useEpisodeChannelBrandName({
          channel: mockChannel,
          episode: mockEpisode,
          setEpisode,
          onNotice,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setDraft("Changed Name");
    });
    expect(result.current.draft).toBe("Changed Name");

    act(() => {
      result.current.revert();
    });
    expect(result.current.draft).toBe("Tino");
  });
});

describe("ChannelBrandNameControl Component", () => {
  it("renders input with max length 32 and handles change, blur save, and Escape revert", () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    const onRevert = vi.fn();
    const onRetry = vi.fn();

    render(
      <LanguageProvider>
        <ChannelBrandNameControl value="My Channel" onChange={onChange} onSave={onSave} onRevert={onRevert} onRetry={onRetry} />
      </LanguageProvider>,
    );

    const input = screen.getByRole("textbox");
    expect(input.getAttribute("value")).toBe("My Channel");
    expect(input.getAttribute("maxlength")).toBe("32");

    fireEvent.change(input, { target: { value: "New Channel" } });
    expect(onChange).toHaveBeenCalledWith("New Channel");

    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onRevert).toHaveBeenCalled();
  });

  it("renders error message and retry button when error is present", () => {
    const onRetry = vi.fn();

    render(
      <LanguageProvider>
        <ChannelBrandNameControl
          value="My Channel"
          onChange={vi.fn()}
          onSave={vi.fn()}
          onRevert={vi.fn()}
          onRetry={onRetry}
          error="Connection failed"
        />
      </LanguageProvider>,
    );

    expect(screen.getByText("Connection failed")).toBeDefined();
    const retryBtn = screen.getByRole("button", { name: /Retry|Thử lại/i });
    expect(retryBtn).toBeDefined();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("useEpisodeStylePreview with Mascot and Brand Name", () => {
  it("passes channel.mascot_config and effective channelBrandName to sandbox preview API", async () => {
    const previewSpy = vi.spyOn(api, "previewSandboxComposition").mockResolvedValue({
      html: "<section>Preview</section>",
      css: "",
      contrast_report: { ok: true, ratio: 5, message: "OK" },
    });

    renderHook(
      () =>
        useEpisodeStylePreview({
          channel: mockChannel,
          episode: mockEpisode,
          candidate: null,
          channelBrandName: "Robot World",
        }),
      { wrapper },
    );

    // Wait for debounced preview invocation
    await vi.waitFor(() => {
      expect(previewSpy).toHaveBeenCalled();
    });

    expect(previewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mascot_id: "mascot-tino",
        mascot_enabled: true,
        mascot_position: "bottom_left",
        channel_brand_name: "Robot World",
      }),
    );
  });

  it("disables mascot in preview when channel mascot_config is disabled", async () => {
    const disabledMascotChannel: Channel = {
      ...mockChannel,
      mascot_config: { ...mockChannel.mascot_config, enabled: false },
    };

    const previewSpy = vi.spyOn(api, "previewSandboxComposition").mockResolvedValue({
      html: "<section>Preview</section>",
      css: "",
      contrast_report: { ok: true, ratio: 5, message: "OK" },
    });

    renderHook(
      () =>
        useEpisodeStylePreview({
          channel: disabledMascotChannel,
          episode: mockEpisode,
          candidate: null,
          channelBrandName: "Robot World",
        }),
      { wrapper },
    );

    await vi.waitFor(() => {
      expect(previewSpy).toHaveBeenCalled();
    });

    expect(previewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mascot_enabled: false,
      }),
    );
  });
});

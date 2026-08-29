import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { api } from "../../../api";
import { useSandboxPreviewRenderer } from "./useSandboxPreviewRenderer";
import { useSandboxBrandNameState, SANDBOX_DEFAULT_BRAND_NAME } from "./useSandboxBrandNameState";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxQuestionState } from "./useSandboxQuestionState";
import type { SandboxTimelineState } from "./useSandboxTimelineState";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe("useSandboxBrandNameState", () => {
  it("initializes with default name Tino", () => {
    const { result } = renderHook(() => useSandboxBrandNameState(), { wrapper });
    expect(result.current.channelBrandName).toBe(SANDBOX_DEFAULT_BRAND_NAME);
  });

  it("updates channelBrandName when setter is called", () => {
    const { result } = renderHook(() => useSandboxBrandNameState(), { wrapper });
    act(() => {
      result.current.setChannelBrandName("Robot World");
    });
    expect(result.current.channelBrandName).toBe("Robot World");
  });
});

describe("useSandboxPreviewRenderer", () => {
  let mockDesign: SandboxDesignState;
  let mockMascot: SandboxMascotState;
  let mockQuestion: SandboxQuestionState;
  let mockTimeline: SandboxTimelineState;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockDesign = {
      theme: "candy_arcade",
      setTheme: vi.fn(),
      paletteId: "lime",
      setPaletteId: vi.fn(),
      layoutId: "media_left_choices_right",
      setLayoutId: vi.fn(),
      thinkingBarStyle: "star_slider",
      setThinkingBarStyle: vi.fn(),
      questionBoxStyle: "candy_pop",
      setQuestionBoxStyle: vi.fn(),
      answerCardStyle: "glossy_arcade",
      setAnswerCardStyle: vi.fn(),
      counterStyle: "hanging_woodsign",
      setCounterStyle: vi.fn(),
    };
    mockMascot = {
      mascots: [
        {
          id: "mascot-tino",
          name: "Tino",
          created_at: "2026-08-30T00:00:00.000Z",
          updated_at: "2026-08-30T00:00:00.000Z",
          actions: {},
          concept_art_url: "/tino.png",
          voice_id: "voice-1",
        },
      ],
      mascotId: "mascot-tino",
      setMascotId: vi.fn(),
      mascotEnabled: true,
      setMascotEnabled: vi.fn(),
      mascotAction: "thinking",
      setMascotAction: vi.fn(),
      mascotPosition: "bottom_left",
      setMascotPosition: vi.fn(),
      mascotScale: 1.0,
      setMascotScale: vi.fn(),
      mascotOffsetX: 0,
      setMascotOffsetX: vi.fn(),
      mascotOffsetY: 0,
      setMascotOffsetY: vi.fn(),
      mascotFlipX: false,
      setMascotFlipX: vi.fn(),
      activeMascot: null,
    };
    mockQuestion = {
      sampleQuestions: [],
      questionText: "Sample question?",
      setQuestionText: vi.fn(),
      choices: ["Choice A", "Choice B", "Choice C"],
      setChoices: vi.fn(),
      correctChoiceIndex: 0,
      setCorrectChoiceIndex: vi.fn(),
      questionNumber: 1,
      setQuestionNumber: vi.fn(),
      totalQuestions: 8,
      setTotalQuestions: vi.fn(),
      factCardTitle: "Fact",
      factCardText: "Fact detail",
      setFactCardText: vi.fn(),
      handleApplyPresetQuestion: vi.fn(),
      handleChoiceChange: vi.fn(),
    };
    mockTimeline = {
      phase: "choices",
      setPhase: vi.fn(),
      isPlaying: false,
      setIsPlaying: vi.fn(),
      useScrubber: false,
      setUseScrubber: vi.fn(),
      timelineSeconds: 0,
      setTimelineSeconds: vi.fn(),
      handlePhaseChange: vi.fn(),
      handleScrubberChange: vi.fn(),
    };
  });

  it("passes channel_brand_name to previewSandboxComposition request", async () => {
    const previewSpy = vi.spyOn(api, "previewSandboxComposition").mockResolvedValue({
      html: "<section>Sandbox Preview</section>",
      css: "",
      contrast_report: { ok: true, ratio: 5, message: "OK" },
    });

    renderHook(
      () =>
        useSandboxPreviewRenderer({
          design: mockDesign,
          mascot: mockMascot,
          question: mockQuestion,
          timeline: mockTimeline,
          aspectRatio: "16:9",
          channelBrandName: "Jurassic World",
        }),
      { wrapper },
    );

    await vi.waitFor(() => {
      expect(previewSpy).toHaveBeenCalled();
    });

    expect(previewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_brand_name: "Jurassic World",
        mascot_enabled: true,
        mascot_id: "mascot-tino",
      }),
    );
  });

  it("disables mascot in request when mascotEnabled is false", async () => {
    mockMascot.mascotEnabled = false;

    const previewSpy = vi.spyOn(api, "previewSandboxComposition").mockResolvedValue({
      html: "<section>Sandbox Preview</section>",
      css: "",
      contrast_report: { ok: true, ratio: 5, message: "OK" },
    });

    renderHook(
      () =>
        useSandboxPreviewRenderer({
          design: mockDesign,
          mascot: mockMascot,
          question: mockQuestion,
          timeline: mockTimeline,
          aspectRatio: "16:9",
          channelBrandName: "Jurassic World",
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

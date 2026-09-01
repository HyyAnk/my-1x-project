import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { api } from "../../../api";
import * as previewFontVerification from "../../previewFonts/verifyPreviewFonts";
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
      backgroundStyle: "candy_rays",
      setBackgroundStyle: vi.fn(),
    };
    mockMascot = {
      mascots: [
        {
          id: "mascot-tino",
          name: "Tino",
          description: "",
          visual_style: "pixar_3d",
          master_prompt: "",
          master_image_url: "/tino.png",
          color_theme: "#06b6d4",
          actions: {},
          assigned_channel_ids: [],
          created_at: "2026-08-30T00:00:00.000Z",
          updated_at: "2026-08-30T00:00:00.000Z",
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
      resetToDefaultPlacement: vi.fn(),
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
    };
    mockTimeline = {
      phase: "choices",
      setPhase: vi.fn(),
      isPlaying: false,
      setIsPlaying: vi.fn(),
      handleTogglePlay: vi.fn(),
      useScrubber: false,
      setUseScrubber: vi.fn(),
      timelineSeconds: 0,
      setTimelineSeconds: vi.fn(),
      handlePhaseChange: vi.fn(),
      handleScrubberChange: vi.fn(),
      totalDuration: 11.8,
      isMuted: false,
      toggleMute: vi.fn(),
      setMuted: vi.fn(),
      iframeRef: { current: null },
      seekIframe: vi.fn(),
      playIframe: vi.fn(),
      pauseIframe: vi.fn(),
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

  it("U-04 sends the latest selected layout and content after a Sandbox mutation", async () => {
    const previewSpy = vi.spyOn(api, "previewSandboxComposition").mockResolvedValue({
      html: "<section>Sandbox Preview</section>",
      css: "",
      contrast_report: { ok: true, ratio: 5, message: "OK" },
    });

    const { rerender } = renderHook(
      ({ layoutId, questionText }: { layoutId: SandboxDesignState["layoutId"]; questionText: string }) =>
        useSandboxPreviewRenderer({
          design: { ...mockDesign, layoutId },
          mascot: mockMascot,
          question: { ...mockQuestion, questionText },
          timeline: mockTimeline,
          aspectRatio: "16:9",
        }),
      {
        initialProps: { layoutId: "media_left_choices_right", questionText: "Initial question" },
        wrapper,
      },
    );

    await vi.waitFor(() =>
      expect(previewSpy).toHaveBeenCalledWith(
        expect.objectContaining({ layout_id: "media_left_choices_right", question_text: "Initial question" }),
      ),
    );

    rerender({ layoutId: "visual_choices_three", questionText: "Newest question" });

    await vi.waitFor(() =>
      expect(previewSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ layout_id: "visual_choices_three", question_text: "Newest question" }),
      ),
    );
  });

  it("P2-INT-04 acknowledges an incompatible preview error without replacing a successful preview", async () => {
    const onNotice = vi.fn();
    vi.spyOn(api, "previewSandboxComposition").mockRejectedValue(new Error("Layout does not support two visual choices"));

    const { result } = renderHook(
      () =>
        useSandboxPreviewRenderer({
          design: { ...mockDesign, layoutId: "visual_choices_three" },
          mascot: mockMascot,
          question: { ...mockQuestion, choices: ["True", "False"] },
          timeline: mockTimeline,
          aspectRatio: "16:9",
          onNotice,
        }),
      { wrapper },
    );

    await vi.waitFor(() => expect(result.current.previewError).toBe("Layout does not support two visual choices"));
    expect(result.current.loading).toBe(false);
    expect(result.current.previewHtml).toBe("");
    expect(onNotice).toHaveBeenCalledWith({ tone: "bad", message: "Layout does not support two visual choices" });
  });

  it("P8C-ASY-01 acknowledges a slow request immediately and confirms success after frame verification", async () => {
    const slowResponse = deferred<ReturnType<typeof previewResponse>>();
    vi.spyOn(api, "previewSandboxComposition").mockReturnValue(slowResponse.promise);
    vi.spyOn(previewFontVerification, "verifyPreviewFonts").mockResolvedValue(undefined);

    const { result } = renderHook(
      () =>
        useSandboxPreviewRenderer({
          design: mockDesign,
          mascot: mockMascot,
          question: mockQuestion,
          timeline: mockTimeline,
          aspectRatio: "16:9",
        }),
      { wrapper },
    );

    await vi.waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.previewError).toBeNull();
    slowResponse.resolve(previewResponse("confirmed-slow"));
    await vi.waitFor(() => expect(result.current.pendingPreviewHtml).toContain("confirmed-slow"));

    await act(async () => {
      await result.current.verifyPendingPreview(document.createElement("iframe"), result.current.pendingPreviewHtml);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.previewHtml).toContain("confirmed-slow");
  });

  it("P8C-ASY-01 preserves input on error and retries the current selection", async () => {
    let failPreview = true;
    const previewSpy = vi.spyOn(api, "previewSandboxComposition").mockImplementation(() => {
      return failPreview ? Promise.reject(new Error("Preview unavailable")) : Promise.resolve(previewResponse("retry-success"));
    });

    const { result } = renderHook(
      () =>
        useSandboxPreviewRenderer({
          design: { ...mockDesign, backgroundStyle: "aurora_glow" },
          mascot: mockMascot,
          question: mockQuestion,
          timeline: mockTimeline,
          aspectRatio: "16:9",
        }),
      { wrapper },
    );

    await vi.waitFor(() => expect(result.current.previewError).toBe("Preview unavailable"));
    expect(result.current.loading).toBe(false);

    failPreview = false;
    await act(async () => {
      await result.current.renderPreview();
    });
    await vi.waitFor(() => expect(result.current.pendingPreviewHtml).toContain("retry-success"));
    expect(result.current.previewError).toBeNull();
    expect(previewSpy).toHaveBeenLastCalledWith(expect.objectContaining({ background_style: "aurora_glow" }));
  });

  it("P8C-ASY-01 ignores an older response after a rapid background change", async () => {
    const first = deferred<ReturnType<typeof previewResponse>>();
    const second = deferred<ReturnType<typeof previewResponse>>();
    const previewSpy = vi
      .spyOn(api, "previewSandboxComposition")
      .mockImplementation((input) => (input.background_style === "aurora_glow" ? second.promise : first.promise));

    const { result, rerender } = renderHook(
      ({ backgroundStyle }: { backgroundStyle: SandboxDesignState["backgroundStyle"] }) =>
        useSandboxPreviewRenderer({
          design: { ...mockDesign, backgroundStyle },
          mascot: mockMascot,
          question: mockQuestion,
          timeline: mockTimeline,
          aspectRatio: "16:9",
        }),
      { initialProps: { backgroundStyle: "candy_rays" }, wrapper },
    );

    await vi.waitFor(() => expect(previewSpy).toHaveBeenCalledWith(expect.objectContaining({ background_style: "candy_rays" })));
    rerender({ backgroundStyle: "aurora_glow" });
    await vi.waitFor(() => expect(previewSpy).toHaveBeenCalledWith(expect.objectContaining({ background_style: "aurora_glow" })));

    second.resolve(previewResponse("latest-aurora"));
    await vi.waitFor(() => expect(result.current.pendingPreviewHtml).toContain("latest-aurora"));
    first.resolve(previewResponse("stale-candy"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.pendingPreviewHtml).toContain("latest-aurora");
    expect(result.current.pendingPreviewHtml).not.toContain("stale-candy");
  });
});

function previewResponse(marker: string) {
  return {
    html: `<section>${marker}</section>`,
    css: "",
    contrast_report: { ok: true, ratio: 5, message: "OK" },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { VideoTitle } from "@studio/shared";
import { quizApi } from "../../../api/quizApi";
import { VideoTitleCard } from "../components/VideoTitleCard";
import { computeTitleSeoMetrics } from "../utils/videoTitleMetrics";
import { useVideoTitle } from "./useVideoTitle";

const sampleTitle: VideoTitle = {
  title: "World Geography Quiz: 5 Questions Only Experts Get Right",
  primary_keyword: "world geography quiz",
  char_count: 56,
  language: "English",
  source: "llm",
  generated_at: "2026-10-01T00:00:00.000Z",
};

describe("computeTitleSeoMetrics", () => {
  it("rates length and keyword placement", () => {
    expect(computeTitleSeoMetrics(sampleTitle.title, sampleTitle.primary_keyword)).toEqual({
      charCount: 56,
      lengthStatus: "optimal",
      keywordPresent: true,
      keywordFrontLoaded: true,
    });
    expect(computeTitleSeoMetrics("x".repeat(80), "geo").lengthStatus).toBe("truncated");
    expect(computeTitleSeoMetrics("x".repeat(101), "geo").lengthStatus).toBe("overflow");
    expect(computeTitleSeoMetrics(`${"Can you answer these tricky questions about the"} world geography quiz`, "world geography quiz").keywordFrontLoaded).toBe(
      false,
    );
  });
});

describe("useVideoTitle and VideoTitleCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("regenerates the title and refreshes the aligned description", async () => {
    const regenerated = { ...sampleTitle, title: "World Geography Quiz: 5 Questions - Can You Score 5/5?" };
    vi.spyOn(quizApi, "generateVideoTitle").mockResolvedValue({ title: regenerated, description: null, artifact_path: "" });
    const onUpdated = vi.fn();
    const { result } = renderHook(() => useVideoTitle({ channelId: "ch-1", episodeId: "ep-1", initialTitle: sampleTitle, onUpdated }));

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.title).toEqual(regenerated);
    expect(result.current.draftTitle).toBe(regenerated.title);
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it("saves a manual edit only when it changed and fits the YouTube limit", async () => {
    const saveSpy = vi
      .spyOn(quizApi, "saveVideoTitle")
      .mockResolvedValue({ title: { ...sampleTitle, title: "World Geography Quiz: 5 Capitals", source: "manual" }, description: null, artifact_path: "" });
    const { result } = renderHook(() => useVideoTitle({ channelId: "ch-1", episodeId: "ep-1", initialTitle: sampleTitle }));

    expect(result.current.canSave).toBe(false);
    act(() => result.current.setDraftTitle("x".repeat(101)));
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setDraftTitle("World Geography Quiz: 5 Capitals"));
    expect(result.current.canSave).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(saveSpy).toHaveBeenCalledWith("ch-1", "ep-1", { title: "World Geography Quiz: 5 Capitals" });
    expect(result.current.title?.source).toBe("manual");
  });

  it("blocks generation before quiz questions exist", async () => {
    const onNotice = vi.fn();
    const generateSpy = vi.spyOn(quizApi, "generateVideoTitle");
    vi.spyOn(quizApi, "getVideoTitle").mockResolvedValue({ title: null });
    const { result } = renderHook(() => useVideoTitle({ channelId: "ch-1", episodeId: "ep-1", hasQuiz: false, onNotice }));

    await act(async () => {
      await result.current.generate();
    });

    expect(generateSpy).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "bad" }));
  });

  it("renders the title with its SEO checks", () => {
    render(<VideoTitleCard channelId="ch-1" episodeId="ep-1" initialTitle={sampleTitle} />);

    const input = screen.getByLabelText<HTMLInputElement>("YouTube video title");
    expect(input.value).toBe(sampleTitle.title);
    expect(screen.getByText("AI Generated")).toBeTruthy();
    expect(screen.getByText(`Keyword "world geography quiz" is front-loaded`)).toBeTruthy();

    fireEvent.change(input, { target: { value: "Can you answer these tricky questions about the world geography quiz" } });
    expect(screen.getByText(/Move "world geography quiz" into the first 40 chars/)).toBeTruthy();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { api } from "../../api";
import { ApiError } from "../../api/client";
import { ShortReelStudio } from "./ShortReelStudio";
import { createMockChannel, createMockShortReel } from "../../../test/helpers/shortReelStudioTestUtils";

describe("ShortReelStudio Loading And Initial Render", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // UI-01: Initial Load & Loading State
  it("displays loading state while draft is being fetched", () => {
    vi.spyOn(api, "getShortReel").mockReturnValue(new Promise(() => {}));
    const channel = createMockChannel();

    const { container } = render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    expect(container.querySelector(".loading-state")).not.toBeNull();
  });

  it("recovers a failed draft request automatically when connectivity returns", async () => {
    vi.spyOn(api, "getShortReel")
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce({ short_reel: createMockShortReel() });
    const view = render(<ShortReelStudio channel={createMockChannel()} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);
    await waitFor(() => expect(view.getByText("Failed to Load Short-Reel")).toBeDefined());
    fireEvent(window, new Event("online"));
    await waitFor(() => expect(view.getByText("Cheetah vs Greyhound Speed")).toBeDefined());
    expect(view.container.querySelector(".loading-state")).toBeNull();
  });

  it("renders draft details with trailing period stripped from title", async () => {
    const mockReel = createMockShortReel();
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();

    const { getByText, queryByText, getByTestId } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />,
    );

    await waitFor(() => {
      // Clean title without trailing period
      expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined();
      expect(queryByText("Cheetah vs Greyhound Speed.")).toBeNull();
    });

    // Verify badges
    expect(getByText("9:16 Short-Reel")).toBeDefined();
    expect(getByText("Rev v1")).toBeDefined();
    expect(getByText("Draft")).toBeDefined();

    // Verify Source question
    const questionEl = getByTestId("short-reel-source-question");
    expect(questionEl.textContent).toContain("Which animal has the fastest recorded land sprint speed?");

    // Verify choices
    const choiceA = getByTestId("choice-A");
    expect(choiceA.textContent).toContain("Cheetah");
    expect(choiceA.textContent).toContain("Correct Answer");

    const choiceB = getByTestId("choice-B");
    expect(choiceB.textContent).toContain("Greyhound");
    expect(choiceB.textContent).not.toContain("Correct Answer");
  });

  it("ignores an older response after the requested reel changes", async () => {
    let resolveOld!: (value: { short_reel: ReturnType<typeof createMockShortReel> }) => void;
    const oldRequest = new Promise<{ short_reel: ReturnType<typeof createMockShortReel> }>((resolve) => {
      resolveOld = resolve;
    });
    const newest = { ...createMockShortReel(), reel_id: "sreel_new", topic: { ...createMockShortReel().topic, title: "Newest Reel" } };
    vi.spyOn(api, "getShortReel").mockReturnValueOnce(oldRequest).mockResolvedValueOnce({ short_reel: newest });
    const channel = createMockChannel();
    const view = render(<ShortReelStudio channel={channel} reelId="sreel_old" onBack={vi.fn()} onNotice={vi.fn()} />);

    view.rerender(<ShortReelStudio channel={channel} reelId="sreel_new" onBack={vi.fn()} onNotice={vi.fn()} />);
    await waitFor(() => expect(view.getByText("Newest Reel")).toBeDefined());

    resolveOld({ short_reel: { ...createMockShortReel(), topic: { ...createMockShortReel().topic, title: "Stale Reel" } } });
    await Promise.resolve();
    expect(view.queryByText("Stale Reel")).toBeNull();
  });

  it("handles not-found error state and supports retry", async () => {
    const getShortReelSpy = vi
      .spyOn(api, "getShortReel")
      .mockRejectedValueOnce(new ApiError("Short-Reel not found", 404, "SHORT_REEL_NOT_FOUND"))
      .mockResolvedValueOnce({ short_reel: createMockShortReel() });

    const channel = createMockChannel();
    const onNoticeMock = vi.fn();

    const { getByText, getByRole } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNoticeMock} />,
    );

    await waitFor(() => {
      expect(getByText("Short-Reel Not Found")).toBeDefined();
    });

    expect(onNoticeMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "bad", message: "Short-Reel not found" }));

    const retryBtn = getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined();
    });

    expect(getShortReelSpy).toHaveBeenCalledTimes(2);
  });

  it("uses the HTTP status instead of error-message text to classify not found", async () => {
    vi.spyOn(api, "getShortReel").mockRejectedValue(new ApiError("Draft is unavailable", 404, "SHORT_REEL_NOT_FOUND"));
    const channel = createMockChannel();
    const view = render(<ShortReelStudio channel={channel} reelId="missing" onBack={vi.fn()} onNotice={vi.fn()} />);
    await waitFor(() => expect(view.getByText("Short-Reel Not Found")).toBeDefined());
    expect(view.getByText("Draft is unavailable")).toBeDefined();
  });

  it("invokes onBack callback when clicking Back button", async () => {
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: createMockShortReel() });
    const onBackMock = vi.fn();
    const channel = createMockChannel();

    const { getByRole } = render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={onBackMock} onNotice={vi.fn()} />);

    await waitFor(() => {
      expect(getByRole("button", { name: /back to channel/i })).toBeDefined();
    });

    fireEvent.click(getByRole("button", { name: /back to channel/i }));
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});

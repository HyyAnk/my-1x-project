import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { api } from "../../api";
import { ShortReelStudio } from "./ShortReelStudio";
import {
  createMockChannel,
  createMockReadyUnits,
  createMockScript,
  createMockShortReel,
} from "../../../test/helpers/shortReelStudioTestUtils";
import type { ShortReelRecord } from "@studio/shared";

describe("ShortReelStudio Export And Asset Delivery", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // UI-04: Clipboard Fallback (Permission Rejection)
  it("renders manual copy dialog when clipboard writeText is denied", async () => {
    const mockReel = createMockShortReel({
      script: createMockScript(),
      units: {
        ...createMockShortReel().units,
        publishing: {
          state: "ready",
          last_accepted_payload: {
            hook: "Who hits 60 mph fastest?",
            description: "Cheetah vs Greyhound speed comparison.",
            cta: "Subscribe for more nature facts!",
            hashtags: ["#animals", "#speed"],
          },
          current_attempt: null,
        },
      },
    });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();
    const onNotice = vi.fn();

    // Mock clipboard writeText rejection
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError: Clipboard access denied")),
      },
    });

    const { getByRole, getByText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Switch to Publishing tab
    fireEvent.click(getByRole("tab", { name: /publishing metadata/i }));

    // Click Copy Publishing Text
    await waitFor(() => expect(getByRole("button", { name: /copy publishing text/i })).toBeDefined());
    fireEvent.click(getByRole("button", { name: /copy publishing text/i }));

    // Verify manual copy dialog appears with textarea
    await waitFor(() => {
      expect(getByRole("dialog", { name: /manual copy fallback/i })).toBeDefined();
      expect(getByText("Manual Copy Fallback")).toBeDefined();
    });

    // Dismiss dialog
    fireEvent.click(getByRole("button", { name: /done/i }));
    await waitFor(() => {
      expect(document.querySelector(".short-reel-modal-overlay")).toBeNull();
    });
  });

  // UI-07: Export Package Action
  it("renders accepted reference and cover bytes through scoped asset URLs with download actions", async () => {
    const reel = createMockShortReel({ script: createMockScript(), units: createMockReadyUnits() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: reel });
    const channel = createMockChannel();
    const view = render(<ShortReelStudio channel={channel} reelId={reel.reel_id} onBack={vi.fn()} onNotice={vi.fn()} />);

    await waitFor(() => expect(view.getByRole("tab", { name: /assets/i })).toBeDefined());
    fireEvent.click(view.getByRole("tab", { name: /assets/i }));

    const referenceImage = view.getByRole("img", { name: "Mascot reference" }) as HTMLImageElement;
    const coverImage = view.getByRole("img", { name: "Short-Reel cover" }) as HTMLImageElement;
    expect(referenceImage.src).toContain(`/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/assets/ref-1`);
    expect(coverImage.src).toContain(`/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/assets/cover-1`);
    expect(view.getByRole("link", { name: "Download cover" }).getAttribute("download")).toBe("short-reel-cover.png");
  });

  it("enables export package button only when all units are ready and triggers download", async () => {
    const readyReel: ShortReelRecord = {
      ...createMockShortReel({ revision: 3, script: createMockScript() }),
      stale_segments: [],
      units: createMockReadyUnits(),
    };

    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: readyReel });
    const exportSpy = vi.spyOn(api, "exportPackage").mockResolvedValue(new Blob(["mock-pkzip-bytes"]));
    const channel = createMockChannel();
    const onNotice = vi.fn();

    const { getByRole, getByText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    const exportBtn = getByRole("button", { name: /export pkzip package/i });
    expect(exportBtn.hasAttribute("disabled")).toBe(false);

    // Click Export Package
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledWith(channel.channel_id, "sreel_test_999", 3);
      expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good", message: "Package exported successfully." }));
    });
  });
});

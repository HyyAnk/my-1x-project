import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor, screen } from "@testing-library/react";
import { api } from "../../api";
import { ShortReelStudio } from "./ShortReelStudio";
import {
  createMockChannel,
  createMockReadyUnits,
  createMockShortReel,
  createNoticeSpy,
} from "../../../test/helpers/shortReelStudioTestUtils";
import { formatPublishingText } from "./utils/publishingText";

describe("ShortReelStudio Publishing (U01)", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders exactly Title and Description textboxes with no separate Hook, CTA, or Hashtags inputs (U01)", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const mockReel = createMockShortReel({ units: readyUnits });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Switch to Publishing tab
    await waitFor(() => expect(screen.getByRole("tab", { name: /Publishing/i })).toBeDefined());
    fireEvent.click(screen.getByRole("tab", { name: /Publishing/i }));

    // Exact two publishing fields
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Title" })).toBeDefined();
      expect(screen.getByRole("textbox", { name: "Description" })).toBeDefined();
    });

    // Verify absence of legacy split fields
    expect(screen.queryByRole("textbox", { name: "Hashtags" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "CTA" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Hook" })).toBeNull();
  });

  it("formats combined publishing text without duplicating hashtags or CTA", () => {
    const text = formatPublishingText({
      title: "Fastest Land Animal",
      description: "Cheetah sprints up to 70 mph!\n\n#animals #speed",
    });

    expect(text).toBe("TITLE:\nFastest Land Animal\n\nDESCRIPTION:\nCheetah sprints up to 70 mph!\n\n#animals #speed");
  });

  it("supports individual and combined copy actions", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const mockReel = createMockShortReel({ units: readyUnits });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    const onNotice = createNoticeSpy();
    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />);

    fireEvent.click(await screen.findByRole("tab", { name: /Publishing/i }));

    // Copy Title
    const copyTitleBtn = await screen.findByRole("button", { name: "Copy Title" });
    fireEvent.click(copyTitleBtn);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith("Who hits 60 mph fastest?");
    });

    // Copy Description
    const copyDescBtn = await screen.findByRole("button", { name: "Copy Description" });
    fireEvent.click(copyDescBtn);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(
        "Cheetah vs Greyhound speed comparison.\n\nSubscribe for more nature facts!\n\n#animals #speed",
      );
    });

    // Copy Publishing Text (combined)
    const copyCombinedBtn = await screen.findByRole("button", { name: "Copy Publishing Text" });
    fireEvent.click(copyCombinedBtn);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(
        "TITLE:\nWho hits 60 mph fastest?\n\nDESCRIPTION:\nCheetah vs Greyhound speed comparison.\n\nSubscribe for more nature facts!\n\n#animals #speed",
      );
    });
  });

  it("preserves migrated longer text (>80 chars title, >600 chars desc) without truncation or blocking editing", async () => {
    const channel = createMockChannel();
    const longTitle = "A".repeat(120);
    const longDesc = "B".repeat(800);
    const mockReel = createMockShortReel({
      units: {
        ...createMockReadyUnits(),
        publishing: {
          state: "ready",
          last_accepted_payload: {
            title: longTitle,
            description: longDesc,
          },
          current_attempt: null,
          accepted_dependency_fingerprint: "long-fp",
        },
      },
    });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    fireEvent.click(await screen.findByRole("tab", { name: /Publishing/i }));

    const titleInput = await screen.findByRole("textbox", { name: "Title" });
    const descInput = await screen.findByRole("textbox", { name: "Description" });

    // Both values are fully preserved
    expect((titleInput as HTMLInputElement).value).toBe(longTitle);
    expect((descInput as HTMLTextAreaElement).value).toBe(longDesc);

    // Warning counters displayed
    expect(screen.getByText("120/80")).toBeDefined();
    expect(screen.getByText("800/600")).toBeDefined();

    // User can edit without being blocked
    fireEvent.change(titleInput, { target: { value: "Updated Title" } });
    expect((titleInput as HTMLInputElement).value).toBe("Updated Title");
  });

  it("saves edited publishing details and sends update request with current revision", async () => {
    const channel = createMockChannel();
    const mockReel = createMockShortReel({ revision: 3, units: createMockReadyUnits() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    const updatedReel = {
      ...mockReel,
      revision: 4,
      units: {
        ...mockReel.units,
        publishing: {
          ...mockReel.units.publishing,
          last_accepted_payload: {
            title: "New Custom Title",
            description: "New Custom Description #shorts",
          },
        },
      },
    };
    const updateSpy = vi.spyOn(api, "updateShortReel").mockResolvedValue({
      short_reel: updatedReel,
    });

    const onNotice = createNoticeSpy();
    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />);

    fireEvent.click(await screen.findByRole("tab", { name: /Publishing/i }));

    const titleInput = await screen.findByRole("textbox", { name: "Title" });
    fireEvent.change(titleInput, { target: { value: "New Custom Title" } });

    const saveBtn = screen.getByRole("button", { name: "Save Publishing Details" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
    const updateCall = updateSpy.mock.calls[0];
    expect(updateCall[0]).toBe(channel.channel_id);
    expect(updateCall[1]).toBe(mockReel.reel_id);
    expect(updateCall[2]).toMatchObject({
      expected_revision: 3,
      command: {
        kind: "update_publishing",
        publishing: {
          title: "New Custom Title",
        },
      },
    });
  });
});

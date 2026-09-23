import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor, screen } from "@testing-library/react";
import { api } from "../../api";
import { ShortReelStudio } from "./ShortReelStudio";
import {
  createMockChannel,
  createMockReadyUnits,
  createMockShortReel,
  createMockScript,
  createNoticeSpy,
} from "../../../test/helpers/shortReelStudioTestUtils";

describe("ShortReelStudio Script Reader & Quick Copy", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the Full Script Reader View by default with all 3 segments visible simultaneously", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const mockReel = createMockShortReel({ units: readyUnits, script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Wait for the script section to load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Script Segments" })).toBeDefined();
    });

    // Verify Reader View is active by default
    expect(screen.getByRole("region", { name: "Full Script Reader" })).toBeDefined();

    // Verify all 3 segment storyboards are rendered at once
    expect(screen.getByRole("article", { name: "Segment 1 Storyboard" })).toBeDefined();
    expect(screen.getByRole("article", { name: "Segment 2 Storyboard" })).toBeDefined();
    expect(screen.getByRole("article", { name: "Segment 3 Storyboard" })).toBeDefined();

    // Verify presence of story recap
    expect(screen.getByText(/Target Question:/i)).toBeDefined();
    expect(screen.getAllByText("Which animal has the fastest recorded land sprint speed?").length).toBeGreaterThanOrEqual(1);
  });

  it("supports copying full script to clipboard with 1-click", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const mockReel = createMockShortReel({ units: readyUnits, script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    const onNotice = createNoticeSpy();
    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy Script" })).toBeDefined();
    });

    const copyBtn = screen.getByRole("button", { name: "Copy Script" });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });

    const copiedCall = writeTextSpy.mock.calls[0][0] as string;
    expect(copiedCall).toContain("TITLE: Cheetah vs Greyhound Speed.");
    expect(copiedCall).toContain("QUESTION: Which animal has the fastest recorded land sprint speed?");
    expect(copiedCall).toContain("--- SEGMENT 1 (0:00 - 0:08 | 8s) ---");
    expect(copiedCall).toContain("Two animals line up at the starting mark, ready for a sprint duel.");
    expect(copiedCall).toContain("--- SEGMENT 2 (0:08 - 0:17 | 9s) ---");
    expect(copiedCall).toContain("--- SEGMENT 3 (0:17 - 0:25 | 8.5s) ---");

    // Check visual feedback
    expect(screen.getByText("Copied")).toBeDefined();
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "good", message: "Full Script copied to clipboard." }),
    );
  });

  it("supports copying dialogue-only to clipboard", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const mockReel = createMockShortReel({ units: readyUnits, script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    const onNotice = createNoticeSpy();
    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy Dialogue" })).toBeDefined();
    });

    const copyDialogueBtn = screen.getByRole("button", { name: "Copy Dialogue" });
    fireEvent.click(copyDialogueBtn);

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });

    const copiedCall = writeTextSpy.mock.calls[0][0] as string;
    expect(copiedCall).toContain("Segment 1 (0:00 - 0:08):");
    expect(copiedCall).toContain("Segment 2 (0:08 - 0:17):");
    expect(copiedCall).toContain("Segment 3 (0:17 - 0:25):");

    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "good", message: "Script Dialogue copied to clipboard." }),
    );
  });

  it("renders both Full Script Reader and Segment Details Editor cohesively", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const mockReel = createMockShortReel({ units: readyUnits, script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Full Script Reader" })).toBeDefined();
      expect(screen.getByRole("tablist", { name: "Script Segment Tabs" })).toBeDefined();
      expect(screen.getByLabelText("Visual Narrative")).toBeDefined();
    });
  });

  it("navigates directly to specific segment in editor when Edit Segment is clicked from storyboard card", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const mockReel = createMockShortReel({ units: readyUnits, script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    const editBtn = await screen.findByRole("button", { name: "Edit Segment 2" });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Segment 2" })).toBeDefined();
    });
    const narrativeInput = screen.getByLabelText("Visual Narrative") as HTMLTextAreaElement;
    expect(narrativeInput.value).toContain("The cheetah explodes out of the gate");
  });

  it("toggles formatted full script plaintext preview box", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const mockReel = createMockShortReel({ units: readyUnits, script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    const toggleBtn = await screen.findByRole("button", { name: /view formatted script text/i });
    expect(screen.queryByLabelText("Formatted Full Script Output")).toBeNull();

    // Expand
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText("Formatted Full Script Output")).toBeDefined();

    // Collapse
    const hideBtn = screen.getByRole("button", { name: /hide formatted script text/i });
    fireEvent.click(hideBtn);
    expect(screen.queryByLabelText("Formatted Full Script Output")).toBeNull();
  });
});

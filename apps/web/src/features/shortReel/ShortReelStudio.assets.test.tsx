import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { api } from "../../api";
import { ShortReelStudio } from "./ShortReelStudio";
import { createMockChannel, createMockReadyUnits, createMockShortReel } from "../../../test/helpers/shortReelStudioTestUtils";

describe("ShortReelStudio Assets Presentation (U02)", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("displays channel mascot master immediately before style generation succeeds (U02)", async () => {
    const channel = createMockChannel({ mascot_id: "mascot-novy-01" });
    // References unit is missing, but channel has a mascot master
    const mockReel = createMockShortReel({
      units: {
        ...createMockReadyUnits(),
        references: {
          state: "missing",
          last_accepted_payload: null,
          current_attempt: null,
          accepted_dependency_fingerprint: null,
        },
      },
    });

    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    vi.spyOn(api, "mascot").mockResolvedValue({
      mascot: {
        id: "mascot-novy-01",
        name: "Novy",
        description: "Test mascot description",
        visual_style: "pixar_3d",
        master_prompt: "",
        master_image_url: "/api/mascots/mascot-novy-01/master.png",
        color_theme: "#06b6d4",
        actions: {},
        styles: [],
        assigned_channel_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Wait for studio to load
    await waitFor(() => expect(screen.getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Switch to Assets tab
    await waitFor(() => expect(screen.getByRole("tab", { name: /Assets/i })).toBeDefined());
    fireEvent.click(screen.getByRole("tab", { name: /Assets/i }));

    // Verify Mascot Reference section is visible with Channel Master
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Mascot Reference" })).toBeDefined();
      expect(screen.getByText("Channel Master")).toBeDefined();
      const img = screen.getByAltText("Mascot reference");
      expect(img.getAttribute("src")).toContain("/api/mascots/mascot-novy-01/master.png");
    });

    // Verify Style Reference section displays Generate Style (not Resolve References)
    expect(screen.getByRole("button", { name: "Generate Style Reference" })).toBeDefined();
  });

  it("retains previous accepted image during retry and shows per-unit error (U02)", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();

    // References has an accepted style, but current attempt failed
    const mockReel = createMockShortReel({
      units: {
        ...readyUnits,
        references: {
          state: "failed",
          last_accepted_payload: {
            references: [
              {
                asset_id: "ref-accepted-old",
                role: "style",
                path: "refs/style.png",
                mime_type: "image/png",
                width: 1080,
                height: 1920,
                checksum: "old-checksum-123",
              },
            ],
          },
          current_attempt: {
            operation_id: "op-failed-style",
            dependency_fingerprint: "old-fp",
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            error: "PROVIDER_TIMEOUT",
            error_message: "Image provider timed out after 180s.",
            retryable: true,
          },
          accepted_dependency_fingerprint: "old-fp",
        },
      },
    });

    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const generateSpy = vi.spyOn(api, "generateShortReel").mockResolvedValue({
      task: {
        task_id: "task-retry-01",
        task_type: "GENERATE_SHORT_REEL_PACKAGE",
        status: "RUNNING",
        channel_id: channel.channel_id,
        episode_id: null,
        reel_id: "sreel_test_999",
        progress_message: "Regenerating style...",
        progress_percent: 10,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        codex_thread_id: null,
        codex_turn_id: null,
        error: null,
        output_files: [],
        lock_key: "sreel_test_999:reel",
        queue_position: null,
        render_progress: null,
        scene_number: null,
        accumulated_duration_seconds: 0,
      },
      short_reel: mockReel,
    });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Wait for studio to load
    await waitFor(() => expect(screen.getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Switch to Assets tab
    await waitFor(() => expect(screen.getByRole("tab", { name: /Assets/i })).toBeDefined());
    fireEvent.click(screen.getByRole("tab", { name: /Assets/i }));

    // Verify old accepted style image is still displayed with previous output indicator
    await waitFor(() => {
      expect(screen.getByText("Previous Accepted Output")).toBeDefined();
      const styleImg = screen.getByAltText("Short-Reel 9:16 portrait style reference");
      expect(styleImg.getAttribute("src")).toContain("ref-accepted-old");
    });

    // Verify localized error message and retry button
    expect(screen.getByText("Image provider timed out after 180s.")).toBeDefined();
    const retryBtn = screen.getByRole("button", { name: "Retry Style Generation" });
    expect(retryBtn).toBeDefined();

    // Click retry
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith(channel.channel_id, "sreel_test_999", expect.objectContaining({ target: "references" }));
    });
  });

  it("shows actionable link to mascot studio when no mascot is assigned", async () => {
    const channel = createMockChannel({ mascot_id: null });
    const mockReel = createMockShortReel({
      units: {
        ...createMockReadyUnits(),
        references: {
          state: "missing",
          last_accepted_payload: null,
          current_attempt: null,
          accepted_dependency_fingerprint: null,
        },
      },
    });

    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Wait for studio to load
    await waitFor(() => expect(screen.getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Switch to Assets tab
    await waitFor(() => expect(screen.getByRole("tab", { name: /Assets/i })).toBeDefined());
    fireEvent.click(screen.getByRole("tab", { name: /Assets/i }));

    await waitFor(() => {
      expect(screen.getByText("No Mascot Assigned")).toBeDefined();
      expect(screen.getByRole("link", { name: "Open Mascot Studio" })).toBeDefined();
    });
  });
});

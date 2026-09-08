import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { api } from "../../api";
import { ApiError } from "../../api/client";
import { ShortReelStudio } from "./ShortReelStudio";
import { createMockChannel, createMockScript, createMockShortReel, createNoticeSpy } from "../../../test/helpers/shortReelStudioTestUtils";
import type { ShortReelRecord } from "@studio/shared";

describe("ShortReelStudio Draft Conflict Resolution", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // UI-02: Local Draft Preservation
  it("preserves unsaved local draft edits during silent background refresh", async () => {
    const mockReel = createMockShortReel({ script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();

    const { getByLabelText, getByText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Edit visual narrative
    const narrativeInput = getByLabelText("Visual Narrative") as HTMLTextAreaElement;
    fireEvent.change(narrativeInput, { target: { value: "Custom user draft narrative for test." } });

    // Expect unsaved draft badge
    expect(getByText("Unsaved Draft")).toBeDefined();
    expect(narrativeInput.value).toBe("Custom user draft narrative for test.");

    // Trigger silent background refresh via online event
    fireEvent(window, new Event("online"));

    // Verify local draft is NOT overwritten by remote data
    await waitFor(() => {
      expect(narrativeInput.value).toBe("Custom user draft narrative for test.");
      expect(getByText("Unsaved Draft")).toBeDefined();
    });
  });

  // UI-05: Conflict Resolution Banner
  it("preserves the original CAS revision when keeping a local draft after a remote update", async () => {
    const initialReel = createMockShortReel({ revision: 1, script: createMockScript() });
    const advancedReel: ShortReelRecord = {
      ...createMockShortReel({ revision: 2, script: createMockScript() }),
      topic: {
        ...createMockShortReel().topic,
        title: "Server Updated Title",
      },
    };

    let callCount = 0;
    vi.spyOn(api, "getShortReel").mockImplementation(() => {
      callCount++;
      return Promise.resolve({ short_reel: callCount === 1 ? initialReel : advancedReel });
    });

    const updateSpy = vi.spyOn(api, "updateShortReel").mockRejectedValue(new ApiError("Stale revision", 409, "STALE_REVISION"));

    const channel = createMockChannel();
    const onNotice = createNoticeSpy();
    const { getByLabelText, getByText, getByRole } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Edit visual narrative to dirty draft
    const narrativeInput = getByLabelText("Visual Narrative") as HTMLTextAreaElement;
    fireEvent.change(narrativeInput, { target: { value: "My edited draft" } });
    expect(getByText("Unsaved Draft")).toBeDefined();

    // Trigger online refresh which fetches rev 2
    fireEvent(window, new Event("online"));

    // Verify Conflict Alert appears
    await waitFor(() => {
      expect(getByRole("alert")).toBeDefined();
      expect(getByText("Revision Conflict Detected")).toBeDefined();
      expect(getByText(/This Short-Reel was updated to Revision v2/i)).toBeDefined();
    });

    // Click "Keep My Draft"
    fireEvent.click(getByRole("button", { name: /keep my draft/i }));

    // Verify conflict banner dismissed and draft preserved
    await waitFor(() => {
      expect(document.querySelector(".short-reel-alert-conflict")).toBeNull();
      expect(narrativeInput.value).toBe("My edited draft");
    });

    // Saving still uses the original base revision, so the server remains the authority for conflict resolution.
    const saveBtn = getByRole("button", { name: /save segment 1/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const updateRequest = updateSpy.mock.calls.at(-1)?.[2];
    expect(updateRequest?.expected_revision).toBe(1);
    expect(updateRequest?.command.kind).toBe("update_segment");
    if (updateRequest?.command.kind !== "update_segment") throw new Error("Expected an update_segment command");
    expect(updateRequest.command.segment_index).toBe(1);
    expect(updateRequest.command.segment.narrative).toBe("My edited draft");

    expect(onNotice).toHaveBeenCalled();
    const conflictNotice = onNotice.mock.calls.at(-1)?.[0];
    expect(conflictNotice?.tone).toBe("bad");
    expect(conflictNotice?.message).toContain("Conflict");
  });
});

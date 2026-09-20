import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MascotStudioActivityStatusResponse } from "@studio/shared";
import { mascotStudioActivityApi } from "../../services/mascotStudioActivityApi";
import { useMascotStudioActivity } from "./useMascotStudioActivity";

vi.mock("../../services/mascotStudioActivityApi", () => ({
  mascotStudioActivityApi: {
    getStatus: vi.fn(),
  },
}));

function statusResponse(hasActiveBatch: boolean): MascotStudioActivityStatusResponse {
  const now = new Date().toISOString();
  return {
    mascot_id: "mascot-1",
    checked_at: now,
    warnings: [],
    style_concepts: {
      active_batch: hasActiveBatch
        ? {
            id: "style-batch-active",
            mascot_id: "mascot-1",
            status: "processing",
            total_styles: 1,
            completed_count: 0,
            failed_count: 0,
            active_style_ids: ["cyber"],
            items: [],
            created_at: now,
            updated_at: now,
          }
        : null,
      queued_style_ids: [],
      active_style_ids: hasActiveBatch ? ["cyber"] : [],
    },
    styles: [],
  };
}

describe("useMascotStudioActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rehydrates in Strict Mode when the first request resolves after effect cleanup", async () => {
    let resolveFirst: (response: MascotStudioActivityStatusResponse) => void = () => undefined;
    vi.mocked(mascotStudioActivityApi.getStatus)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(statusResponse(true));

    const { result, unmount } = renderHook(() => useMascotStudioActivity("mascot-1"), { reactStrictMode: true });

    await waitFor(() => expect(result.current.activities[0]?.id).toBe("style-concepts:style-batch-active"));
    expect(mascotStudioActivityApi.getStatus).toHaveBeenCalledTimes(2);

    resolveFirst(statusResponse(false));
    await act(async () => Promise.resolve());
    expect(result.current.activities[0]?.id).toBe("style-concepts:style-batch-active");
    unmount();
  });
});

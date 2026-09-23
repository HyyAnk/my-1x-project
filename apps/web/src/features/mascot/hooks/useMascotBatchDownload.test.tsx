import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { MascotStateVariant } from "@studio/shared";
import { useMascotBatchDownload } from "./useMascotBatchDownload";
import * as downloadHelpers from "../utils/mascotSlotDownloadHelpers";

describe("useMascotBatchDownload", () => {
  const sampleVariants: MascotStateVariant[] = [{ id: "1", slot_index: 1, image_url: "/img1.png" }];

  it("handles successful batch zip download", async () => {
    const spy = vi.spyOn(downloadHelpers, "downloadVariantsAsZip").mockResolvedValueOnce({ total: 1, downloaded: 1, failed: 0 });

    const { result } = renderHook(() => useMascotBatchDownload());

    expect(result.current.isDownloading).toBe(false);
    expect(result.current.downloadingKind).toBeNull();

    let res: downloadHelpers.BatchZipDownloadResult | null = null;
    await act(async () => {
      res = await result.current.downloadSelectedZip("original", sampleVariants, "thinking");
    });

    expect(res).toEqual({ total: 1, downloaded: 1, failed: 0 });
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.downloadingKind).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it("handles download failure cleanly", async () => {
    const spy = vi.spyOn(downloadHelpers, "downloadVariantsAsZip").mockRejectedValueOnce(new Error("Network disconnect"));

    const { result } = renderHook(() => useMascotBatchDownload());

    let res: downloadHelpers.BatchZipDownloadResult | null = null;
    await act(async () => {
      res = await result.current.downloadSelectedZip("transparent", sampleVariants, "celebrate");
    });

    expect(res).toBeNull();
    expect(result.current.error).toBe("Network disconnect");
    expect(result.current.isDownloading).toBe(false);

    spy.mockRestore();
  });
});

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { VariantExportJob } from "@studio/shared";
import { ApiError } from "../../../api/client";
import { variantExportApi } from "../services/variantExportApi";
import { useVariantExport } from "./useVariantExport";
import { useExportFolders } from "./useExportFolders";

vi.mock("../services/variantExportApi", () => ({
  variantExportApi: {
    preview: vi.fn(),
    start: vi.fn(),
    status: vi.fn(),
    cancel: vi.fn(),
    folders: vi.fn(),
    validate: vi.fn(),
  },
}));
const job: VariantExportJob = {
  id: "job",
  mascot_id: "mascot",
  mode: "original",
  destination: "D:\\Exports",
  status: "running",
  total: 4,
  processed: 2,
  copied: 2,
  skipped: 0,
  failed: 0,
  current: null,
  failures: [],
  started_at: "2026-09-24T00:00:00Z",
  finished_at: null,
};
const summary = { styles: 2, thinking: 2, celebrate: 2, empty: 0 };
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("reconnects after a failed poll without losing the active job or destination", async () => {
  vi.mocked(variantExportApi.preview).mockResolvedValue({ summary, job });
  vi.mocked(variantExportApi.status)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ ...job, processed: 4, copied: 4, status: "completed", finished_at: "2026-09-24T00:00:01Z" });
  const { result } = renderHook(() => useVariantExport("mascot"));
  await act(async () => result.current.open("original"));
  expect(result.current.connectionError).toContain("Reconnecting");
  expect(result.current.destination).toBe(job.destination);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2500);
  });
  expect(result.current.job?.status).toBe("completed");
  expect(result.current.connectionError).toBeNull();
});

it("does not let an old poll overwrite cancellation", async () => {
  vi.mocked(variantExportApi.preview).mockResolvedValue({ summary, job });
  let resolve!: (job: VariantExportJob) => void;
  vi.mocked(variantExportApi.status).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  vi.mocked(variantExportApi.cancel).mockResolvedValue({ ...job, status: "cancelled", finished_at: "2026-09-24T00:00:01Z" });
  const { result } = renderHook(() => useVariantExport("mascot"));
  await act(async () => result.current.open("original"));
  await act(async () => {
    await result.current.cancel();
  });
  await act(async () => resolve(job));
  expect(result.current.job?.status).toBe("cancelled");
});

it("ignores regressing progress and retains a cancelling state until confirmed", async () => {
  vi.mocked(variantExportApi.preview).mockResolvedValue({ summary, job: { ...job, status: "cancelling" } });
  vi.mocked(variantExportApi.status)
    .mockResolvedValueOnce({ ...job, processed: 1 })
    .mockResolvedValue({ ...job, processed: 3 });
  const { result } = renderHook(() => useVariantExport("mascot"));
  await act(async () => result.current.open("original"));
  expect(result.current.job?.processed).toBe(2);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(750);
  });
  expect(result.current.job).toMatchObject({ processed: 3, status: "cancelling" });
});

it("stops polling expired jobs and explains how to recover", async () => {
  vi.mocked(variantExportApi.preview).mockResolvedValue({ summary, job });
  vi.mocked(variantExportApi.status).mockRejectedValue(new ApiError("Start a new export; existing files are preserved.", 404));
  const { result } = renderHook(() => useVariantExport("mascot"));
  await act(async () => result.current.open("original"));
  expect(result.current.job).toBeNull();
  expect(result.current.error).toContain("existing files");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(variantExportApi.status).toHaveBeenCalledTimes(1);
});

it("reuses the idempotency key after an ambiguous start failure", async () => {
  vi.mocked(variantExportApi.start).mockRejectedValue(new Error("timeout"));
  const { result } = renderHook(() => useVariantExport("mascot"));
  act(() => result.current.setDestination(job.destination));
  await act(async () => {
    await result.current.start();
  });
  await act(async () => {
    await result.current.start();
  });
  const calls = vi.mocked(variantExportApi.start).mock.calls;
  expect(calls[0][1].request_id).toBe(calls[1][1].request_id);
  expect(result.current.pending).toBe(false);
});

it("ignores an older folder response after navigating elsewhere", async () => {
  let resolve!: (value: Awaited<ReturnType<typeof variantExportApi.folders>>) => void;
  vi.mocked(variantExportApi.folders)
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValue({ path: "D:\\New", parent: "D:\\", roots: ["D:\\"], folders: [] });
  const { result } = renderHook(() => useExportFolders(vi.fn()));
  act(() => {
    void result.current.browse("D:\\Old");
  });
  await act(async () => {
    await result.current.browse("D:\\New");
  });
  await act(async () => resolve({ path: "D:\\Old", parent: "D:\\", roots: ["D:\\"], folders: [] }));
  expect(result.current.path).toBe("D:\\New");
  expect(result.current.busy).toBe(false);
});

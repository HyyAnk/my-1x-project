import { describe, expect, it, vi } from "vitest";
import { saveIdentityDirectory } from "./saveIdentityExport";
import type { IdentityDirectory } from "./identityExport.types";

const bundle = { folder: "channel-identity", warnings: [], files: [{ filename: "logo.png", base64: "aGVsbG8=" }] };
function directory(fail = false) {
  const write = vi.fn(async () => {
    if (fail) throw new Error("Disk full");
  });
  const close = vi.fn(async () => undefined);
  const abort = vi.fn(async () => undefined);
  const handle: IdentityDirectory = {
    getDirectoryHandle: vi.fn(async () => handle),
    getFileHandle: vi.fn(async () => ({ createWritable: async () => ({ write, close, abort }) })),
  };
  return { handle, write, close, abort };
}
describe("Saving identity files", () => {
  it("uses distinct export directories and closes each file", async () => {
    const { handle, write, close } = directory();
    const progress = vi.fn();
    const first = await saveIdentityDirectory(handle, bundle, new AbortController().signal, progress);
    const second = await saveIdentityDirectory(handle, bundle, new AbortController().signal, progress);
    expect(first).not.toBe(second);
    expect(write).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenCalledWith({ message: "Saving 1 of 1", completed: 0, total: 1 });
  });
  it("reports partial completion and aborts a failed write", async () => {
    const { handle, abort } = directory(true);
    await expect(saveIdentityDirectory(handle, bundle, new AbortController().signal, vi.fn())).rejects.toThrow("Saved 0 of 1");
    expect(abort).toHaveBeenCalledOnce();
  });
  it("does not create a directory after cancellation", async () => {
    const { handle } = directory();
    const controller = new AbortController();
    controller.abort();
    await expect(saveIdentityDirectory(handle, bundle, controller.signal, vi.fn())).rejects.toThrow();
    expect(handle.getDirectoryHandle).not.toHaveBeenCalled();
  });
});

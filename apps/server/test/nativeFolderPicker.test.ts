import { expect, it, vi } from "vitest";
import { createNativeFolderPicker } from "../src/quiz/mascot/variantExport/nativeFolderPicker.js";

it("returns selected paths using an encoded script and environment-only path data", async () => {
  const run = vi.fn().mockResolvedValue({ stdout: "D:\\Exports\r\n", stderr: "" });
  const picker = createNativeFolderPicker(run, "win32");
  expect(await picker("D:\\Unsafe'; command")).toBe("D:\\Exports");
  expect(run.mock.calls[0][1]).toContain("-STA");
  expect(run.mock.calls[0][2]).toMatchObject({
    windowsHide: true,
    timeout: 120000,
    env: { STUDIO_EXPORT_INITIAL_FOLDER: "D:\\Unsafe'; command" },
  });
  expect(Buffer.from(run.mock.calls[0][1][3], "base64").toString("utf16le")).not.toContain("Unsafe");
});
it("treats cancellation as a normal result and handles unavailable platforms", async () => {
  const run = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
  expect(await createNativeFolderPicker(run, "win32")("D:\\")).toBeNull();
  await expect(createNativeFolderPicker(run, "linux")("/tmp")).rejects.toThrow("unavailable");
});
it("prevents duplicate windows and releases the lock after failure", async () => {
  let reject!: (error: Error) => void;
  const run = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    )
    .mockResolvedValue({ stdout: "", stderr: "" });
  const picker = createNativeFolderPicker(run, "win32");
  const pending = picker("D:\\");
  await expect(picker("D:\\")).rejects.toThrow("already open");
  reject(new Error("timeout"));
  await expect(pending).rejects.toThrow("timed out");
  expect(await picker("D:\\")).toBeNull();
});

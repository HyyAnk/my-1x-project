import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { runFfmpegProcess } from "../../src/quiz/mascot/videoAnimation/adapters/ffmpeg/ffmpegProcess.js";

it("waits for the media process to exit before confirming cancellation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ffmpeg-cancel-"));
  const marker = path.join(root, "pid");
  const controller = new AbortController();
  const pending = runFfmpegProcess({
    ffmpegBinary: process.execPath,
    args: ["-e", `require('node:fs').writeFileSync(${JSON.stringify(marker)},String(process.pid));setInterval(()=>{},1000)`],
    timeoutMs: 5000,
    signal: controller.signal,
    onAborted: () => new Error("Cancelled"),
    onTimeout: () => new Error("Timed out"),
    onCommandFailed: (message) => new Error(message),
  });
  const outcome = pending.catch((error: unknown) => error);
  try {
    let pid = 0;
    await vi.waitFor(async () => {
      pid = Number(await readFile(marker, "utf8"));
      expect(pid).toBeGreaterThan(0);
    });
    controller.abort();
    expect(await outcome).toEqual(new Error("Cancelled"));
    expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    controller.abort();
    await outcome;
    await rm(root, { recursive: true, force: true });
  }
});

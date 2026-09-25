import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { createAnimationStorageAdapter, createFrameRegistrationService } from "../../src/quiz/mascot/videoAnimation/index.js";
import { encodeRgbaToPng } from "../../src/utils/imageMatting.js";

let root: string;
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

async function registerFrames(moveSubject: boolean) {
  root = await mkdtemp(path.join(os.tmpdir(), "registration-centroid-"));
  const storage = createAnimationStorageAdapter(root);
  const dir = storage.getAttemptFramesDir("m", "core", "thinking", 2, 1, "matted");
  await mkdir(dir, { recursive: true });
  for (let frame = 1; frame <= 12; frame++) {
    const data = new Uint8Array(1280 * 720 * 4);
    const shift = moveSubject && frame % 2 === 0 ? 300 : 0;
    for (let y = 200; y < 500; y++) {
      for (let x = 300 + shift; x < 600 + shift; x++) data[(y * 1280 + x) * 4 + 3] = 255;
    }
    // Alternating edge specks move the bounds center by 400px, not the subject.
    data[(20 * 1280 + (frame % 2 ? 10 : 1270)) * 4 + 3] = 20;
    await writeFile(path.join(dir, `frame_${String(frame).padStart(3, "0")}.png`), encodeRgbaToPng({ width: 1280, height: 720, data }));
  }
  return createFrameRegistrationService(storage).computeAttemptRegistration({
    mascotId: "m",
    styleId: "core",
    state: "thinking",
    slotIndex: 2,
    attemptId: 1,
  });
}

it("measures subject motion without rejecting isolated low-alpha noise or cropping it away", async () => {
  const result = await registerFrames(false);
  expect(result.maxDriftPx).toBeLessThan(1);
  expect(result.commonBounds.x).toBe(10);
  expect(result.commonBounds.width).toBe(1261);
});

it("accepts genuine large subject displacement and retains diagnostic metrics", async () => {
  const result = await registerFrames(true);
  expect(result.maxDriftPx).toBeGreaterThan(180);
  expect(result.registration.offset_x).toBe(0);
  expect(result.registration.offset_y).toBe(0);
});

import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { it, expect } from "vitest";
import { findIdenticalNarration, narrationContentFilename } from "../src/repository/media/narrationReuse.js";

it("uses stable content identity compatible with the existing filename contract", () => {
  expect(narrationContentFilename(Buffer.from("same"))).toMatch(/^quiz-narration-\d+\.wav$/);
  expect(narrationContentFilename(Buffer.from("same"))).toBe(narrationContentFilename(Buffer.from("same")));
  expect(narrationContentFilename(Buffer.from("same"))).not.toBe(narrationContentFilename(Buffer.from("diff")));
});

it("reuses exact generated narration but never mistakes different bytes or a master for a duplicate", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "narration-reuse-"));
  try {
    await writeFile(path.join(root, "quiz-narration-1.wav"), "same");
    await writeFile(path.join(root, "narration.wav"), "master");
    expect(await findIdenticalNarration(root, Buffer.from("same"))).toBe("quiz-narration-1.wav");
    expect(await findIdenticalNarration(root, Buffer.from("diff"))).toBeNull();
    expect(await findIdenticalNarration(root, Buffer.from("master"))).toBeNull();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

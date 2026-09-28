import { mkdtemp, rm, writeFile, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { it, expect } from "vitest";
import { linkIdenticalMedia, writeMediaAtomic } from "../../src/quiz/mascot/videoAnimation/storage/identicalMediaLink.js";

it("consolidates equal bytes while preserving names and isolates subsequent updates", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "media-link-"));
  try {
    const source = path.join(root, "source.mp4");
    const duplicate = path.join(root, "01.mp4");
    await writeFile(source, "original");
    await writeFile(duplicate, "original");
    expect(await linkIdenticalMedia(root, source, duplicate)).toBe(8);
    expect((await lstat(source)).ino).toBe((await lstat(duplicate)).ino);
    expect(await linkIdenticalMedia(root, source, duplicate)).toBe(0);
    await writeMediaAtomic(source, Buffer.from("replacement"));
    expect(await readFile(duplicate, "utf8")).toBe("original");
    expect(await readFile(source, "utf8")).toBe("replacement");
    expect(await linkIdenticalMedia(root, source, duplicate)).toBe(0);
    await expect(linkIdenticalMedia(root, source, path.join(root, "../escape"))).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

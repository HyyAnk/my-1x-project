import { mkdir, mkdtemp, rm, writeFile, readFile, utimes } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { maintainUnusedMedia } from "../../src/quiz/mascot/videoAnimation/storage/unusedMediaMaintenance.js";

describe("Unused media lifecycle", () => {
  let library: string;
  let root: string;
  let assets: string;
  beforeEach(async () => {
    library = await mkdtemp(path.join(os.tmpdir(), "unused-media-"));
    root = path.join(library, ".quiz-studio");
    assets = path.join(library, "channels/test/episodes/episode/assets");
    await mkdir(path.join(root, "mascots"), { recursive: true });
    await mkdir(assets, { recursive: true });
  });
  afterEach(async () => {
    await rm(library, { recursive: true, force: true });
  });
  async function audio(name: string, old = true) {
    const file = path.join(assets, name);
    await writeFile(file, "audio");
    if (old) await utimes(file, new Date(0), new Date(0));
    return file;
  }
  it("removes only old unreferenced generated narration and keeps masters, references and recent files", async () => {
    const unused = await audio("quiz-narration-1.wav");
    const referenced = await audio("quiz-narration-2.wav");
    const recent = await audio("quiz-narration-3.wav", false);
    const master = await audio("narration.wav");
    await writeFile(path.join(library, "history.json"), JSON.stringify({ old: "quiz-narration-2.wav" }));
    expect(await maintainUnusedMedia(root, false, () => {})).toEqual({ files: 1, bytes: 5 });
    expect(await readFile(unused, "utf8")).toBe("audio");
    expect(await maintainUnusedMedia(root, true, () => {})).toEqual({ files: 1, bytes: 5 });
    await expect(readFile(unused)).rejects.toThrow();
    for (const file of [referenced, recent, master]) expect(await readFile(file, "utf8")).toBe("audio");
    expect(await maintainUnusedMedia(root, true, () => {})).toEqual({ files: 0, bytes: 0 });
  });
  it("defers all cleanup with recoverable jobs", async () => {
    const file = await audio("quiz-narration-1.wav");
    await writeFile(path.join(root, "jobs.json"), '{"status":"RUNNING"}');
    expect((await maintainUnusedMedia(root, true, () => {})).files).toBe(0);
    expect(await readFile(file, "utf8")).toBe("audio");
  });
  it("fails closed on unreadable reference metadata", async () => {
    const file = await audio("quiz-narration-1.wav");
    await writeFile(path.join(library, "broken.json"), "bad");
    await expect(maintainUnusedMedia(root, true, () => {})).rejects.toThrow();
    expect(await readFile(file, "utf8")).toBe("audio");
  });
});

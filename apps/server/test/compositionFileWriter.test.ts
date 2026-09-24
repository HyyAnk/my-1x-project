import { mkdtemp, mkdir, writeFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { writeCompositionFiles } from "../src/tasks/video/compositionFileWriter.js";

it("removes obsolete generated scenes while preserving custom files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "composition-writer-"));
  try {
    const directory = path.join(root, "compositions");
    await mkdir(directory);
    for (const file of ["quiz-q1-3970.html", "candy-transition-24400.html", "custom.html"])
      await writeFile(path.join(directory, file), "old");
    await writeCompositionFiles(root, path.join(root, "index.html"), "new", { "compositions/quiz-q1-3750.html": "current" });
    expect((await readdir(directory)).sort()).toEqual(["custom.html", "quiz-q1-3750.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

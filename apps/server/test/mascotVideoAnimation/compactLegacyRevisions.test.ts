import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { retentionFixture } from "./storageRetention.fixture.js";
import { planAttemptRetention } from "../../src/quiz/mascot/videoAnimation/storage/attemptRetentionPlan.js";
import { compactLegacyRevisions } from "../../src/quiz/mascot/videoAnimation/storage/compactLegacyRevisions.js";
import { readLibraryDocuments, referencedMediaNames } from "../../src/quiz/mascot/videoAnimation/storage/libraryReferences.js";
import { mattedReferenceCheck } from "../../src/quiz/mascot/videoAnimation/storage/mattedReferences.js";
import { maintainLegacyStorage } from "../../src/quiz/mascot/videoAnimation/storage/legacyStorageMaintenance.js";

describe("Legacy compact revision migration", () => {
  it("isolates qualified references and keeps unpinned and bare references conservatively", () => {
    const root = path.resolve("library");
    const frame = (attempt: number, name = "frame_002.png") =>
      path.join(root, "mascots/owl/animations/classic/thinking/slot_1/attempts", `att_${attempt}`, "frames/matted", name);
    const prefix = "/api/mascots/owl/styles/classic/animations/thinking/1/artifacts/";
    const document = (text: string) => [{ file: "fixture", hash: "fixture", text }];
    const pinned = mattedReferenceCheck(root, document(`${prefix}frame_002.png?attempt=1`));
    expect(pinned(frame(1))).toBe(true);
    expect(pinned(frame(2))).toBe(false);
    expect(mattedReferenceCheck(root, document(`${prefix}frame_002.png`))(frame(2))).toBe(true);
    expect(mattedReferenceCheck(root, document("frame_002.png"))(frame(2))).toBe(true);
    expect(mattedReferenceCheck(root, document(frame(1)))(frame(1))).toBe(true);
    expect(mattedReferenceCheck(root, document(frame(1)))(frame(2))).toBe(false);
  });

  it("migrates metadata, retains the thumbnail, deletes only unreferenced frames and protects later cleanup", async () => {
    const library = await mkdtemp(path.join(os.tmpdir(), "legacy-maintenance-"));
    try {
      const root = path.join(library, ".quiz-studio");
      await mkdir(root);
      const f = await retentionFixture(root, true);
      const prefix = "/api/mascots/owl/styles/classic/animations/thinking/1/artifacts/";
      const revision = { ...f.revision, transparent_video_url: `${prefix}video_transparent.webm?attempt=1` };
      await writeFile(path.join(f.slot, "revisions/rev_1.json"), JSON.stringify(revision));
      await writeFile(path.join(f.directory, "frames/matted/frame_002.png"), "unused");
      await writeFile(path.join(f.directory, "frames/matted/frame_003.png"), "referenced");
      await writeFile(path.join(library, "consumer.json"), JSON.stringify({ image: `${prefix}frame_003.png?attempt=1` }));
      const dry = await maintainLegacyStorage(root, false, () => {});
      expect(dry.files).toBe(1);
      await expect(
        maintainLegacyStorage(
          root,
          true,
          () => {},
          async () => {
            throw new Error("decode failed");
          },
        ),
      ).rejects.toThrow();
      expect(await readFile(path.join(f.directory, "frames/matted/frame_002.png"), "utf8")).toBe("unused");
      const result = await maintainLegacyStorage(
        root,
        true,
        () => {},
        async () => {},
      );
      expect(result.files).toBe(1);
      expect(await readFile(path.join(f.directory, "frames/matted/frame_001.png"), "utf8")).toBe("frame");
      expect(await readFile(path.join(f.directory, "frames/matted/frame_003.png"), "utf8")).toBe("referenced");
      await expect(readFile(path.join(f.directory, "frames/matted/frame_002.png"))).rejects.toThrow();
      expect((await planAttemptRetention(root, f.directory)).mattedProtected).toBe(true);
      expect((await maintainLegacyStorage(root, false, () => {})).files).toBe(0);
    } finally {
      await rm(library, { recursive: true, force: true });
    }
  });
  it("removes only verified pinned lists and preserves thumbnail references and unknown metadata", async () => {
    const library = await mkdtemp(path.join(os.tmpdir(), "compact-revisions-"));
    try {
      const root = path.join(library, ".quiz-studio");
      await mkdir(root);
      const f = await retentionFixture(root, true);
      const plan = await planAttemptRetention(root, f.directory);
      const url = "/api/mascots/owl/styles/classic/animations/thinking/1/artifacts/";
      const revision = { ...f.revision, transparent_video_url: `${url}video_transparent.webm?attempt=1`, extra: "keep" };
      const input = { active: revision, history: [revision], image_url: `${url}frame_001.png?attempt=1` };
      const output = compactLegacyRevisions(input, root, [plan]);
      expect(output.changed).toBe(2);
      expect(output.value).toMatchObject({ active: { extra: "keep" }, image_url: input.image_url });
      expect(JSON.stringify(output.value)).not.toContain("frame_urls");
      expect(compactLegacyRevisions(output.value, root, [plan]).changed).toBe(0);
      for (const pin of ["", "?attempt=2", "?attempt=0"]) {
        expect(
          compactLegacyRevisions({ ...revision, transparent_video_url: `${url}video_transparent.webm${pin}` }, root, [plan]).changed,
        ).toBe(0);
      }
      expect(compactLegacyRevisions(input, root, []).changed).toBe(0);
      expect(compactLegacyRevisions({ frame_urls: ["frame_003.png"] }, root, [plan]).changed).toBe(0);
    } finally {
      await rm(library, { recursive: true, force: true });
    }
  });

  it("includes nested and historical references but excludes central maintenance backups", async () => {
    const library = await mkdtemp(path.join(os.tmpdir(), "library-references-"));
    try {
      await mkdir(path.join(library, ".quiz-studio/maintenance"), { recursive: true });
      await writeFile(path.join(library, "live.json"), JSON.stringify({ nested: ["frame_002.png", "quiz-narration-1.wav"] }));
      await writeFile(path.join(library, ".quiz-studio/maintenance/old.json"), '{"url":"frame_003.png"}');
      const before = await readFile(path.join(library, "live.json"), "utf8");
      const names = referencedMediaNames(await readLibraryDocuments(library));
      expect(names.has("frame_002.png")).toBe(true);
      expect(names.has("quiz-narration-1.wav")).toBe(true);
      expect(names.has("frame_003.png")).toBe(false);
      expect(await readFile(path.join(library, "live.json"), "utf8")).toBe(before);
      await writeFile(path.join(library, "broken.json"), "invalid");
      await expect(readLibraryDocuments(library)).rejects.toThrow();
    } finally {
      await rm(library, { recursive: true, force: true });
    }
  });
});

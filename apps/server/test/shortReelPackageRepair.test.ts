import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { mkdir, readFile, writeFile, symlink, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { mutateShortReelRecord } from "../src/repository/shortReelTransaction.js";
import { parseZipArchive } from "../src/quiz/zipHelper.js";
import { setShortReelWriteHookForTesting } from "../src/repository/shortReelStorage.js";
import { packageFixture, packageImage } from "./helpers/shortReelPackageFixture.js";
import { deferred, repairScript } from "./helpers/shortReelRepairFixture.js";
import { resolveReelReferences, validateImageBuffer } from "../src/shortReel/referenceResolver.js";
import { generateReelCoverImage } from "../src/shortReel/thumbnailAdapter.js";
import { generateReelPublishing } from "../src/shortReel/publishingService.js";
import { generateFullReelPackage, generateReelCover } from "../src/shortReel/packageService.js";
import { exportShortReelPackage } from "../src/shortReel/exportService.js";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
async function fixture() {
  const f = await packageFixture();
  cleanups.push(f.cleanup);
  return f;
}

describe("Phase 05 review regressions", () => {
  it("reports failure-state persistence errors without leaking filesystem details", async () => {
    const f = await fixture();
    try {
      await expect(
        generateReelCover(f.repo, f.key, "write-failure", {
          imageProvider: {
            generateReference: () => {
              setShortReelWriteHookForTesting(() => Promise.reject(new Error("secret internal storage path")));
              return Promise.reject(new Error("provider failed"));
            },
          },
        }),
      ).rejects.toMatchObject({
        code: "STATE_WRITE_FAILED",
        message: "Could not record package failure. Restore storage access before retrying.",
      });
    } finally {
      setShortReelWriteHookForTesting(null);
    }
  });
  it("does not mark placeholder artwork as a generated cover when no provider is configured", async () => {
    const f = await fixture();
    await expect(generateReelCoverImage(f.repo, f.key)).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
  it("rejects arbitrary local reference paths even inside storage", async () => {
    const f = await fixture();
    await expect(resolveReelReferences(f.repo, f.key, { mascotAssetPath: f.providerPath })).rejects.toMatchObject({
      code: "INVALID_REFERENCE_PATH",
    });
  });
  it("requires an explicit valid export revision", async () => {
    const f = await fixture();
    const ready = await generateFullReelPackage(f.repo, f.key, {
      script: repairScript(),
      coverOptions: { imageProvider: f.imageProvider },
    });
    await expect(exportShortReelPackage(f.repo, f.key)).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect(ready.revision).toBeGreaterThan(1);
  });
  it("rejects a missing explicitly selected style instead of substituting the first style", async () => {
    const f = await fixture();
    await expect(resolveReelReferences(f.repo, f.key, { styleId: "missing" })).rejects.toMatchObject({ code: "MISSING_REFERENCE" });
  });
  it("fully decodes image content instead of trusting a readable header", async () => {
    const bytes = await packageImage();
    await expect(validateImageBuffer(bytes.subarray(0, bytes.length - 40), "mascot")).rejects.toMatchObject({ code: "CORRUPT_IMAGE" });
  });
  it("never overwrites prior cover bytes when a new cover is generated", async () => {
    const f = await fixture();
    const a = await generateReelCoverImage(f.repo, f.key, { imageProvider: f.imageProvider });
    const oldBytes = await readFile(path.join(f.root, a.path));
    await writeFile(f.providerPath, await packageImage("green"));
    const b = await generateReelCoverImage(f.repo, f.key, { imageProvider: f.imageProvider });
    expect(b.path).not.toBe(a.path);
    expect(await readFile(path.join(f.root, a.path))).toEqual(oldBytes);
  });
  it("never replaces an accepted reference file during another resolution", async () => {
    const f = await fixture();
    const a = await resolveReelReferences(f.repo, f.key);
    const oldBytes = await readFile(path.join(f.root, a.references[0].path));
    const next = await f.repo.saveMascotAsset(f.mascot.id, "changed.png", await packageImage("yellow", 200, 200));
    const b = await resolveReelReferences(f.repo, f.key, { mascotAssetPath: next });
    expect(b.references[0].path).not.toBe(a.references[0].path);
    expect(await readFile(path.join(f.root, a.references[0].path))).toEqual(oldBytes);
  });
  it("rejects corrupted or replaced asset bytes during export", async () => {
    const f = await fixture();
    const ready = await generateFullReelPackage(f.repo, f.key, {
      script: repairScript(),
      coverOptions: { imageProvider: f.imageProvider },
    });
    await writeFile(path.join(f.root, ready.units.cover.last_accepted_payload!.path), Buffer.from("private data"));
    await expect(exportShortReelPackage(f.repo, f.key, ready.revision)).rejects.toMatchObject({ code: "INVALID_ASSET" });
  });
  it("propagates publishing cancellation instead of accepting fallback copy", async () => {
    const f = await fixture();
    const controller = new AbortController();
    controller.abort();
    await expect(generateReelPublishing(f.reel, { signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
  });
  it("returns a safe publishing error when a configured provider fails", async () => {
    const f = await fixture();
    await expect(
      generateReelPublishing(f.reel, {
        llmClient: { connect: () => Promise.resolve(), generateContent: () => Promise.reject(new Error("secret provider key")) },
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });
  it("does not invoke the provider again for a completed operation replay", async () => {
    const f = await fixture();
    let calls = 0;
    const options = {
      imageProvider: {
        generateReference: () => {
          calls++;
          return Promise.resolve({ asset_path: f.providerPath });
        },
      },
    };
    await generateReelCover(f.repo, f.key, "replay", options);
    await generateReelCover(f.repo, f.key, "replay", options);
    expect(calls).toBe(1);
  });
  it("merges duplicate in-flight requests into one provider call", async () => {
    const f = await fixture();
    const entered = deferred();
    const release = deferred();
    let calls = 0;
    const options = {
      imageProvider: {
        generateReference: async () => {
          calls++;
          entered.resolve();
          await release.promise;
          return { asset_path: f.providerPath };
        },
      },
    };
    const first = generateReelCover(f.repo, f.key, "same", options);
    await entered.promise;
    const second = generateReelCover(f.repo, f.key, "same", options);
    release.resolve();
    const results = await Promise.all([first, second]);
    expect(calls).toBe(1);
    expect(results[0].revision).toBe(results[1].revision);
  });
  it("rejects an older cover after a newer attempt completes without corrupting the winner", async () => {
    const f = await fixture();
    const entered = deferred();
    const release = deferred();
    const oldFile = path.join(f.root, "old.png");
    await writeFile(oldFile, await packageImage("yellow"));
    const old = generateReelCover(f.repo, f.key, "old", {
      imageProvider: {
        generateReference: async () => {
          entered.resolve();
          await release.promise;
          return { asset_path: oldFile };
        },
      },
    });
    const rejected = expect(old).rejects.toMatchObject({ code: "SUPERSEDED_OPERATION" });
    await entered.promise;
    const winner = await generateReelCover(f.repo, f.key, "new", { imageProvider: f.imageProvider });
    const payload = winner.units.cover.last_accepted_payload!;
    const before = await readFile(path.join(f.root, payload.path));
    release.resolve();
    await rejected;
    expect((await f.repo.getShortReel(f.key)).units.cover.last_accepted_payload).toEqual(payload);
    expect(await readFile(path.join(f.root, payload.path))).toEqual(before);
  });
  it("bounds an uncooperative publishing provider without fallback success", async () => {
    const f = await fixture();
    vi.useFakeTimers();
    const result = expect(
      generateReelPublishing(f.reel, {
        timeoutMs: 50,
        llmClient: { connect: () => Promise.resolve(), generateContent: () => new Promise(() => {}) },
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(51);
    await result;
  });
  it("preserves independent publishing success after cover failure in the full workflow", async () => {
    const f = await fixture();
    await expect(
      generateFullReelPackage(f.repo, f.key, {
        script: repairScript(),
        coverOptions: { imageProvider: { generateReference: () => Promise.reject(new Error("offline")) } },
      }),
    ).rejects.toMatchObject({ code: "ATTEMPT_FAILED" });
    const record = await f.repo.getShortReel(f.key);
    expect(record.units.script.state).toBe("ready");
    expect(record.units.publishing.state).toBe("ready");
    expect(record.units.cover.state).toBe("failed");
  });
  it("rejects a linked destination before writing any bytes outside the reel", async () => {
    const f = await fixture();
    const protectedDir = path.join(f.root, "protected-images");
    await mkdir(protectedDir);
    await symlink(protectedDir, path.join(path.dirname(f.file), "assets"), "junction");
    await expect(generateReelCoverImage(f.repo, f.key, { imageProvider: f.imageProvider })).rejects.toThrow();
    expect(await readdir(protectedDir)).toEqual([]);
  });
  it("validates decoded cover dimensions even if tampered bytes have an updated checksum", async () => {
    const f = await fixture();
    const record = await generateFullReelPackage(f.repo, f.key, {
      script: repairScript(),
      coverOptions: { imageProvider: f.imageProvider },
    });
    const bytes = await packageImage("red", 128, 128);
    await writeFile(path.join(f.root, record.units.cover.last_accepted_payload!.path), bytes);
    const edited = await mutateShortReelRecord(f.repo, f.key, (r) => {
      r.units.cover.last_accepted_payload!.checksum = createHash("sha256").update(bytes).digest("hex");
      return r;
    });
    await expect(exportShortReelPackage(f.repo, f.key, edited.revision)).rejects.toMatchObject({ code: "INVALID_ASSET" });
  });
  it("exports matching hashes and decoded images from the complete real filesystem workflow", async () => {
    const f = await fixture();
    const record = await generateFullReelPackage(f.repo, f.key, {
      script: repairScript(),
      coverOptions: { imageProvider: f.imageProvider },
    });
    const entries = parseZipArchive(await exportShortReelPackage(f.repo, f.key, record.revision));
    expect(entries).toHaveLength(10);
    const manifest: unknown = JSON.parse(Buffer.from(entries.find((e) => e.filename === "manifest.json")!.data).toString());
    for (const entry of entries.filter((e) => e.filename !== "manifest.json"))
      expect(manifest).toHaveProperty(["content_hashes", entry.filename], createHash("sha256").update(entry.data).digest("hex"));
    const prompt = Buffer.from(entries.find((e) => e.filename === "prompts/01-generate.txt")!.data).toString();
    expect(prompt).toContain("references/mascot.png");
    expect(prompt).toContain("references/style.png");
  });
});

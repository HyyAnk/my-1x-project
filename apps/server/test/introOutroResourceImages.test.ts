import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { existingTransparentImage } from "../src/introOutroScripts/resourceImages.js";
import type { ResolvedReference } from "../src/introOutroScripts/contextResolver.js";
import { getTransparentMascotCachePaths } from "../src/repository/mascot/mascotTransparentStorage.js";

let root: string;
let reference: ResolvedReference;
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "pair-resources-"));
  reference = {
    assetId: "anchor",
    url: "/anchor.png",
    absolutePath: path.join(root, "anchor.png"),
    sha256: "current-hash",
    mimeType: "image/png",
  };
  await writeImage(reference.absolutePath, 1);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeImage(filename: string, alpha: number) {
  await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 255, g: 0, b: 0, alpha } } })
    .png()
    .toFile(filename);
}

function fixture() {
  const paths = getTransparentMascotCachePaths(root, "mascot", "anchor.png");
  const repository = {
    roots: { mascots: root },
    getTransparentMascotAssetFile: vi.fn(async () => ({ absolutePath: paths.cachedPath, size: 100, modified_at: "today" })),
  };
  const context = { mascotReference: reference, logoReference: reference, mascot: { id: "mascot" } };
  return { paths, repository, context };
}

it("uses transparent originals without looking for a cache", async () => {
  const { repository, context } = fixture();
  await writeImage(reference.absolutePath, 0.5);
  expect(await existingTransparentImage(repository, context, "mascot")).toBe(reference.absolutePath);
  expect(await existingTransparentImage(repository, context, "logo")).toBe(reference.absolutePath);
  expect(repository.getTransparentMascotAssetFile).not.toHaveBeenCalled();
});

it("does not mislabel opaque originals or generate a missing cache", async () => {
  const { repository, context } = fixture();
  expect(await existingTransparentImage(repository, context, "mascot")).toBeNull();
  expect(await existingTransparentImage(repository, context, "logo")).toBeNull();
  expect(repository.getTransparentMascotAssetFile).not.toHaveBeenCalled();
});

it("reuses only a transparent cache with the matching source hash", async () => {
  const { repository, context, paths } = fixture();
  await mkdir(paths.transparentDir, { recursive: true });
  await writeImage(paths.cachedPath, 0.5);
  await writeFile(paths.metaPath, JSON.stringify({ source_hash: "old-hash" }));
  expect(await existingTransparentImage(repository, context, "mascot")).toBeNull();
  await writeFile(paths.metaPath, JSON.stringify({ source_hash: reference.sha256 }));
  expect(await existingTransparentImage(repository, context, "mascot")).toBe(paths.cachedPath);
  await writeImage(paths.cachedPath, 1);
  expect(await existingTransparentImage(repository, context, "mascot")).toBeNull();
});

it("returns missing for unconfigured resources and invalid cache metadata", async () => {
  const { repository, context, paths } = fixture();
  expect(await existingTransparentImage(repository, { ...context, logoReference: null }, "logo")).toBeNull();
  await mkdir(paths.transparentDir, { recursive: true });
  await writeFile(paths.metaPath, "invalid json");
  expect(await existingTransparentImage(repository, context, "mascot")).toBeNull();
});

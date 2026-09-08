import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { loadStorageRoot } from "../src/config.js";
import { RepositoryError } from "../src/repository/errors.js";

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "storage-switch-route-"));
  await mkdir(path.join(root, "templates"));
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n");
  const app = await buildApp(root, { llmClient: null });
  return { root, app, target: path.join(root, "new-storage") };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("storage switch route", () => {
  it("retains the previous storage configuration when switching fails", async () => {
    const { root, target, app } = await createFixture();
    vi.spyOn(app.repository, "setStorageRoot").mockRejectedValue(new RepositoryError("Storage is busy", "STORAGE_BUSY"));
    try {
      const result = await app.server.inject({ method: "POST", url: "/api/storage", payload: { path: target } });
      expect(result.statusCode).toBe(400);
      const current = await app.server.inject({ method: "GET", url: "/api/storage" });
      expect(current.json()).toMatchObject({ path: root, configured: false });
      expect(await loadStorageRoot(root)).toBeNull();
    } finally {
      vi.restoreAllMocks();
      await app.close();
      await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  it("waits for root switching before bootstrapping or acknowledging the new storage", async () => {
    const { root, target, app } = await createFixture();
    const entered = deferred();
    const release = deferred();
    const switched = app.repository.setStorageRoot.bind(app.repository);
    const bootstrap = app.repository.ensureBootstrap.bind(app.repository);
    const bootstrappedRoots: string[] = [];
    vi.spyOn(app.repository, "setStorageRoot").mockImplementation(async (next) => {
      entered.resolve();
      await release.promise;
      await switched(next);
    });
    vi.spyOn(app.repository, "ensureBootstrap").mockImplementation(async () => {
      bootstrappedRoots.push(app.repository.storageRoot);
      await bootstrap();
    });
    const response = app.server.inject({ method: "POST", url: "/api/storage", payload: { path: target } });
    const completed = Promise.resolve(response);
    try {
      await entered.promise;
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(bootstrappedRoots).toEqual([]);
      release.resolve();
      const result = await completed;
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({ path: target, channel_path: path.join(target, "channels"), configured: true });
      expect(bootstrappedRoots.length).toBeGreaterThan(0);
      expect(bootstrappedRoots.every((entry) => entry === target)).toBe(true);
    } finally {
      release.resolve();
      await completed;
      vi.restoreAllMocks();
      await app.close();
      await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});

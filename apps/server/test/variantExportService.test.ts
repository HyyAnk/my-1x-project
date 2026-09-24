import { randomUUID } from "node:crypto";
import { readFile, readdir, rm, mkdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createExportFixture, imageBytes } from "./fixtures/variantExportFixture.js";
import { buildVariantExportPlan, exportFolderName } from "../src/quiz/mascot/variantExport/variantExportPlan.js";
import { listExportFolders, validateExportFolder } from "../src/quiz/mascot/variantExport/exportFolders.js";

const fixtures: Awaited<ReturnType<typeof createExportFixture>>[] = [];
async function setup() {
  const fixture = await createExportFixture();
  fixtures.push(fixture);
  return fixture;
}
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    await fixture.service.close();
    await rm(fixture.root, { recursive: true, force: true });
  }
});
async function finished(f: Awaited<ReturnType<typeof setup>>, id: string) {
  await vi.waitFor(() => expect(f.service.get("test", id).finished_at).not.toBeNull());
  return f.service.get("test", id);
}

describe("variant export", () => {
  it("exports both states from every style and preserves original bytes", async () => {
    const f = await setup();
    const job = await f.service.start("test", { request_id: randomUUID(), mode: "original", destination: f.output });
    expect(await finished(f, job.id)).toMatchObject({ status: "completed", total: 4, copied: 4, processed: 4 });
    for (const style of ["Classic", "Space"]) {
      expect(await readFile(path.join(f.output, "Test Mascot", style, "Thinking", "V001_Og.png"))).toEqual(
        await readFile(path.join(f.source, "raw.png")),
      );
      expect(await readFile(path.join(f.output, "Test Mascot", style, "Celebrate", "V002_Og.png"))).toEqual(imageBytes);
    }
  });
  it("uses transparent generation/cache for every variant", async () => {
    const f = await setup();
    const job = await f.service.start("test", { request_id: randomUUID(), mode: "transparent", destination: f.output });
    expect((await finished(f, job.id)).copied).toBe(4);
    expect(f.repository.getOrCreateTransparentMascotAsset).toHaveBeenCalledTimes(4);
    expect(await readFile(path.join(f.output, "Test Mascot", "Space", "Celebrate", "V002_Trans.png"))).toEqual(imageBytes);
  });
  it("is idempotent under concurrent submissions and skips identical files on later exports", async () => {
    const f = await setup();
    const input = { request_id: randomUUID(), mode: "original" as const, destination: f.output };
    const [first, duplicate] = await Promise.all([f.service.start("test", input), f.service.start("test", input)]);
    expect(first.id).toBe(duplicate.id);
    await finished(f, first.id);
    expect((await f.service.start("test", input)).id).toBe(first.id);
    const next = await f.service.start("test", { ...input, request_id: randomUUID() });
    expect(await finished(f, next.id)).toMatchObject({ copied: 0, skipped: 4, status: "completed" });
  });
  it("preserves different existing content and uses a stable conflict suffix", async () => {
    const f = await setup();
    const directory = path.join(f.output, "Test Mascot", "Classic", "Thinking");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "V001_Og.png"), "existing");
    const job = await f.service.start("test", { request_id: randomUUID(), mode: "original", destination: f.output });
    await finished(f, job.id);
    expect(await readFile(path.join(directory, "V001_Og.png"), "utf8")).toBe("existing");
    expect(await readdir(directory)).toHaveLength(2);
  });
  it("continues after an image failure and retries only failed images", async () => {
    const f = await setup();
    vi.mocked(f.repository.getMascotAssetFile).mockRejectedValueOnce(new Error("missing"));
    const job = await f.service.start("test", { request_id: randomUUID(), mode: "original", destination: f.output });
    expect(await finished(f, job.id)).toMatchObject({ status: "partial", failed: 1, copied: 3 });
    const retry = await f.service.start("test", {
      request_id: randomUUID(),
      mode: "original",
      destination: f.output,
      retry_job_id: job.id,
    });
    expect(await finished(f, retry.id)).toMatchObject({ status: "completed", total: 1, copied: 1 });
  });
  it("acknowledges cancellation and finishes only the in-flight file", async () => {
    const f = await setup();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = f.repository.getMascotAssetFile;
    f.repository.getMascotAssetFile = async (id, name) => {
      await pending;
      return original(id, name);
    };
    const job = await f.service.start("test", { request_id: randomUUID(), mode: "original", destination: f.output });
    expect(f.service.cancel("test", job.id).status).toBe("cancelling");
    release();
    expect(await finished(f, job.id)).toMatchObject({ status: "cancelled", copied: 1, processed: 1 });
  });
  it("rejects empty exports, relative destinations and source-library destinations", async () => {
    const f = await setup();
    await expect(validateExportFolder("relative", f.source)).rejects.toThrow("absolute");
    await expect(validateExportFolder(f.source, f.source)).rejects.toThrow("source library");
    f.mascot.styles.forEach((style) => {
      style.states = { thinking: [], celebrate: [] };
    });
    await expect(f.service.start("test", { request_id: randomUUID(), mode: "original", destination: f.output })).rejects.toThrow(
      "No variants",
    );
  });
  it("does not follow a destination junction outside the selected folder", async () => {
    const f = await setup();
    await symlink(f.source, path.join(f.output, "Test Mascot"), "junction");
    const job = await f.service.start("test", { request_id: randomUUID(), mode: "original", destination: f.output });
    expect(await finished(f, job.id)).toMatchObject({ status: "failed", copied: 0, failed: 4 });
    expect(await readdir(f.source)).toEqual(["image.png", "raw.png"]);
  });
  it("rejects generated paths that would enter the source library from its parent", async () => {
    const f = await setup();
    f.mascot.name = "source";
    await expect(f.service.start("test", { request_id: randomUUID(), mode: "original", destination: f.root })).rejects.toThrow("overlaps");
  });
  it("rejects nonlocal/traversal source URLs without fetching them", async () => {
    const f = await setup();
    f.mascot.styles[0].states.thinking[0].raw_image_url = "/api/mascots/test/assets/..%2Fsecret.png";
    f.mascot.styles[1].states.thinking[0].raw_image_url = "https://example.com/image.png";
    const job = await f.service.start("test", { request_id: randomUUID(), mode: "original", destination: f.output });
    expect(await finished(f, job.id)).toMatchObject({ failed: 2, copied: 2 });
  });
  it("sanitizes reserved names and disambiguates colliding styles", async () => {
    const f = await setup();
    expect(exportFolderName("CON")).toBe("_CON");
    expect(exportFolderName("../Mascot:Name. ")).toBe(".._Mascot_Name");
    f.mascot.styles[1].name = "classic";
    const plan = buildVariantExportPlan(f.mascot, "original");
    expect(new Set(plan.items.map((item) => item.directories[1])).size).toBe(2);
    expect(plan.summary).toMatchObject({ styles: 2, thinking: 2, celebrate: 2 });
  });
  it("browses existing directories and validates a writable destination", async () => {
    const f = await setup();
    expect((await listExportFolders(f.root)).folders.map((folder) => folder.name)).toEqual(["output", "source"]);
    expect(await validateExportFolder(f.output, f.source)).toBe(f.output);
    expect(await readdir(f.output)).toEqual([]);
  });
});

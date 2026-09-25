import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import Fastify from "fastify";
import { afterEach, expect, it, vi } from "vitest";
import type { VariantExportJob } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { StudioLogger } from "../src/logger.js";
import { registerErrorHandler } from "../src/server/errorHandler.js";
import { registerMascotVariantExportRoutes } from "../src/routes/mascots/mascotVariantExportRoutes.js";
import { encodeRgbaToPng, decodePngToRgba } from "../src/utils/imageMatting.js";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

it("runs the filesystem export workflow through HTTP, including real transparent processing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "variant-export-http-"));
  const repository = new RepositoryService(root);
  const logger = new StudioLogger(root);
  const server = Fastify();
  cleanups.push(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });
  await repository.ensureBootstrap();
  registerErrorHandler(server, logger);
  const pickFolder = vi.fn<() => Promise<string | null>>();
  registerMascotVariantExportRoutes(server, { repository, logger, pickFolder });
  const output = path.join(root, "exports");
  await mkdir(output);
  pickFolder.mockResolvedValueOnce(output).mockResolvedValueOnce(null);
  const pick = () => server.inject({ method: "POST", url: "/api/mascots/variant-export/folders/pick", payload: {} });
  expect((await pick()).json()).toEqual({ path: output });
  expect((await pick()).json()).toEqual({ path: null });
  const mascot = await repository.saveMascot({ name: "HTTP Mascot" });
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let index = 0; index < 64 * 64; index++) {
    const inside = index % 64 > 20 && index % 64 < 44 && Math.floor(index / 64) > 20 && Math.floor(index / 64) < 44;
    pixels.set(inside ? [255, 0, 0, 255] : [0, 255, 0, 255], index * 4);
  }
  const bytes = encodeRgbaToPng({ width: 64, height: 64, data: pixels });
  const source = await repository.saveMascotAsset(mascot.id, "pose.png", bytes);
  for (const style of mascot.styles!.slice(0, 2)) {
    for (const state of ["thinking", "celebrate"] as const) {
      await repository.updateMascotSlot(mascot.id, { style_id: style.id, state, slot_index: 1, image_url: source, raw_image_url: source });
    }
  }
  const base = `/api/mascots/${mascot.id}/variant-exports`;
  const preview = await server.inject({ url: base });
  expect(preview.statusCode).toBe(200);
  expect(preview.json().summary).toMatchObject({ thinking: 2, celebrate: 2 });
  const validated = await server.inject({ method: "POST", url: "/api/mascots/variant-export/folders/validate", payload: { path: output } });
  expect(validated.statusCode).toBe(200);
  for (const mode of ["original", "transparent"] as const) {
    const response = await server.inject({ method: "POST", url: base, payload: { request_id: randomUUID(), destination: output, mode } });
    expect(response.statusCode).toBe(202);
    const job = response.json<VariantExportJob>();
    await vi.waitFor(
      async () => {
        const status = (await server.inject({ url: `${base}/${job.id}` })).json<VariantExportJob>();
        expect(status.status).toBe("completed");
        expect(status.copied).toBe(4);
      },
      { timeout: 15000 },
    );
  }
  const styleName = mascot.styles![0].name;
  const original = await readFile(path.join(output, "HTTP Mascot", styleName, "Thinking", "V001_Og.png"));
  expect(original).toEqual(Buffer.from(bytes));
  const transparent = decodePngToRgba(await readFile(path.join(output, "HTTP Mascot", styleName, "Thinking", "V001_Trans.png")));
  expect(transparent.width).toBe(64);
  expect(transparent.height).toBe(64);
  expect(transparent.data[3]).toBe(0);

  expect((await server.inject({ method: "POST", url: base, payload: {} })).statusCode).toBe(400);
  expect((await server.inject({ url: `${base}/${randomUUID()}` })).statusCode).toBe(404);
  expect(
    (await server.inject({ url: "/api/mascots/variant-export/folders", headers: { origin: "https://foreign.example" } })).statusCode,
  ).toBe(403);
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/mascots/variant-export/folders/validate",
        payload: { path: repository.roots.mascots },
      })
    ).statusCode,
  ).toBe(400);
});

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { vi } from "vitest";
import { MascotProfileSchema, type MascotStyle } from "@studio/shared";
import { StudioLogger } from "../../src/logger.js";
import { VariantExportService } from "../../src/quiz/mascot/variantExport/variantExportService.js";
import type { ExportRepository } from "../../src/quiz/mascot/variantExport/variantExport.types.js";

export const imageBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
export function exportMascot() {
  const styles: MascotStyle[] = ["Classic", "Space"].map((name, index) => ({
    id: `style_${index}`,
    name,
    keyword: "",
    is_default: index === 0,
    states: {
      thinking: [
        {
          id: `t${index}`,
          slot_index: 1,
          image_url: "/api/mascots/test/assets/image.png",
          raw_image_url: "/api/mascots/test/assets/raw.png",
        },
      ],
      celebrate: [{ id: `c${index}`, slot_index: 2, image_url: "/api/mascots/test/assets/image.png" }],
    },
    created_at: "2026-09-24T00:00:00Z",
    updated_at: "2026-09-24T00:00:00Z",
  }));
  return MascotProfileSchema.parse({
    id: "test",
    name: "Test Mascot",
    styles,
    created_at: "2026-09-24T00:00:00Z",
    updated_at: "2026-09-24T00:00:00Z",
  });
}

export async function createExportFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "variant-export-test-"));
  const output = path.join(root, "output");
  const source = path.join(root, "source");
  await mkdir(output);
  await mkdir(source);
  await writeFile(path.join(source, "image.png"), imageBytes);
  await writeFile(path.join(source, "raw.png"), Buffer.concat([imageBytes, Buffer.from("raw")]));
  const mascot = exportMascot();
  const repository: ExportRepository = {
    getMascot: vi.fn(async () => structuredClone(mascot)),
    getMascotAssetFile: vi.fn(async (_id: string, filename: string) => ({
      absolutePath: path.join(source, filename),
      size: imageBytes.length,
      modified_at: "2026-09-24T00:00:00Z",
    })),
    getOrCreateTransparentMascotAsset: vi.fn(async () => ({
      absolutePath: path.join(source, "image.png"),
      cached: true,
      meta: {
        source_filename: "image.png",
        source_size: imageBytes.length,
        source_modified_at: "2026-09-24T00:00:00Z",
        source_hash: "test",
        cached_at: "2026-09-24T00:00:00Z",
      },
    })),
  };
  const logger = new StudioLogger(root);
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "step").mockImplementation(() => {});
  vi.spyOn(logger, "warn").mockImplementation(() => {});
  const service = new VariantExportService(repository, () => source, logger);
  return { root, output, source, mascot, repository, service, logger };
}

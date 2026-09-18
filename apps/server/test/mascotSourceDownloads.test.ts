import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { decodePngToRgba, encodeRgbaToPng } from "../src/utils/imageMatting.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

/**
 * Creates a synthetic 16:9 (1280x720) PNG with opaque center mascot and flat background
 */
function create16x9SourceFixture(): Buffer {
  const width = 1280;
  const height = 720;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Mascot occupies center area (x: 400..880, y: 150..720)
      const isMascot = x >= 400 && x <= 880 && y >= 150;
      if (isMascot) {
        data[idx] = 6; // R
        data[idx + 1] = 182; // G
        data[idx + 2] = 212; // B
        data[idx + 3] = 255; // Fully opaque mascot
      } else {
        // Flat light gray background (#E8E8E8)
        data[idx] = 232;
        data[idx + 1] = 232;
        data[idx + 2] = 232;
        data[idx + 3] = 255;
      }
    }
  }

  const pngBytes = encodeRgbaToPng({ width, height, data });
  return Buffer.from(pngBytes);
}

describe("Stage 03: Source Download Actions & Canvas Preservation", () => {
  it("serves original and transparent 16:9 downloads preserving full 1280x720 canvas dimensions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-download-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");

    const app = await buildApp(root);
    const mascot = await app.repository.saveMascot({
      name: "Barnaby Bear",
      visual_style: "pixar_3d",
      actions: {},
    });

    const { style } = await app.repository.createMascotStyle(mascot.id, {
      name: "Woodland Explorer",
      keyword: "scout outfit, ranger hat",
    });

    // 1. Save 1280x720 source fixture
    const fixture16x9Bytes = create16x9SourceFixture();
    const sourceFilename = "style_woodland_thinking_slot1.png";
    const rawFilename = "style_woodland_thinking_slot1_raw.png";

    const assetUrl = await app.repository.saveMascotAsset(mascot.id, sourceFilename, fixture16x9Bytes);
    const rawAssetUrl = await app.repository.saveMascotAsset(mascot.id, rawFilename, fixture16x9Bytes);

    await app.repository.updateMascotSlot(mascot.id, {
      style_id: style.id,
      state: "thinking",
      slot_index: 1,
      image_url: assetUrl,
      raw_image_url: rawAssetUrl,
    });

    // 2. Verify original download endpoint via slot route
    const originalRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/styles/${style.id}/slots/thinking/1/download?type=original`,
    });

    expect(originalRes.statusCode).toBe(200);
    expect(originalRes.headers["content-type"]).toBe("image/png");
    expect(originalRes.headers["content-disposition"]).toContain("attachment");
    expect(originalRes.headers["content-disposition"]).toContain("Barnaby_Bear_Woodland_Explorer_thinking_slot1_original.png");

    // Verify dimensions of original download (strictly 1280x720)
    const decodedOriginal = decodePngToRgba(new Uint8Array(originalRes.rawPayload));
    expect(decodedOriginal.width).toBe(1280);
    expect(decodedOriginal.height).toBe(720);

    // 3. Verify transparent download endpoint via slot route
    const transparentRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/styles/${style.id}/slots/thinking/1/download?type=transparent`,
    });

    expect(transparentRes.statusCode).toBe(200);
    expect(transparentRes.headers["content-type"]).toBe("image/png");
    expect(transparentRes.headers["content-disposition"]).toContain("attachment");
    expect(transparentRes.headers["content-disposition"]).toContain("Barnaby_Bear_Woodland_Explorer_thinking_slot1_transparent.png");

    // Verify dimensions of transparent download (strictly 1280x720, NOT alpha cropped!)
    const decodedTransparent = decodePngToRgba(new Uint8Array(transparentRes.rawPayload));
    expect(decodedTransparent.width).toBe(1280);
    expect(decodedTransparent.height).toBe(720);

    // Verify that matting removed background outside mascot area (corners have alpha 0)
    const topLeftAlpha = decodedTransparent.data[3];
    expect(topLeftAlpha).toBe(0);

    // Mascot center still has alpha > 0
    const centerIdx = (360 * 1280 + 640) * 4;
    const centerAlpha = decodedTransparent.data[centerIdx + 3];
    expect(centerAlpha).toBeGreaterThan(0);

    // 4. Verify direct transparent asset route with ?download=true
    const directTransparentRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/transparent/${sourceFilename}?download=true`,
    });
    expect(directTransparentRes.statusCode).toBe(200);
    expect(directTransparentRes.headers["content-disposition"]).toContain("attachment");
    expect(directTransparentRes.headers["content-disposition"]).toContain("style_woodland_thinking_slot1_transparent.png");

    // 5. Verify direct asset route with ?download=true
    const directOriginalRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/${sourceFilename}?download=true`,
    });
    expect(directOriginalRes.statusCode).toBe(200);
    expect(directOriginalRes.headers["content-disposition"]).toContain(`attachment; filename="${sourceFilename}"`);
  });

  it("returns 404 for invalid slot index or nonexistent mascot/style", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-404-test-"));
    roots.push(root);
    const app = await buildApp(root);

    const resNonexistentMascot = await app.server.inject({
      method: "GET",
      url: "/api/mascots/nonexistent/styles/core/slots/thinking/1/download",
    });
    expect(resNonexistentMascot.statusCode).toBe(404);

    const mascot = await app.repository.saveMascot({ name: "Pip", visual_style: "pixar_3d", actions: {} });

    const resEmptySlot = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/styles/nonexistent/slots/thinking/1/download`,
    });
    expect(resEmptySlot.statusCode).toBe(404);
  });
});

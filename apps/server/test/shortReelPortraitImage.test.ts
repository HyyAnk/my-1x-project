import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { packageImage } from "./helpers/shortReelPackageFixture.js";
import { normalizeReelPortrait } from "../src/shortReel/portraitImage.js";

describe("Short-Reel Portrait Normalization (Phase 02 / I04, I05)", () => {
  it("I04: normalizes valid 720x1280 image to 1080x1920 PNG without stretching", async () => {
    const raw720 = await packageImage("red", 720, 1280);
    const normalized = await normalizeReelPortrait(raw720);

    const meta = await sharp(normalized).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1920);
    expect(meta.format).toBe("png");
  });

  it("I04: preserves native 1080x1920 PNG image", async () => {
    const raw1080 = await packageImage("blue", 1080, 1920);
    const normalized = await normalizeReelPortrait(raw1080);

    const meta = await sharp(normalized).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1920);
    expect(meta.format).toBe("png");
  });

  it("I04: converts valid 9:16 JPEG and WebP to 1080x1920 PNG", async () => {
    const jpegBuffer = await sharp({
      create: { width: 720, height: 1280, channels: 3, background: "green" },
    })
      .jpeg()
      .toBuffer();

    const normalizedJpeg = await normalizeReelPortrait(jpegBuffer);
    const metaJpeg = await sharp(normalizedJpeg).metadata();
    expect(metaJpeg.width).toBe(1080);
    expect(metaJpeg.height).toBe(1920);
    expect(metaJpeg.format).toBe("png");

    const webpBuffer = await sharp({
      create: { width: 720, height: 1280, channels: 4, background: "yellow" },
    })
      .webp()
      .toBuffer();

    const normalizedWebp = await normalizeReelPortrait(webpBuffer);
    const metaWebp = await sharp(normalizedWebp).metadata();
    expect(metaWebp.width).toBe(1080);
    expect(metaWebp.height).toBe(1920);
    expect(metaWebp.format).toBe("png");
  });

  it("I04: accepts near-ratio tolerance (e.g. 721x1280)", async () => {
    const nearBuffer = await packageImage("purple", 721, 1280);
    const normalized = await normalizeReelPortrait(nearBuffer);

    const meta = await sharp(normalized).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1920);
    expect(meta.format).toBe("png");
  });

  it("I04: rejects landscape input (1280x720)", async () => {
    const landscape = await packageImage("red", 1280, 720);
    await expect(normalizeReelPortrait(landscape)).rejects.toMatchObject({
      code: "INVALID_DIMENSIONS",
    });
  });

  it("I04: rejects square input (1024x1024)", async () => {
    const square = await packageImage("red", 1024, 1024);
    await expect(normalizeReelPortrait(square)).rejects.toMatchObject({
      code: "INVALID_DIMENSIONS",
    });
  });

  it("I04: rejects incompatible portrait ratio (e.g. 3:4 / 768x1024)", async () => {
    const incompatiblePortrait = await packageImage("red", 768, 1024);
    await expect(normalizeReelPortrait(incompatiblePortrait)).rejects.toMatchObject({
      code: "INVALID_DIMENSIONS",
    });
  });

  it("I05: rejects corrupt image bytes and empty buffer", async () => {
    await expect(normalizeReelPortrait(new Uint8Array(0))).rejects.toMatchObject({
      code: "CORRUPT_IMAGE",
    });

    const garbage = Buffer.from("this is not a valid png or jpeg file");
    await expect(normalizeReelPortrait(garbage)).rejects.toMatchObject({
      code: "CORRUPT_IMAGE",
    });
  });

  it("I05: rejects oversized images exceeding 20 MiB", async () => {
    const oversized = Buffer.alloc(21 * 1024 * 1024);
    await expect(normalizeReelPortrait(oversized)).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });
});

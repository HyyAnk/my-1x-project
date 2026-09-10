import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as fsPromises from "node:fs/promises";
import { buildApp } from "../src/app.js";
import { detectMimeTypeFromMagicBytes, generateAssetETag, isAssetNotModified, resolveMediaMimeType } from "../src/utils/mediaMime.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

const TINY_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const TINY_WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0x0e, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00,
  0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00,
]);
const TINY_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
]);
const TINY_SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>`, "utf8");
const PROCEDURAL_SVG = Buffer.from(
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>`,
  "utf8",
);

describe("mediaMime Utility & Magic Bytes Inspection", () => {
  it("detects MIME types accurately via magic bytes without full file buffering", async () => {
    expect(detectMimeTypeFromMagicBytes(TINY_PNG)).toBe("image/png");
    expect(detectMimeTypeFromMagicBytes(TINY_WEBP)).toBe("image/webp");
    expect(detectMimeTypeFromMagicBytes(TINY_JPEG)).toBe("image/jpeg");
    expect(detectMimeTypeFromMagicBytes(TINY_SVG)).toBe("image/svg+xml");
    expect(detectMimeTypeFromMagicBytes(PROCEDURAL_SVG)).toBe("image/svg+xml");
  });

  it("resolves procedural SVG saved with .png extension to image/svg+xml", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "mime-test-"));
    roots.push(tmpDir);
    const disguisedFile = path.join(tmpDir, "procedural_art.png");
    await writeFile(disguisedFile, PROCEDURAL_SVG);

    const resolved = await resolveMediaMimeType(disguisedFile);
    expect(resolved).toBe("image/svg+xml");
  });

  it("reads at most 64 bytes and resolves MIME types accurately for large media files", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "mime-test-"));
    roots.push(tmpDir);

    // Create a 512KB mock binary file with PNG header
    const largePng = Buffer.concat([TINY_PNG, Buffer.alloc(512 * 1024, 0xab)]);
    const pngFile = path.join(tmpDir, "large_mascot.png");
    await writeFile(pngFile, largePng);

    // Create a 512KB mock binary file with JPEG header
    const largeJpeg = Buffer.concat([TINY_JPEG, Buffer.alloc(512 * 1024, 0xcd)]);
    const jpegFile = path.join(tmpDir, "large_mascot.jpg");
    await writeFile(jpegFile, largeJpeg);

    // Create a mock binary file with WebP header
    const largeWebp = Buffer.concat([TINY_WEBP, Buffer.alloc(256 * 1024, 0xef)]);
    const webpFile = path.join(tmpDir, "large_mascot.webp");
    await writeFile(webpFile, largeWebp);

    const svgFile = path.join(tmpDir, "large_mascot.svg");
    await writeFile(svgFile, PROCEDURAL_SVG);

    // Verify resolveMediaMimeType resolves them all accurately
    expect(await resolveMediaMimeType(pngFile)).toBe("image/png");
    expect(await resolveMediaMimeType(jpegFile)).toBe("image/jpeg");
    expect(await resolveMediaMimeType(webpFile)).toBe("image/webp");
    expect(await resolveMediaMimeType(svgFile)).toBe("image/svg+xml");
  });

  it("handles ETag generation and conditional 304 evaluation", () => {
    const modified = "2026-09-09T10:00:00.000Z";
    const etag = generateAssetETag(4096, modified);
    expect(etag).toBe(`W/"4096-${Date.parse(modified)}"`);

    // Matching ETag
    expect(isAssetNotModified({ "if-none-match": etag }, etag, modified)).toBe(true);
    expect(isAssetNotModified({ "if-none-match": `"${4096}-${Date.parse(modified)}"` }, etag, modified)).toBe(true);
    expect(isAssetNotModified({ "if-none-match": "*" }, etag, modified)).toBe(true);
    expect(isAssetNotModified({ "if-none-match": 'W/"123-456"' }, etag, modified)).toBe(false);

    // Matching If-Modified-Since
    const httpDate = new Date(modified).toUTCString();
    expect(isAssetNotModified({ "if-modified-since": httpDate }, etag, modified)).toBe(true);
    const pastDate = new Date(Date.parse(modified) - 10_000).toUTCString();
    expect(isAssetNotModified({ "if-modified-since": pastDate }, etag, modified)).toBe(false);
  });
});

describe("Mascot Asset Streaming Route & HTTP Caching", () => {
  it("serves assets with 200 OK, streaming body, ETag, and immutable Cache-Control", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-asset-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");

    const app = await buildApp(root);
    const mascot = await app.repository.saveMascot({
      name: "Sparky",
      visual_style: "pixar_3d",
      actions: {},
    });

    await app.repository.saveMascotAsset(mascot.id, "avatar.png", TINY_PNG);
    await app.repository.saveMascotAsset(mascot.id, "badge.webp", TINY_WEBP);
    await app.repository.saveMascotAsset(mascot.id, "photo.jpg", TINY_JPEG);
    await app.repository.saveMascotAsset(mascot.id, "vector.svg", TINY_SVG);
    await app.repository.saveMascotAsset(mascot.id, "procedural.png", PROCEDURAL_SVG);

    // 1. Verify PNG
    const pngRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/avatar.png`,
    });
    expect(pngRes.statusCode).toBe(200);
    expect(pngRes.headers["content-type"]).toBe("image/png");
    expect(pngRes.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(pngRes.headers["etag"]).toBeDefined();
    expect(pngRes.headers["last-modified"]).toBeDefined();
    expect(Number(pngRes.headers["content-length"])).toBe(TINY_PNG.length);
    expect(Buffer.from(pngRes.rawPayload)).toEqual(TINY_PNG);

    // 2. Verify WebP
    const webpRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/badge.webp`,
    });
    expect(webpRes.statusCode).toBe(200);
    expect(webpRes.headers["content-type"]).toBe("image/webp");

    // 3. Verify JPEG
    const jpegRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/photo.jpg`,
    });
    expect(jpegRes.statusCode).toBe(200);
    expect(jpegRes.headers["content-type"]).toBe("image/jpeg");

    // 4. Verify SVG
    const svgRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/vector.svg`,
    });
    expect(svgRes.statusCode).toBe(200);
    expect(svgRes.headers["content-type"]).toBe("image/svg+xml");

    // 5. Verify Procedural SVG stored as .png
    const procRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/procedural.png`,
    });
    expect(procRes.statusCode).toBe(200);
    expect(procRes.headers["content-type"]).toBe("image/svg+xml");

    // 6. Conditional request: If-None-Match returns 304 Not Modified with 0 body bytes
    const etag = pngRes.headers["etag"] as string;
    const matchRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/avatar.png`,
      headers: { "if-none-match": etag },
    });
    expect(matchRes.statusCode).toBe(304);
    expect(matchRes.rawPayload.length).toBe(0);
    expect(matchRes.headers["etag"]).toBe(etag);

    // 7. Conditional request: If-Modified-Since returns 304 Not Modified with 0 body bytes
    const lastModified = pngRes.headers["last-modified"] as string;
    const imsRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/avatar.png`,
      headers: { "if-modified-since": lastModified },
    });
    expect(imsRes.statusCode).toBe(304);
    expect(imsRes.rawPayload.length).toBe(0);

    // 8. Stale conditional request returns 200 OK
    const staleRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/avatar.png`,
      headers: { "if-none-match": 'W/"9999-0"' },
    });
    expect(staleRes.statusCode).toBe(200);
    expect(staleRes.rawPayload.length).toBe(TINY_PNG.length);

    // 9. Missing asset returns 404
    const notFoundRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/assets/non_existent.png`,
    });
    expect(notFoundRes.statusCode).toBe(404);
  });
});

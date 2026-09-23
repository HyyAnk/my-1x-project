import { describe, expect, it } from "vitest";
import { computeCrc32, createZipArchive, createZipBlob } from "./zipArchive";

describe("zipArchive", () => {
  it("computes standard CRC-32 correctly", () => {
    const encoder = new TextEncoder();
    const data = encoder.encode("123456789");
    // Standard CRC-32 check value for "123456789" is 0xcbf43926 (3421780262)
    expect(computeCrc32(data)).toBe(0xcbf43926);
  });

  it("creates a valid PKZIP buffer with correct headers and signatures", () => {
    const encoder = new TextEncoder();
    const file1Data = encoder.encode("Hello World");
    const file2Data = encoder.encode("Secondary Test File");

    const zipBuffer = createZipArchive([
      { filename: "test1.txt", data: file1Data },
      { filename: "sub/test2.txt", data: file2Data },
    ]);

    expect(zipBuffer.length).toBeGreaterThan(0);

    const view = new DataView(zipBuffer.buffer, zipBuffer.byteOffset, zipBuffer.byteLength);

    // 1. First local header signature
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    // Method 0 (Store)
    expect(view.getUint16(8, true)).toBe(0);
    // CRC check for file1
    expect(view.getUint32(14, true)).toBe(computeCrc32(file1Data));
    // Size check
    expect(view.getUint32(18, true)).toBe(file1Data.length);
    expect(view.getUint32(22, true)).toBe(file1Data.length);

    // 2. Locate Central Directory & EOCD
    // EOCD signature should be near the end
    const eocdOffset = zipBuffer.length - 22;
    expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
    expect(view.getUint16(eocdOffset + 8, true)).toBe(2); // 2 entries on disk
    expect(view.getUint16(eocdOffset + 10, true)).toBe(2); // 2 total entries
  });

  it("wraps zip buffer in an application/zip Blob", () => {
    const blob = createZipBlob([{ filename: "dummy.png", data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) }]);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(0);
  });
});

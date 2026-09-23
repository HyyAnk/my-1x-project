/**
 * Standard PKZIP archive creator for client-side browser usage.
 * Uses Method 0 (Store), which is ideal for pre-compressed assets such as PNGs.
 */

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

/**
 * Computes standard IEEE 802.3 CRC-32 checksum.
 */
export function computeCrc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipArchiveEntry {
  filename: string;
  data: Uint8Array;
}

interface PreparedEntry {
  filenameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  localHeaderOffset: number;
}

/**
 * Creates a standard PKZIP archive buffer from an array of entries.
 */
export function createZipArchive(entries: ZipArchiveEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const preparedEntries: PreparedEntry[] = [];

  let totalSize = 0;
  for (const entry of entries) {
    const filenameBytes = encoder.encode(entry.filename);
    const crc = computeCrc32(entry.data);
    preparedEntries.push({
      filenameBytes,
      data: entry.data,
      crc,
      localHeaderOffset: 0,
    });
    // Local header: 30 bytes + filename + data
    totalSize += 30 + filenameBytes.length + entry.data.byteLength;
    // Central directory header: 46 bytes + filename
    totalSize += 46 + filenameBytes.length;
  }
  // End of Central Directory: 22 bytes
  totalSize += 22;

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;

  // 1. Write Local File Headers and Data
  for (const entry of preparedEntries) {
    entry.localHeaderOffset = offset;
    const { filenameBytes, data, crc } = entry;

    view.setUint32(offset, 0x04034b50, true); // Local header signature
    view.setUint16(offset + 4, 20, true); // Version needed (2.0)
    view.setUint16(offset + 6, 0x0800, true); // Flags (bit 11 = UTF-8)
    view.setUint16(offset + 8, 0, true); // Compression: Store (0)
    view.setUint16(offset + 10, 0, true); // Last mod time
    view.setUint16(offset + 12, 0, true); // Last mod date
    view.setUint32(offset + 14, crc, true); // CRC-32
    view.setUint32(offset + 18, data.byteLength, true); // Compressed size
    view.setUint32(offset + 22, data.byteLength, true); // Uncompressed size
    view.setUint16(offset + 26, filenameBytes.length, true); // Filename length
    view.setUint16(offset + 28, 0, true); // Extra field length
    offset += 30;

    buffer.set(filenameBytes, offset);
    offset += filenameBytes.length;

    buffer.set(data, offset);
    offset += data.byteLength;
  }

  const centralDirStartOffset = offset;

  // 2. Write Central Directory Headers
  for (const entry of preparedEntries) {
    const { filenameBytes, data, crc, localHeaderOffset } = entry;

    view.setUint32(offset, 0x02014b50, true); // CD header signature
    view.setUint16(offset + 4, 20, true); // Version made by
    view.setUint16(offset + 6, 20, true); // Version needed (2.0)
    view.setUint16(offset + 8, 0x0800, true); // Flags (bit 11 = UTF-8)
    view.setUint16(offset + 10, 0, true); // Compression: Store (0)
    view.setUint16(offset + 12, 0, true); // Last mod time
    view.setUint16(offset + 14, 0, true); // Last mod date
    view.setUint32(offset + 16, crc, true); // CRC-32
    view.setUint32(offset + 20, data.byteLength, true); // Compressed size
    view.setUint32(offset + 24, data.byteLength, true); // Uncompressed size
    view.setUint16(offset + 28, filenameBytes.length, true); // Filename length
    view.setUint16(offset + 30, 0, true); // Extra field length
    view.setUint16(offset + 32, 0, true); // Comment length
    view.setUint16(offset + 34, 0, true); // Disk number
    view.setUint16(offset + 36, 0, true); // Internal attributes
    view.setUint32(offset + 38, 0, true); // External attributes
    view.setUint32(offset + 42, localHeaderOffset, true); // Local header offset
    offset += 46;

    buffer.set(filenameBytes, offset);
    offset += filenameBytes.length;
  }

  const centralDirSize = offset - centralDirStartOffset;

  // 3. Write End of Central Directory Record (EOCD)
  view.setUint32(offset, 0x06054b50, true); // EOCD signature
  view.setUint16(offset + 4, 0, true); // Disk number
  view.setUint16(offset + 6, 0, true); // CD disk number
  view.setUint16(offset + 8, preparedEntries.length, true); // Disk entries count
  view.setUint16(offset + 10, preparedEntries.length, true); // Total entries count
  view.setUint32(offset + 12, centralDirSize, true); // CD size
  view.setUint32(offset + 16, centralDirStartOffset, true); // CD start offset
  view.setUint16(offset + 20, 0, true); // Comment length

  return buffer;
}

/**
 * Wraps generated ZIP buffer in a standard Blob.
 */
export function createZipBlob(entries: ZipArchiveEntry[]): Blob {
  const bytes = createZipArchive(entries);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/zip" });
}

/**
 * Triggers a download of a ZIP blob via browser anchor element.
 */
export function triggerZipBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof URL?.createObjectURL !== "function") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener noreferrer";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

/**
 * Computes standard IEEE 802.3 CRC-32 checksum for a buffer.
 */
export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Creates a standard 4-byte typed PNG chunk with 4-byte CRC-32 checksum.
 */
export function makePngChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const chunk = new Uint8Array(12 + len);
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  view.setUint32(0, len, false);
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);
  chunk.set(data, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  view.setUint32(8 + len, crc, false);
  return chunk;
}

/**
 * Computes exact duration in seconds from a standard RIFF/WAVE audio buffer.
 */
export function wavDurationSeconds(buffer: Uint8Array): number {
  if (buffer.length < 44) throw new Error("WAV file is incomplete or corrupted");
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (new TextDecoder().decode(buffer.slice(0, 4)) !== "RIFF" || new TextDecoder().decode(buffer.slice(8, 12)) !== "WAVE") {
    throw new Error("Buffer is not a valid RIFF/WAVE file");
  }
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = new TextDecoder().decode(buffer.slice(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === "fmt " && chunkSize >= 16 && offset + 24 <= buffer.length) {
      byteRate = view.getUint32(offset + 16, true);
    }
    if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  if (!byteRate || !dataSize) throw new Error("Invalid WAV headers: missing fmt or data chunk");
  return Math.round((dataSize / byteRate) * 100) / 100;
}


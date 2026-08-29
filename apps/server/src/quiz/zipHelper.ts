import { deflateRawSync, inflateRawSync } from "node:zlib";
import { crc32 } from "../utils/binary.js";

export { crc32 };

export interface ZipEntry {
  filename: string;
  data: Uint8Array;
}

/**
 * Creates a standard PKZIP archive from an array of files.
 */
export function createZipArchive(files: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralDirectoryHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.filename, "utf8");
    const uncompressedData = Buffer.from(file.data);
    const uncompressedSize = uncompressedData.length;
    const fileCrc = crc32(uncompressedData);

    const compressedData = deflateRawSync(uncompressedData);
    const compressedSize = compressedData.length;

    // Local file header (30 bytes + filename length)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(8, 8); // Compression method (8 = Deflate)
    localHeader.writeUInt16LE(0, 10); // Last mod file time
    localHeader.writeUInt16LE(0, 12); // Last mod file date
    localHeader.writeUInt32LE(fileCrc, 14); // CRC-32
    localHeader.writeUInt32LE(compressedSize, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    filenameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader);
    localHeaders.push(compressedData);

    // Central directory header (46 bytes + filename length)
    const cdHeader = Buffer.alloc(46 + filenameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory file header signature
    cdHeader.writeUInt16LE(20, 4); // Version made by
    cdHeader.writeUInt16LE(20, 6); // Version needed to extract
    cdHeader.writeUInt16LE(0, 8); // General purpose bit flag
    cdHeader.writeUInt16LE(8, 10); // Compression method
    cdHeader.writeUInt16LE(0, 12); // Last mod file time
    cdHeader.writeUInt16LE(0, 14); // Last mod file date
    cdHeader.writeUInt32LE(fileCrc, 16); // CRC-32
    cdHeader.writeUInt32LE(compressedSize, 20); // Compressed size
    cdHeader.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
    cdHeader.writeUInt16LE(filenameBuf.length, 28); // Filename length
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // File comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal file attributes
    cdHeader.writeUInt32LE(0, 38); // External file attributes
    cdHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    filenameBuf.copy(cdHeader, 46);

    centralDirectoryHeaders.push(cdHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirectoryOffset = offset;
  let centralDirectorySize = 0;
  for (const cd of centralDirectoryHeaders) {
    centralDirectorySize += cd.length;
  }

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(files.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirectorySize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirectoryOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // ZIP file comment length

  return Buffer.concat([...localHeaders, ...centralDirectoryHeaders, eocd]);
}

/**
 * Parses a standard PKZIP archive into an array of files.
 */
export function parseZipArchive(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let pos = 0;

  while (pos < buf.length - 4) {
    const sig = buf.readUInt32LE(pos);
    if (sig === 0x04034b50) {
      // Local file header
      const compMethod = buf.readUInt16LE(pos + 8);
      const compSize = buf.readUInt32LE(pos + 18);
      const uncompSize = buf.readUInt32LE(pos + 22);
      const filenameLen = buf.readUInt16LE(pos + 26);
      const extraLen = buf.readUInt16LE(pos + 28);

      const filename = buf.toString("utf8", pos + 30, pos + 30 + filenameLen);
      const dataStart = pos + 30 + filenameLen + extraLen;
      const compressedData = buf.subarray(dataStart, dataStart + compSize);

      let data: Uint8Array;
      if (compMethod === 0) {
        data = compressedData;
      } else if (compMethod === 8) {
        data = inflateRawSync(compressedData);
      } else {
        data = compressedData;
      }

      if (!filename.endsWith("/")) {
        entries.push({ filename, data });
      }

      pos = dataStart + compSize;
    } else if (sig === 0x02014b50 || sig === 0x06054b50) {
      // Reached Central Directory or End of Central Directory
      break;
    } else {
      pos++;
    }
  }

  return entries;
}

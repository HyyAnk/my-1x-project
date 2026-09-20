import sharp from "sharp";
import { hasNativeTransparency } from "./alphaFeathering.js";
import { decodePngToRgba } from "./pngCodec.js";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47] as const;

export function hasPngSignature(imageBytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((byte, index) => imageBytes[index] === byte);
}

export async function normalizeImageToPng(imageBytes: Uint8Array): Promise<Uint8Array> {
  if (hasPngSignature(imageBytes)) return imageBytes;
  const pngBuffer = await sharp(Buffer.from(imageBytes)).png().toBuffer();
  return new Uint8Array(pngBuffer);
}

export function hasMeaningfulPngTransparency(imageBytes: Uint8Array): boolean {
  if (!hasPngSignature(imageBytes)) return false;
  try {
    return hasNativeTransparency(decodePngToRgba(imageBytes));
  } catch {
    return false;
  }
}

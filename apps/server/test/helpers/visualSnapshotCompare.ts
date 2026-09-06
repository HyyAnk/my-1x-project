import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import sharp from "sharp";

export type PngPixels = { width: number; height: number; data: Uint8Array };

async function decodeRgba(png: Buffer): Promise<PngPixels> {
  const raw = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: raw.info.width, height: raw.info.height, data: new Uint8Array(raw.data) };
}

export type VisualDiffResult = {
  differentPixels: number;
  totalPixels: number;
  diffPercent: number;
  diffPng: Buffer;
};

export async function diffPngs(baseline: Buffer, actual: Buffer): Promise<VisualDiffResult> {
  const expected = await decodeRgba(baseline);
  const captured = await decodeRgba(actual);
  if (expected.width !== captured.width || expected.height !== captured.height) {
    throw new Error(`Snapshot size mismatch: baseline ${expected.width}x${expected.height}, captured ${captured.width}x${captured.height}`);
  }
  const diff = new Uint8Array(expected.width * expected.height * 4);
  const differentPixels = pixelmatch(expected.data, captured.data, diff, expected.width, expected.height, {
    threshold: 0.1,
  });
  const totalPixels = expected.width * expected.height;
  const diffPng = await sharp(diff, { raw: { width: expected.width, height: expected.height, channels: 4 } })
    .png()
    .toBuffer();
  return {
    differentPixels,
    totalPixels,
    diffPercent: (differentPixels / totalPixels) * 100,
    diffPng,
  };
}

export async function writeDiffArtifact(caseName: string, diff: VisualDiffResult): Promise<string> {
  // Kept inside node_modules so diff artifacts never pollute the tracked tree
  // and CI can upload the whole directory on failure.
  const diffDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "node_modules", ".cache", "quiz-visual-diffs");
  await mkdir(diffDir, { recursive: true });
  const diffPath = path.join(diffDir, `${caseName}-diff.png`);
  await writeFile(diffPath, diff.diffPng);
  return diffPath;
}

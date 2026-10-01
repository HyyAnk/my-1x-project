import sharp from "sharp";

export interface OpaqueColorStats {
  dominantHex: string;
  palette: string[];
  hasAlpha: boolean;
  isSquare: boolean;
  opaquePixelCount: number;
}

/**
 * Classifies an RGB hex color into a human-readable English color name.
 */
export function classifyHexColor(hex: string): string {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6) return "cyan";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) {
    if (l < 0.15) return "black";
    if (l > 0.85) return "white";
    return "gray";
  }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (l < 0.12) return "black";
  if (l > 0.88 && s < 0.2) return "white";
  if (s < 0.15) return "gray";

  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / d + 2) * 60;
  } else {
    h = ((r - g) / d + 4) * 60;
  }

  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 165) return "green";
  if (h < 200) return "cyan";
  if (h < 260) return "blue";
  if (h < 315) return "purple";
  return "pink";
}

/**
 * Normalizes hex colors into standard 7-character #rrggbb format.
 */
export function normalizeHexColor(hex?: string, fallback = "#06b6d4"): string {
  if (!hex || typeof hex !== "string") return fallback;
  const trimmed = hex.trim();
  const match6 = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (match6) return `#${match6[1].toLowerCase()}`;
  const match3 = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (match3) {
    const chars = match3[1].split("");
    return `#${chars.map((c) => c + c).join("").toLowerCase()}`;
  }
  return fallback;
}

export function colorEuclideanDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

/**
 * Extracts dominant color and palette by filtering out transparent or near-transparent pixels (alpha < 32)
 * and ignoring dark transparent edge bleed artifacts.
 */
export async function extractOpaqueColorStats(buffer: Buffer): Promise<OpaqueColorStats> {
  let isSquare = true;
  let hasAlpha = false;

  try {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    if (meta.width && meta.height) {
      isSquare = Math.abs(meta.width - meta.height) <= 32;
    }
    hasAlpha = Boolean(meta.hasAlpha);

    const { data } = await sharp(buffer, { failOn: "none" })
      .resize(96, 96, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bins = new Map<number, { count: number; rSum: number; gSum: number; bSum: number }>();
    let opaquePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      // Exclude transparent and semi-transparent fringe pixels (alpha < 32)
      if (a < 32) continue;
      opaquePixels++;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const qr = r >> 4;
      const qg = g >> 4;
      const qb = b >> 4;
      const key = (qr << 8) | (qg << 4) | qb;

      let entry = bins.get(key);
      if (!entry) {
        entry = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
        bins.set(key, entry);
      }
      entry.count++;
      entry.rSum += r;
      entry.gSum += g;
      entry.bSum += b;
    }

    if (opaquePixels === 0 || bins.size === 0) {
      return {
        dominantHex: "#06b6d4",
        palette: ["#06b6d4"],
        hasAlpha,
        isSquare,
        opaquePixelCount: 0,
      };
    }

    const sortedBins = Array.from(bins.values())
      .map((b) => ({
        count: b.count,
        r: Math.round(b.rSum / b.count),
        g: Math.round(b.gSum / b.count),
        b: Math.round(b.bSum / b.count),
        isDarkBleed: b.rSum / b.count <= 15 && b.gSum / b.count <= 15 && b.bSum / b.count <= 15,
      }))
      .sort((a, b) => b.count - a.count);

    // If top bin is a dark bleed artifact (#080808 or <= 15), prefer a non-bleed bin if available
    let dominantEntry = sortedBins[0];
    if (dominantEntry.isDarkBleed && sortedBins.length > 1) {
      const nonBleed = sortedBins.find((entry) => !entry.isDarkBleed);
      if (nonBleed) {
        dominantEntry = nonBleed;
      }
    }

    const toHex = (r: number, g: number, b: number) =>
      `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toLowerCase();

    let dominantHex = toHex(dominantEntry.r, dominantEntry.g, dominantEntry.b);
    if ((dominantHex === "#080808" || dominantHex === "#000000") && hasAlpha) {
      dominantHex = "#06b6d4";
    }

    // Build palette with up to 4 distinct representative colors
    const paletteEntries = [dominantEntry];
    for (const entry of sortedBins) {
      if (paletteEntries.length >= 4) break;
      if (entry.isDarkBleed) continue;
      const isDistinct = paletteEntries.every(
        (p) => colorEuclideanDistance(p.r, p.g, p.b, entry.r, entry.g, entry.b) > 40,
      );
      if (isDistinct) {
        paletteEntries.push(entry);
      }
    }

    const palette = paletteEntries.map((e) => toHex(e.r, e.g, e.b));

    return {
      dominantHex,
      palette,
      hasAlpha,
      isSquare,
      opaquePixelCount: opaquePixels,
    };
  } catch {
    return {
      dominantHex: "#06b6d4",
      palette: ["#06b6d4"],
      hasAlpha,
      isSquare,
      opaquePixelCount: 0,
    };
  }
}

import { deflateSync } from "node:zlib";
import type { ImageProvider } from "./index.js";
import { RepositoryService } from "../repository.js";
import { makePngChunk } from "../utils/binary.js";
import { FONT_5X7, type BitmapFont } from "./font5x7.js";

export { FONT_5X7, type BitmapFont };

type PngEncoderTarget = {
  channelId: string;
  episodeId: string;
  bundleNumber?: number;
  variant?: number;
  assetId?: string;
  fingerprint?: string;
  theme?: string;
  aspectRatio?: string;
};

/**
 * Creates a valid, theme-aware, readable 16:9 PNG placeholder.
 */
export function generateThemedPlaceholderPng(
  title: string,
  subtitle = "QUIZ ILLUSTRATION PLACEHOLDER",
  theme = "candy_arcade",
  width = 960,
  height = 540,
): Uint8Array {
  // Theme palette: background, accent, text
  type Rgb = [number, number, number];
  type Palette = { bg: Rgb; card: Rgb; accent: Rgb; text: Rgb; muted: Rgb };
  const palettes: Record<string, Palette> = {
    candy_arcade: { bg: [40, 24, 60], card: [68, 38, 98], accent: [255, 214, 90], text: [255, 248, 232], muted: [180, 160, 210] },
    candy_pop: { bg: [60, 20, 45], card: [100, 30, 75], accent: [255, 120, 102], text: [255, 255, 255], muted: [230, 170, 200] },
    space_lab: { bg: [15, 22, 40], card: [25, 40, 70], accent: [120, 185, 255], text: [235, 245, 255], muted: [140, 170, 210] },
    jungle_jamboree: { bg: [20, 45, 30], card: [35, 75, 50], accent: [115, 214, 189], text: [240, 255, 245], muted: [150, 200, 170] },
    ocean_explorer: { bg: [10, 35, 60], card: [20, 60, 100], accent: [120, 220, 255], text: [240, 250, 255], muted: [140, 190, 230] },
  };

  const p = palettes[theme] || palettes.candy_arcade;

  // RGBA buffer (height rows, width columns)
  const rawRgba = new Uint8Array(width * height * 4);

  // 1. Fill background with gradient & card
  const cardMarginX = Math.round(width * 0.08);
  const cardMarginY = Math.round(height * 0.12);

  for (let y = 0; y < height; y++) {
    const yRatio = y / height;
    const bgR = Math.min(255, Math.max(0, p.bg[0] + Math.round(yRatio * 20)));
    const bgG = Math.min(255, Math.max(0, p.bg[1] + Math.round(yRatio * 15)));
    const bgB = Math.min(255, Math.max(0, p.bg[2] + Math.round(yRatio * 25)));

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const inCard = x >= cardMarginX && x < width - cardMarginX && y >= cardMarginY && y < height - cardMarginY;
      const isCardBorder =
        inCard && (x === cardMarginX || x === width - cardMarginX - 1 || y === cardMarginY || y === height - cardMarginY - 1);

      if (isCardBorder) {
        rawRgba[idx] = p.accent[0];
        rawRgba[idx + 1] = p.accent[1];
        rawRgba[idx + 2] = p.accent[2];
        rawRgba[idx + 3] = 255;
      } else if (inCard) {
        rawRgba[idx] = p.card[0];
        rawRgba[idx + 1] = p.card[1];
        rawRgba[idx + 2] = p.card[2];
        rawRgba[idx + 3] = 255;
      } else {
        rawRgba[idx] = bgR;
        rawRgba[idx + 1] = bgG;
        rawRgba[idx + 2] = bgB;
        rawRgba[idx + 3] = 255;
      }
    }
  }

  // Draw bitmap text helper
  function drawText(text: string, startX: number, startY: number, scale: number, color: [number, number, number]) {
    let cursorX = startX;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const glyph = FONT_5X7[char] || FONT_5X7["?"];
      for (let col = 0; col < 5; col++) {
        const line = glyph[col] || 0;
        for (let row = 0; row < 7; row++) {
          if (line & (1 << row)) {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const px = cursorX + col * scale + sx;
                const py = startY + row * scale + sy;
                if (px >= 0 && px < width && py >= 0 && py < height) {
                  const idx = (py * width + px) * 4;
                  rawRgba[idx] = color[0];
                  rawRgba[idx + 1] = color[1];
                  rawRgba[idx + 2] = color[2];
                  rawRgba[idx + 3] = 255;
                }
              }
            }
          }
        }
      }
      cursorX += (5 + 1) * scale;
    }
  }

  // 2. Draw Subtitle / Kicker
  drawText(subtitle.toUpperCase().slice(0, 40), cardMarginX + 40, cardMarginY + 40, 2, p.accent);

  // 3. Draw Title / Question text wrapped across lines
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  const maxLineChars = 32;
  const words = cleanTitle.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxLineChars) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.slice(0, maxLineChars);
    }
  }
  if (currentLine) lines.push(currentLine);

  let textY = cardMarginY + 110;
  for (const line of lines.slice(0, 4)) {
    drawText(line, cardMarginX + 40, textY, 4, p.text);
    textY += 45;
  }

  // 4. Draw Degradation Fallback Notice
  drawText("TIER 3 DETERMINISTIC FALLBACK - OPERATOR REVIEW", cardMarginX + 40, height - cardMarginY - 45, 2, p.muted);

  // 5. Construct PNG scanlines with filter byte 0x00
  const scanlineLength = 1 + width * 4;
  const scanlines = new Uint8Array(height * scanlineLength);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    scanlines[rowOffset] = 0; // Filter: None
    scanlines.set(rawRgba.subarray(y * width * 4, (y + 1) * width * 4), rowOffset + 1);
  }

  const idatData = deflateSync(scanlines);

  // IHDR chunk
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace: None

  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makePngChunk("IHDR", ihdr);
  const idatChunk = makePngChunk("IDAT", idatData);
  const iendChunk = makePngChunk("IEND", new Uint8Array(0));

  const totalLength = pngSignature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(totalLength);
  let offset = 0;
  png.set(pngSignature, offset);
  offset += pngSignature.length;
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  png.set(idatChunk, offset);
  offset += idatChunk.length;
  png.set(iendChunk, offset);

  return png;
}

export class PngEncoderProvider implements ImageProvider {
  constructor(
    private readonly repository: RepositoryService,
    private readonly target: PngEncoderTarget,
  ) {}

  async generateReference(prompt: string): Promise<{ asset_path: string; fallback_tier: number; degraded: true }> {
    const ratioMatch =
      prompt.match(/Output framing:\s*(1:1|16:9|9:16|4:3|3:4|2:3|3:2)/i) || prompt.match(/Composition:\s*(1:1|16:9|9:16|4:3|3:4|2:3|3:2)/i);
    const targetAspectRatio = this.target.aspectRatio || (ratioMatch ? ratioMatch[1] : "16:9");

    let width = 960;
    let height = 540;
    if (targetAspectRatio === "1:1") {
      width = 540;
      height = 540;
    } else if (targetAspectRatio === "4:3") {
      width = 720;
      height = 540;
    } else if (targetAspectRatio === "3:4") {
      width = 540;
      height = 720;
    } else if (targetAspectRatio === "9:16") {
      width = 540;
      height = 960;
    }

    const bytes = generateThemedPlaceholderPng(
      prompt,
      this.target.assetId ? `ASSET: ${this.target.assetId}` : `BUNDLE CB-${String(this.target.bundleNumber ?? 1).padStart(2, "0")}`,
      this.target.theme ?? "candy_arcade",
      width,
      height,
    );

    let assetPath: string;
    if (this.target.assetId && this.target.fingerprint) {
      assetPath = await this.repository.writeQuizImageAsset(
        this.target.channelId,
        this.target.episodeId,
        this.target.assetId,
        this.target.fingerprint,
        bytes,
      );
    } else {
      assetPath = await this.repository.writeBundleImage(
        this.target.channelId,
        this.target.episodeId,
        this.target.bundleNumber ?? 1,
        bytes,
        this.target.variant ?? 0,
      );
    }

    return { asset_path: assetPath, fallback_tier: 3, degraded: true };
  }
}

import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import type { EditorialGeometry } from "./editorialTypes.js";

export function escapeMarkup(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function splitHeadline(text: string): [string, string] {
  const words = text.trim().split(/\s+/u);
  const units = words.length > 1 ? words : Array.from(text.trim());
  const separator = words.length > 1 ? " " : "";
  let split = 1;
  let difference = Infinity;
  for (let index = 1; index < units.length; index++) {
    const score = Math.abs(units.slice(0, index).join(separator).length - units.slice(index).join(separator).length);
    if (score < difference) {
      difference = score;
      split = index;
    }
  }
  return [units.slice(0, split).join(separator), units.slice(split).join(separator)];
}

async function renderText(text: string, color: string, width: number, height: number, root: string): Promise<Buffer> {
  const antonFont = path.join(root, "assets", "fonts", "Anton-Regular.ttf");
  const helloHeadlineFont = path.join(root, "assets", "fonts", "SVN-Hello Headline.otf");
  const nunitoFont = path.join(root, "assets", "fonts", "Nunito-VariableFont_wght.ttf");
  const isCjk = /[\u3000-\u9fff\uac00-\ud7af]/u.test(text);
  const preferredFont = fs.existsSync(antonFont) ? antonFont : fs.existsSync(helloHeadlineFont) ? helloHeadlineFont : nunitoFont;
  const fontfile = isCjk ? nunitoFont : preferredFont;
  const fontName = isCjk ? "Nunito Heavy 110" : fontfile === antonFont ? "Anton 120" : "SVN-Hello Headline 110";
  const formattedText = isCjk ? text : text.toUpperCase();

  const raster = await sharp({
    text: {
      text: `<span foreground="${color}">${escapeMarkup(formattedText)}</span>`,
      font: fontName,
      fontfile,
      rgba: true,
    },
  })
    .png()
    .toBuffer();
  return sharp(raster).resize({ width, height, fit: "inside" }).png().toBuffer();
}

function brushStrip(width: number, height: number, color: string, variant = 0): Buffer {
  const w = Math.max(width, 100);
  const h = Math.max(height, 40);

  if (variant === 0) {
    // Variant 0: Heavy confident paint brush swipe with feathered dry-brush bristle tails
    const pathD = [
      `M 14,${Math.round(h * 0.18)}`,
      `C ${Math.round(w * 0.15)},${Math.round(h * 0.08)} ${Math.round(w * 0.4)},${Math.round(h * 0.04)} ${Math.round(w * 0.7)},${Math.round(h * 0.06)}`,
      `Q ${Math.round(w * 0.88)},${Math.round(h * 0.08)} ${w - 38},${Math.round(h * 0.12)}`,
      `L ${w - 18},${Math.round(h * 0.08)} L ${w - 6},${Math.round(h * 0.18)} L ${w - 22},${Math.round(h * 0.28)}`,
      `L ${w - 2},${Math.round(h * 0.38)} L ${w - 16},${Math.round(h * 0.5)} L ${w},${Math.round(h * 0.62)}`,
      `L ${w - 12},${Math.round(h * 0.72)} L ${w - 4},${Math.round(h * 0.84)} L ${w - 28},${Math.round(h * 0.92)}`,
      `C ${Math.round(w * 0.75)},${Math.round(h * 0.94)} ${Math.round(w * 0.45)},${Math.round(h * 0.96)} ${Math.round(w * 0.2)},${Math.round(h * 0.92)}`,
      `Q 32,${Math.round(h * 0.9)} 16,${Math.round(h * 0.86)}`,
      `L 8,${Math.round(h * 0.78)} L 14,${Math.round(h * 0.65)} L 4,${Math.round(h * 0.52)}`,
      `L 12,${Math.round(h * 0.4)} L 6,${Math.round(h * 0.28)} Z`,
    ].join(" ");

    const fleck1 = `M ${w - 10},${Math.round(h * 0.24)} L ${w - 2},${Math.round(h * 0.22)} L ${w - 8},${Math.round(h * 0.3)} Z`;
    const fleck2 = `M ${w - 8},${Math.round(h * 0.78)} L ${w + 4},${Math.round(h * 0.8)} L ${w - 6},${Math.round(h * 0.86)} Z`;
    const fleck3 = `M 4,${Math.round(h * 0.36)} L 0,${Math.round(h * 0.4)} L 3,${Math.round(h * 0.44)} Z`;

    return Buffer.from(
      `<svg width="${w + 6}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
        `<path fill="${color}" d="${pathD}"/>` +
        `<path fill="${color}" d="${fleck1}"/>` +
        `<path fill="${color}" d="${fleck2}"/>` +
        `<path fill="${color}" d="${fleck3}"/>` +
      `</svg>`,
    );
  }

  // Variant 1: Dynamic punchy yellow brush swipe with sharper tapered bristle flick
  const pathD = [
    `M 20,${Math.round(h * 0.14)}`,
    `C ${Math.round(w * 0.2)},${Math.round(h * 0.04)} ${Math.round(w * 0.5)},${Math.round(h * 0.08)} ${Math.round(w * 0.75)},${Math.round(h * 0.04)}`,
    `Q ${Math.round(w * 0.9)},${Math.round(h * 0.06)} ${w - 32},${Math.round(h * 0.1)}`,
    `L ${w - 14},${Math.round(h * 0.04)} L ${w - 4},${Math.round(h * 0.14)} L ${w - 18},${Math.round(h * 0.24)}`,
    `L ${w + 2},${Math.round(h * 0.34)} L ${w - 12},${Math.round(h * 0.46)} L ${w + 6},${Math.round(h * 0.58)}`,
    `L ${w - 14},${Math.round(h * 0.7)} L ${w - 2},${Math.round(h * 0.82)} L ${w - 26},${Math.round(h * 0.94)}`,
    `C ${Math.round(w * 0.7)},${Math.round(h * 0.98)} ${Math.round(w * 0.4)},${Math.round(h * 0.94)} ${Math.round(w * 0.25)},${Math.round(h * 0.98)}`,
    `Q 36,${Math.round(h * 0.96)} 22,${Math.round(h * 0.9)}`,
    `L 10,${Math.round(h * 0.82)} L 18,${Math.round(h * 0.68)} L 6,${Math.round(h * 0.54)}`,
    `L 16,${Math.round(h * 0.42)} L 8,${Math.round(h * 0.26)} Z`,
  ].join(" ");

  const fleck1 = `M ${w - 6},${Math.round(h * 0.2)} L ${w + 8},${Math.round(h * 0.18)} L ${w - 4},${Math.round(h * 0.28)} Z`;
  const fleck2 = `M ${w - 10},${Math.round(h * 0.74)} L ${w + 8},${Math.round(h * 0.76)} L ${w - 6},${Math.round(h * 0.84)} Z`;
  const fleck3 = `M 8,${Math.round(h * 0.22)} L 2,${Math.round(h * 0.26)} L 6,${Math.round(h * 0.3)} Z`;

  return Buffer.from(
    `<svg width="${w + 10}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<path fill="${color}" d="${pathD}"/>` +
      `<path fill="${color}" d="${fleck1}"/>` +
      `<path fill="${color}" d="${fleck2}"/>` +
      `<path fill="${color}" d="${fleck3}"/>` +
    `</svg>`,
  );
}

export async function headlineOverlays(hook: string, geometry: EditorialGeometry, root: string): Promise<OverlayOptions[]> {
  const lines = splitHeadline(hook);
  const box = geometry.headline;
  const lineHeight = Math.floor((box.height - 14) / 2);
  const overlays: OverlayOptions[] = [];
  for (const [index, line] of lines.entries()) {
    if (!line) continue;
    const text = await renderText(line, index === 0 ? "#ffffff" : "#111111", box.width - 56, lineHeight - 24, root);
    const size = await sharp(text).metadata();
    const width = Math.min(box.width, (size.width || 0) + 56);
    const left = box.left + (index === 1 ? 12 : 0);
    const top = box.top + index * (lineHeight + 10);
    overlays.push({ input: brushStrip(width, lineHeight, index === 0 ? "#111111" : "#ffe000", index), left, top });
    overlays.push({ input: text, left: left + 28, top: top + Math.floor((lineHeight - (size.height || 0)) / 2) });
  }
  return overlays;
}

export async function candidateOverlays(geometry: EditorialGeometry, root: string): Promise<OverlayOptions[]> {
  const overlays: OverlayOptions[] = [];
  for (const [index, center] of geometry.labelCenters.entries()) {
    const circle = Buffer.from(
      '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="30" fill="#111" stroke="white" stroke-width="4"/></svg>',
    );
    const label = await renderText(String.fromCharCode(65 + index), "#ffffff", 34, 40, root);
    const size = await sharp(label).metadata();
    overlays.push({ input: circle, left: center.x - 32, top: center.y - 32 });
    overlays.push({ input: label, left: center.x - Math.floor((size.width || 0) / 2), top: center.y - Math.floor((size.height || 0) / 2) });
  }
  return overlays;
}

export async function badgeOverlay(text: string, geometry: EditorialGeometry, root: string): Promise<OverlayOptions[]> {
  if (!text) return [];
  const label = await renderText(text, "#ffffff", 380, 40, root);
  const size = await sharp(label).metadata();
  const left = geometry.headline.left;
  const top = geometry.headline.top + geometry.headline.height + 12;
  return [
    { input: brushStrip((size.width || 0) + 32, 58, "#111111"), left, top },
    { input: label, left: left + 16, top: top + 9 },
  ];
}

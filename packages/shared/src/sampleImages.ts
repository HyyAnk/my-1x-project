export type SampleImageAspectRatio = "16:9" | "4:3" | "1:1" | "9:16" | "3:4";

export interface SampleImageSpec {
  id: string;
  aspectRatio: SampleImageAspectRatio;
  width: number;
  height: number;
  title: string;
  role: string;
  recommendedResolution: string;
  accentColor: string;
  secondaryColor: string;
}

export const SAMPLE_IMAGE_SPECS: Record<SampleImageAspectRatio, SampleImageSpec> = {
  "16:9": {
    id: "sample-16-9",
    aspectRatio: "16:9",
    width: 1280,
    height: 720,
    title: "16:9 Landscape Banner",
    role: "Hero Banner / Mystery Reveal",
    recommendedResolution: "1280 × 720 px",
    accentColor: "#38bdf8",
    secondaryColor: "#6366f1",
  },
  "4:3": {
    id: "sample-4-3",
    aspectRatio: "4:3",
    width: 1080,
    height: 810,
    title: "4:3 Question Media",
    role: "Question Hero / Clue Deduction",
    recommendedResolution: "1080 × 810 px",
    accentColor: "#f59e0b",
    secondaryColor: "#ec4899",
  },
  "1:1": {
    id: "sample-1-1",
    aspectRatio: "1:1",
    width: 640,
    height: 640,
    title: "1:1 Square Option",
    role: "Visual Choice Card / Avatar",
    recommendedResolution: "640 × 640 px",
    accentColor: "#10b981",
    secondaryColor: "#06b6d4",
  },
  "9:16": {
    id: "sample-9-16",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    title: "9:16 Vertical Reel",
    role: "Shorts / Mobile Story Reel",
    recommendedResolution: "1080 × 1920 px",
    accentColor: "#a855f7",
    secondaryColor: "#3b82f6",
  },
  "3:4": {
    id: "sample-3-4",
    aspectRatio: "3:4",
    width: 810,
    height: 1080,
    title: "3:4 Portrait Media",
    role: "Portrait Card Media",
    recommendedResolution: "810 × 1080 px",
    accentColor: "#f43f5e",
    secondaryColor: "#fb923c",
  },
};

export interface SampleImageRenderOptions {
  slotLabel?: string;
  subLabel?: string;
  themeAccent?: string;
}

export function getSampleImageSpec(aspectRatio: string): SampleImageSpec {
  if (aspectRatio in SAMPLE_IMAGE_SPECS) {
    return SAMPLE_IMAGE_SPECS[aspectRatio as SampleImageAspectRatio];
  }
  return SAMPLE_IMAGE_SPECS["16:9"];
}

export function generateSampleImageSvg(
  spec: SampleImageSpec,
  options?: SampleImageRenderOptions,
): string {
  const { width, height, aspectRatio, recommendedResolution, role } = spec;
  const accent = options?.themeAccent ?? spec.accentColor;
  const secondary = spec.secondaryColor;
  const mainBadge = options?.slotLabel ?? `${aspectRatio} Ratio`;
  const subText = options?.subLabel ?? `${recommendedResolution} • ${role}`;

  // Calculated safe area
  const safeMarginX = Math.round(width * 0.08);
  const safeMarginY = Math.round(height * 0.08);
  const safeWidth = width - safeMarginX * 2;
  const safeHeight = height - safeMarginY * 2;

  // Center coordinate
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);

  // Card size
  const cardWidth = Math.min(Math.round(width * 0.76), 560);
  const cardHeight = Math.min(Math.round(height * 0.52), 260);
  const cardX = cx - Math.round(cardWidth / 2);
  const cardY = cy - Math.round(cardHeight / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad_${spec.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="badgeGrad_${spec.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
    <radialGradient id="glow_${spec.id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid_${spec.id}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    </pattern>
    <filter id="shadow_${spec.id}" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background Layer -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad_${spec.id})"/>
  <rect width="${width}" height="${height}" fill="url(#grid_${spec.id})"/>
  <circle cx="${cx}" cy="${cy}" r="${Math.round(Math.min(width, height) * 0.45)}" fill="url(#glow_${spec.id})"/>

  <!-- Safe Area Guides -->
  <rect x="${safeMarginX}" y="${safeMarginY}" width="${safeWidth}" height="${safeHeight}" rx="20" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="${safeMarginX + 16}" y="${safeMarginY + 28}" fill="rgba(255,255,255,0.35)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" letter-spacing="1">SAFE AREA (85%)</text>

  <!-- Alignment Crosshairs -->
  <path d="M ${cx - 24} ${cy} L ${cx + 24} ${cy} M ${cx} ${cy - 24} L ${cx} ${cy + 24}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>

  <!-- Corner Crop Marks -->
  <path d="M 24 48 L 24 24 L 48 24" fill="none" stroke="${accent}" stroke-width="3"/>
  <path d="M ${width - 24} 48 L ${width - 24} 24 L ${width - 48} 24" fill="none" stroke="${accent}" stroke-width="3"/>
  <path d="M 24 ${height - 48} L 24 ${height - 24} L 48 ${height - 24}" fill="none" stroke="${accent}" stroke-width="3"/>
  <path d="M ${width - 24} ${height - 48} L ${width - 24} ${height - 24} L ${width - 48} ${height - 24}" fill="none" stroke="${accent}" stroke-width="3"/>

  <!-- Center Specimen Card -->
  <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="24" fill="rgba(15, 23, 42, 0.82)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" filter="url(#shadow_${spec.id})"/>

  <!-- Specimen Badge Pill -->
  <g transform="translate(${cx}, ${cardY + 54})">
    <rect x="-105" y="-22" width="210" height="44" rx="22" fill="url(#badgeGrad_${spec.id})"/>
    <text x="0" y="6" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" letter-spacing="0.5">${mainBadge}</text>
  </g>

  <!-- Dimension Metric -->
  <text x="${cx}" y="${cardY + 128}" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" letter-spacing="-0.5">${recommendedResolution}</text>

  <!-- Role Subtitle -->
  <text x="${cx}" y="${cardY + 164}" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500">${subText}</text>

  <!-- Dimensions Indicator Edge Markers -->
  <text x="${cx}" y="${height - 18}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">WIDTH: ${width}px</text>
  <text x="18" y="${cy}" text-anchor="middle" transform="rotate(-90 18 ${cy})" fill="rgba(255,255,255,0.4)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">HEIGHT: ${height}px</text>
</svg>`;
}

export function generateSampleImageDataUri(
  spec: SampleImageSpec,
  options?: SampleImageRenderOptions,
): string {
  const svg = generateSampleImageSvg(spec, options);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

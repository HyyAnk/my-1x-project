import { esc } from "./candyArcadeSvg.js";

export interface BridgeTopicBackdropOptions {
  channelName?: string;
  hasCustomLogo?: boolean;
  logoUrl?: string;
  fallbackInitial?: string;
}

interface MonogramItem {
  type: "brand" | "accent";
  label: string;
  icon?: string;
}

const ACCENT_POOL: Array<{ label: string; icon: string }> = [
  { label: "QUIZ", icon: "⚡" },
  { label: "CHALLENGE", icon: "✦" },
  { label: "TRIVIA", icon: "❓" },
  { label: "LEVEL UP", icon: "★" },
  { label: "ARCADE", icon: "🎮" },
  { label: "GENIUS", icon: "💡" },
  { label: "SUPERSTAR", icon: "✨" },
  { label: "BRAIN POWER", icon: "🎯" },
];

function buildColumnGroupItems(channelName: string, columnIndex: number, count = 22): MonogramItem[] {
  const brand = channelName || "QUIZ";
  const items: MonogramItem[] = [];
  const startsWithBrand = columnIndex % 2 === 0;

  for (let i = 0; i < count; i++) {
    const isBrand = startsWithBrand ? i % 2 === 0 : i % 2 !== 0;
    if (isBrand) {
      items.push({ type: "brand", label: brand });
    } else {
      const accent = ACCENT_POOL[(columnIndex * 2 + i) % ACCENT_POOL.length];
      items.push({ type: "accent", label: accent.label, icon: accent.icon });
    }
  }
  return items;
}

function renderColumnGroup(items: MonogramItem[], options: BridgeTopicBackdropOptions): string {
  const initial = (options.fallbackInitial?.trim() || options.channelName?.trim().charAt(0) || "★").toUpperCase();
  const badgeHtml = options.hasCustomLogo && options.logoUrl
    ? `<img src="${esc(options.logoUrl)}" class="monogram-logo-img" alt="" />`
    : `<span class="monogram-initial-badge">${esc(initial)}</span>`;

  const itemsHtml = items.map((item) => {
    if (item.type === "brand") {
      return `<div class="monogram-brand-item">${badgeHtml} <span class="monogram-brand-name">${esc(item.label)}</span></div>`;
    }
    return `<div class="monogram-accent-item"><span class="monogram-accent-icon">${item.icon || "✦"}</span> <span>${esc(item.label)}</span></div>`;
  }).join("");

  return `<div class="bridge-monogram-group">${itemsHtml}</div>`;
}

function renderInfiniteRisingColumns(options: BridgeTopicBackdropOptions, columnCount = 6): string {
  const channelName = options.channelName?.trim() || "Quiz";
  let columnsHtml = "";

  for (let col = 0; col < columnCount; col++) {
    const items = buildColumnGroupItems(channelName, col, 22);
    const groupA = renderColumnGroup(items, options);
    const groupB = renderColumnGroup(items, options);

    columnsHtml += `<div class="bridge-monogram-column col-${col + 1}">` +
      `<div class="bridge-monogram-track">` +
        groupA +
        groupB +
      `</div>` +
    `</div>`;
  }

  return columnsHtml;
}

/**
 * Renders the multi-layered visual backdrop for Bridge Scene 1 (Topic Teaser).
 * Includes:
 * 1. Deep dynamic arcade gradient and spotlight glow behind the center card.
 * 2. True infinite loop: multiple staggered vertical columns of channel logos & quiz accents
 *    continuously emerging from the bottom edge and sailing upward smoothly.
 * 3. Dynamic shockwave pulses radiating outward when the scene starts.
 * 4. Zero rotating sunburst conic rays (completely removed per creative direction).
 * 5. Cinematic edge vignette to keep the viewer's focus on the center card.
 */
export function renderBridgeTopicBackdrop(options: BridgeTopicBackdropOptions = {}): string {
  const columnsHtml = renderInfiniteRisingColumns(options, 6);

  return `<div class="bridge-topic-backdrop">` +
    `<div class="bridge-spotlight-halo" aria-hidden="true" data-layout-ignore></div>` +
    `<div class="bridge-topic-shockwave sw-1" aria-hidden="true" data-layout-ignore></div>` +
    `<div class="bridge-topic-shockwave sw-2" aria-hidden="true" data-layout-ignore></div>` +
    `<div class="bridge-ambient-orb orb-1" aria-hidden="true" data-layout-ignore></div>` +
    `<div class="bridge-ambient-orb orb-2" aria-hidden="true" data-layout-ignore></div>` +
    `<div class="bridge-ambient-orb orb-3" aria-hidden="true" data-layout-ignore></div>` +
    `<div class="bridge-kinetic-monogram" aria-hidden="true" data-layout-ignore>` +
      columnsHtml +
    `</div>` +
    `<div class="bridge-vignette-overlay" aria-hidden="true" data-layout-ignore></div>` +
    `<div class="bridge-ambient-drift-icons" aria-hidden="true" data-layout-ignore>` +
      `<span class="bridge-drift-icon di-1">★</span>` +
      `<span class="bridge-drift-icon di-2">✦</span>` +
      `<span class="bridge-drift-icon di-3">❓</span>` +
      `<span class="bridge-drift-icon di-4">⚡</span>` +
      `<span class="bridge-drift-icon di-5">🎯</span>` +
      `<span class="bridge-drift-icon di-6">✨</span>` +
      `<span class="bridge-drift-icon di-7">💡</span>` +
      `<span class="bridge-drift-icon di-8">★</span>` +
    `</div>` +
    `<div class="bridge-floating-sparkles" aria-hidden="true" data-layout-ignore>` +
      `<span class="bridge-sparkle sp-1">✦</span>` +
      `<span class="bridge-sparkle sp-2">✨</span>` +
      `<span class="bridge-sparkle sp-3">★</span>` +
      `<span class="bridge-sparkle sp-4">⚡</span>` +
    `</div>` +
  `</div>`;
}

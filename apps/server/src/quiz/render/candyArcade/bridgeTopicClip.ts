import type {
  BridgeShowcaseItem,
  ChannelMascotConfig,
  MascotProfile,
  MascotRenderAspectRatio,
  MascotStateMediaMode,
} from "@studio/shared";
import { esc } from "./candyArcadeSvg.js";
import { assetFor, source } from "./candyArcadeAudio.js";
import { renderProductionMascotHtmlLayer, type ProductionMascotTimelineEvent } from "../productionMascotRenderer.js";
import { renderBridgeTopicBackdrop } from "./bridgeTopicBackdrop.js";
import { normalizeMascotTimelineEventsToZeroBased } from "./candyArcadeTiming.js";

export interface BridgeTopicClipInput {
  start: number;
  duration: number;
  topic: string;
  questionCount: number;
  badgeText?: string;
  promptText?: string;
  aspectRatio?: MascotRenderAspectRatio;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  mascotEvents?: readonly ProductionMascotTimelineEvent[];
  mediaMode?: MascotStateMediaMode;
  visualStyle?: string;
  mascotAction?: string;
  channelName?: string;
  hasCustomLogo?: boolean;
  logoUrl?: string;
  fallbackInitial?: string;
  showcaseItems?: readonly BridgeShowcaseItem[];
  assets?: Record<string, string>;
}

export function cleanTopicForDisplay(rawTopic?: string): string {
  if (!rawTopic || !rawTopic.trim()) return "Quiz Challenge";
  let topic = rawTopic.trim();
  const colonIndex = topic.search(/[:：]/);
  if (colonIndex > 2) {
    const prefix = topic.slice(0, colonIndex).trim();
    if (prefix.length >= 3) {
      topic = prefix;
    }
  } else if (topic.includes(" - ")) {
    const parts = topic.split(" - ");
    if (parts[0] && parts[0].trim().length >= 3) {
      topic = parts[0].trim();
    }
  }
  return topic.replace(/[!?,;.:：]+$/, "").trim();
}

function renderShowcaseItemsHtml(
  items: readonly BridgeShowcaseItem[],
  assets?: Record<string, string>,
): string {
  if (!items || items.length === 0) return "";

  const itemsHtml = items.slice(0, 4).map((item, index) => {
    const itemIndex = index + 1;

    const rawSrc = item.asset_path
      ? source(item.asset_path)
      : (assets ? assetFor(assets, item.asset_id, `asset-${item.asset_id}`) : null)
      ?? "";

    const imgTag = rawSrc
      ? `<img src="${esc(rawSrc)}" alt="${esc(item.subject)}" loading="eager" />`
      : `<span class="bridge-item-placeholder" aria-label="${esc(item.subject)}">${esc(item.subject)}</span>`;

    // item.caption is an internal asset-planning category (e.g. "Artifact", "Creature") and must never reach viewers.
    return `<div class="bridge-showcase-item item-${itemIndex}" data-asset-id="${esc(item.asset_id)}">${imgTag}</div>`;
  }).join("");

  return `<div class="bridge-showcase-row" data-count="${Math.min(items.length, 4)}">${itemsHtml}</div>`;
}


export function bridgeTopicClip(input: BridgeTopicClipInput): string {
  const duration = Math.max(0.04, input.duration);
  const badgeText = input.badgeText?.trim();
  const promptText = input.promptText?.trim();
  const questionCount = Math.max(1, input.questionCount);
  const countLabel = `${questionCount} ${questionCount === 1 ? "QUESTION" : "QUESTIONS"}`;
  const displayTopic = cleanTopicForDisplay(input.topic);

  const mascotHtml = input.mascot
    ? renderProductionMascotHtmlLayer(input.mascot, input.mascotConfig, {
        phase: "intro",
        clipStartSeconds: 0,
        clipDurationSeconds: duration,
        timelineEvents: normalizeMascotTimelineEventsToZeroBased(input.mascotEvents, input.start),
        aspectRatio: input.aspectRatio ?? "16:9",
        sourceMapper: source,
        mediaMode: input.mediaMode,
      })
    : "";

  const fallbackMascot = input.mascot || mascotHtml ? "" : `<div class="brand-mascot mascot-wave" data-layout-ignore aria-hidden="true">✦</div>`;

  const badgeHtml = badgeText
    ? `<div class="bridge-topic-badge"><span class="bridge-badge-icon" aria-hidden="true">⚡</span> <span>${esc(badgeText)}</span></div>`
    : "";

  const promptHtml = promptText
    ? `<p class="bridge-topic-prompt">${esc(promptText)}</p>`
    : "";

  const backdropHtml = renderBridgeTopicBackdrop({
    channelName: input.channelName,
    hasCustomLogo: input.hasCustomLogo,
    logoUrl: input.logoUrl,
    fallbackInitial: input.fallbackInitial,
  });

  const hasShowcase = Boolean(input.showcaseItems && input.showcaseItems.length > 0);
  const showcaseHtml = hasShowcase ? renderShowcaseItemsHtml(input.showcaseItems!, input.assets) : "";
  const sceneClass = hasShowcase
    ? "clip candy-scene bridge-topic-scene has-showcase"
    : "clip candy-scene bridge-topic-scene";
  const cardClass = hasShowcase
    ? "bridge-topic-card has-showcase"
    : "bridge-topic-card";


  return `<section id="candy-bridge-topic-${Math.round(input.start * 1000)}" class="${sceneClass}" data-start="${input.start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="0" style="--clip-start:0s;">` +
    backdropHtml +
    `<div class="${cardClass}">` +
      `<span class="bridge-decor-star bridge-star-tl" data-layout-ignore aria-hidden="true">★</span>` +
      `<span class="bridge-decor-star bridge-star-br" data-layout-ignore aria-hidden="true">★</span>` +
      `<span class="bridge-decor-star bridge-star-tr" data-layout-ignore aria-hidden="true">✦</span>` +
      `<span class="bridge-decor-star bridge-star-bl" data-layout-ignore aria-hidden="true">✨</span>` +
      badgeHtml +
      `<div class="bridge-count-pill"><span class="bridge-pill-icon" aria-hidden="true">🎯</span> <span class="bridge-count-text">${esc(countLabel)}</span></div>` +
      `<h1 class="bridge-topic-title">${esc(displayTopic)}</h1>` +
      promptHtml +
    `</div>` +
    showcaseHtml +
    (mascotHtml || fallbackMascot) +
  `</section>`;
}

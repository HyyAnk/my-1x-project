import type {
  ChannelMascotConfig,
  MascotProfile,
  MascotRenderAspectRatio,
  MascotStateMediaMode,
} from "@studio/shared";
import { esc } from "./candyArcadeSvg.js";
import { source } from "./candyArcadeAudio.js";
import { renderProductionMascotHtmlLayer, type ProductionMascotTimelineEvent } from "../productionMascotRenderer.js";
import { renderBridgeTopicBackdrop } from "./bridgeTopicBackdrop.js";

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
        clipStartSeconds: input.start,
        clipDurationSeconds: duration,
        timelineEvents: input.mascotEvents,
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

  return `<section id="candy-bridge-topic-${Math.round(input.start * 1000)}" class="clip candy-scene bridge-topic-scene" data-start="${input.start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="0" style="--clip-start:${input.start.toFixed(3)}s;">` +
    backdropHtml +
    `<div class="bridge-topic-card">` +
      `<span class="bridge-decor-star bridge-star-tl" data-layout-ignore aria-hidden="true">★</span>` +
      `<span class="bridge-decor-star bridge-star-br" data-layout-ignore aria-hidden="true">★</span>` +
      `<span class="bridge-decor-star bridge-star-tr" data-layout-ignore aria-hidden="true">✦</span>` +
      `<span class="bridge-decor-star bridge-star-bl" data-layout-ignore aria-hidden="true">✨</span>` +
      badgeHtml +
      `<div class="bridge-count-pill"><span class="bridge-pill-icon" aria-hidden="true">🎯</span> <span class="bridge-count-text">${esc(countLabel)}</span></div>` +
      `<h1 class="bridge-topic-title">${esc(displayTopic)}</h1>` +
      promptHtml +
    `</div>` +
    (mascotHtml || fallbackMascot) +
  `</section>`;
}

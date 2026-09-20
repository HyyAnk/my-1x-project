import { THUMBNAIL_LAYOUT_CATALOG, type QuizImageStyle, type ThumbnailAspectRatio, type ThumbnailLayoutType } from "@studio/shared";
import {
  getCuriosityBadgeText,
  getThumbnailLocalizedTexts,
  resolveThumbnailLanguage,
  resolveTopicSpecificHook,
} from "./thumbnailLocale.js";
import type { QuizThumbnailPlan, ResolveThumbnailInput } from "./thumbnailTypes.js";
import { resolveMascotThemedPersona } from "./thumbnailPersonaResolver.js";
import { resolveSubjectAnchors } from "./thumbnailSubjectAnchorResolver.js";
import { resolveFallbackEnvironment } from "./thumbnailEnvironmentResolver.js";
import { sanitizeThumbnailHook } from "./thumbnailHookGuardrail.js";

export { resolveMascotThemedPersona } from "./thumbnailPersonaResolver.js";
export { resolveSubjectAnchors } from "./thumbnailSubjectAnchorResolver.js";
export { resolveFallbackEnvironment } from "./thumbnailEnvironmentResolver.js";

interface LayoutMatchRule {
  readonly layout: ThumbnailLayoutType;
  readonly formatSubstrings?: readonly string[];
  readonly topicSubstrings?: readonly string[];
  readonly formatExact?: readonly string[];
}

const LAYOUT_MATCH_RULES: readonly LayoutMatchRule[] = [
  {
    layout: "split_vs",
    formatExact: ["versus"],
    formatSubstrings: ["vs"],
    topicSubstrings: [
      "would you rather",
      " vs ",
      "pick one",
      "どっち",
      "2択",
      "\u4e8c\u9009\u4e00",
      "\u4f60\u4f1a\u9009\u54ea\u4e2a",
      "\u9009\u4e00\u4e2a",
    ],
  },
  {
    layout: "mystery_silhouette",
    formatSubstrings: ["guess", "silhouette"],
    topicSubstrings: ["who is", "guess the", "誰", "シルエット", "mystery", "\u8fd9\u662f\u8c01", "\u731c\u731c", "\u526a\u5f71"],
  },
  {
    layout: "odd_one_out",
    formatSubstrings: ["odd", "spot"],
    topicSubstrings: [
      "odd one",
      "spot the difference",
      "間違い探し",
      "仲間外れ",
      "imposter",
      "\u627e\u51fa\u4e0d\u540c",
      "\u627e\u4e0d\u540c",
      "\u54ea\u4e00\u4e2a\u4e0d\u540c",
    ],
  },
  {
    layout: "difficulty_tier",
    formatSubstrings: ["tier", "level"],
    topicSubstrings: ["iq test", "level 1", "難易度", "iqテスト", "\u7b2c1\u5173", "\u96be\u5ea6", "\u667a\u5546\u6d4b\u8bd5"],
  },
  {
    layout: "true_false",
    formatSubstrings: ["true_false"],
    topicSubstrings: [
      "true or false",
      "ウソ",
      "ホント",
      "○✕",
      "myths",
      "\u662f\u771f\u662f\u5047",
      "\u5bf9\u8fd8\u662f\u9519",
      "\u771f\u6216\u5047",
    ],
  },
];

export function determineThumbnailLayout(
  formatLower: string,
  topicLower: string,
  layoutOverride?: ThumbnailLayoutType,
  aspectRatio?: ThumbnailAspectRatio,
): ThumbnailLayoutType {
  let layout: ThumbnailLayoutType | undefined;

  if (layoutOverride && THUMBNAIL_LAYOUT_CATALOG[layoutOverride]) {
    layout = layoutOverride;
  } else {
    for (const rule of LAYOUT_MATCH_RULES) {
      if (rule.formatExact?.some((f) => formatLower === f)) {
        layout = rule.layout;
        break;
      }
      if (rule.formatSubstrings?.some((f) => formatLower.includes(f))) {
        layout = rule.layout;
        break;
      }
      if (rule.topicSubstrings?.some((t) => topicLower.includes(t))) {
        layout = rule.layout;
        break;
      }
    }
  }

  if (!layout) {
    layout = "mega_grid";
  }

  // Strictly disallow odd_one_out in 9:16 portrait format
  if (aspectRatio === "9:16" && layout === "odd_one_out") {
    const isComparison =
      formatLower.includes("vs") ||
      formatLower === "versus" ||
      topicLower.includes(" vs ") ||
      topicLower.includes("would you rather") ||
      topicLower.includes("pick one") ||
      topicLower.includes("どっち") ||
      topicLower.includes("2択") ||
      topicLower.includes("\u4e8c\u9009\u4e00") ||
      topicLower.includes("\u4f60\u4f1a\u9009\u54ea\u4e2a");

    layout = isComparison ? "split_vs" : "mystery_silhouette";
  }

  return layout;
}

/**
 * Resolves optimal thumbnail layout and contextual mascot persona from quiz script and topic metadata.
 */
export function resolveThumbnailLayout(input: ResolveThumbnailInput): QuizThumbnailPlan {
  const topicLower = `${input.topicTitle} ${input.topicSummary || ""}`.toLowerCase();
  const formatLower = (input.questionFormat || "").toLowerCase();
  const count = input.questionCount || (input.questions?.length ?? 10);

  // 1. Determine Layout
  const layout = determineThumbnailLayout(formatLower, topicLower, input.layoutOverride, input.aspectRatio);
  const catalogEntry = THUMBNAIL_LAYOUT_CATALOG[layout];

  // 2. Resolve Localized Hook & Badge Text
  const language = resolveThumbnailLanguage(input);
  const localized = getThumbnailLocalizedTexts(layout, count, language);

  const topicSpecificHook = resolveTopicSpecificHook(topicLower, language);
  const rawHookCandidate = input.customHookText || topicSpecificHook || localized.hookText;
  const hookText = sanitizeThumbnailHook(rawHookCandidate, localized.hookText);
  const badgeText = getCuriosityBadgeText(input.badgeOverride, count, language, localized.badgeText, input.rng);

  // 3. Resolve Contextual Mascot Persona based on Topic & Layout
  const mascotPersona = resolveMascotThemedPersona(topicLower, layout, catalogEntry.mascotPersona);

  // 4. Resolve Subject Anchors (Visual objects only, zero raw question text)
  const subjectAnchors = resolveSubjectAnchors(input, layout);

  const visualStyle: QuizImageStyle = input.visualStyle || "pixar_3d";
  const colorTheme = input.colorTheme || input.mascotProfile?.color_theme || "#06b6d4";

  // 5. Resolve Fallback Environment & Lighting Atmosphere
  const { environmentAtmosphere, lightingPalette } = resolveFallbackEnvironment(topicLower, input.topicTitle);

  return {
    layout,
    hookText,
    badgeText,
    topicTitle: input.topicTitle,
    questionCount: count,
    visualStyle,
    colorTheme,
    mascotPersona,
    subjectAnchors,
    environmentAtmosphere,
    lightingPalette,
  };
}

import { THUMBNAIL_LAYOUT_CATALOG, type QuizImageStyle, type ThumbnailLayoutType } from "@studio/shared";
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
    topicSubstrings: ["would you rather", " vs ", "pick one", "どっち", "2択"],
  },
  {
    layout: "mystery_silhouette",
    formatSubstrings: ["guess", "silhouette"],
    topicSubstrings: ["who is", "guess the", "誰", "シルエット", "mystery"],
  },
  {
    layout: "odd_one_out",
    formatSubstrings: ["odd", "spot"],
    topicSubstrings: ["odd one", "spot the difference", "間違い探し", "仲間外れ", "imposter"],
  },
  {
    layout: "difficulty_tier",
    formatSubstrings: ["tier", "level"],
    topicSubstrings: ["iq test", "level 1", "難易度", "iqテスト"],
  },
  {
    layout: "true_false",
    formatSubstrings: ["true_false"],
    topicSubstrings: ["true or false", "ウソ", "ホント", "○✕", "myths"],
  },
];

function determineThumbnailLayout(formatLower: string, topicLower: string, layoutOverride?: ThumbnailLayoutType): ThumbnailLayoutType {
  if (layoutOverride && THUMBNAIL_LAYOUT_CATALOG[layoutOverride]) {
    return layoutOverride;
  }

  for (const rule of LAYOUT_MATCH_RULES) {
    if (rule.formatExact?.some((f) => formatLower === f)) {
      return rule.layout;
    }
    if (rule.formatSubstrings?.some((f) => formatLower.includes(f))) {
      return rule.layout;
    }
    if (rule.topicSubstrings?.some((t) => topicLower.includes(t))) {
      return rule.layout;
    }
  }

  return "mega_grid";
}

/**
 * Resolves optimal thumbnail layout and contextual mascot persona from quiz script and topic metadata.
 */
export function resolveThumbnailLayout(input: ResolveThumbnailInput): QuizThumbnailPlan {
  const topicLower = `${input.topicTitle} ${input.topicSummary || ""}`.toLowerCase();
  const formatLower = (input.questionFormat || "").toLowerCase();
  const count = input.questionCount || (input.questions?.length ?? 10);

  // 1. Determine Layout
  const layout = determineThumbnailLayout(formatLower, topicLower, input.layoutOverride);
  const catalogEntry = THUMBNAIL_LAYOUT_CATALOG[layout];

  // 2. Resolve Localized Hook & Badge Text
  const language = resolveThumbnailLanguage(input);
  const localized = getThumbnailLocalizedTexts(layout, count, language);

  const topicSpecificHook = resolveTopicSpecificHook(topicLower, language);
  const hookText = input.customHookText || topicSpecificHook || localized.hookText;
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

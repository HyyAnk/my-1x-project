import type {
  MascotProfile,
  QuizImageStyle,
  ThumbnailAspectRatio,
  ThumbnailComposition,
  ThumbnailHeadlineStyle,
  ThumbnailLayoutType,
} from "@studio/shared";
import type { EditorialThumbnailDesign } from "./editorial/editorialTypes.js";

export type MascotThemedPersona = {
  role: string;
  costume: string;
  prop: string;
  expression: string;
  poseDescription: string;
  /** The single story moment the mascot acts out with the hero subject. */
  dramaticHook?: string;
};

export type MascotPersonaVariation = {
  id: number;
  archetypeId: number;
  archetypeName: string;
  role: string;
  costume: string;
  prop: string;
  expression: string;
  poseDescription: string;
  dramaticHook?: string;
};

export type QuizSubjectAnchor = {
  label: string;
  visualPrompt: string;
  badge?: string;
};

export type QuizThumbnailPlan = {
  editorial?: EditorialThumbnailDesign;
  layout: ThumbnailLayoutType;
  hookText: string;
  badgeText: string;
  subTitle?: string;
  visualStyle: QuizImageStyle;
  colorTheme: string;
  mascotPersona: MascotThemedPersona;
  mascotVariations?: MascotPersonaVariation[];
  selectedVariationId?: number;
  subjectAnchors: QuizSubjectAnchor[];
  topicTitle: string;
  questionCount: number;
  environmentAtmosphere?: string;
  lightingPalette?: string;
  /** Headline lettering style proposed by the planner model; validated against rotation. */
  suggestedHeadlineStyle?: string;
};

export type ResolveThumbnailInput = {
  editorial?: boolean;
  editorialFallback?: boolean;
  topicTitle: string;
  topicSummary?: string;
  questionCount?: number;
  questionFormat?: string;
  questions?: Array<{
    question: string;
    choices?: string[];
    answer?: string;
  }>;
  visualStyle?: QuizImageStyle;
  colorTheme?: string;
  layoutOverride?: ThumbnailLayoutType;
  aspectRatio?: ThumbnailAspectRatio;
  customHookText?: string;
  badgeOverride?: string;
  language?: string;
  mascotProfile?: MascotProfile | null;
  rng?: () => number;
  /** Compositions used recently by this episode and its channel, newest first. */
  recentCompositions?: ThumbnailComposition[];
  /** Headlines used recently by this episode and its channel, newest first. */
  recentHeadlines?: string[];
  /** Headline lettering styles used recently by this episode and its channel, newest first. */
  recentHeadlineStyles?: ThumbnailHeadlineStyle[];
};

export type CompiledThumbnailPrompts = {
  plan: QuizThumbnailPlan;
  prompt_16_9: string;
  prompt_9_16: string;
};

export interface MascotVisualAnchor {
  base64: string; // valid data URL e.g. data:image/png;base64,...
  mimeType: string; // e.g. 'image/png'
  sourceUrl?: string; // relative asset url
  fingerprint: string; // sha256 hex of raw bytes
}

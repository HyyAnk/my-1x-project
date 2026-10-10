import type {
  ChannelMascotConfig,
  DirectorPlan,
  MascotProfile,
  QuizTimeline,
  QuizV2,
  MascotRenderAspectRatio,
  MascotStateMediaMode,
  IntroOutroTransitionType,
  ResolvedTransitionInstance,
  MotionTemplateOptions,
} from "@studio/shared";
import { type ResolveBgmOptions } from "../audio/bgmRegistry.js";
import {
  autoInjectFontFaces,
  candyArcadeCss,
  candyArcadeHeroAreaRatio,
  candyArcadeSystemFontFaceCss,
} from "./candyArcade/candyArcadeStyles.js";
import { highlightQuestionMarkup, illustrationDataUri, QUESTION_KEYWORD_STOP_WORDS, esc, escAttr } from "./candyArcade/candyArcadeSvg.js";
import { assetFor, buildBgmClips, buildSfxClips, sfxSource, source } from "./candyArcade/candyArcadeAudio.js";
import {
  introClip,
  outroClip,
  customIntroVideoClip,
  customOutroVideoClip,
  questionClip,
  bridgeTopicClip,
  bridgeSubscribeCtaClip,
  quizCopy,
  subCompositionMount,
  toSubComposition,
  transitionClip,
  mascotElement,
  brandLogoStingerClip,
  energyWhipStingerClip,
  celebrationStingerClip,
} from "./candyArcade/candyArcadeClips.js";
import { renderChannelBrandMark } from "./candyArcade/channelBrandMark.js";
import type { MascotAnimationRenderSnapshot } from "./productionMascotRenderer.js";
import type { QuizRenderStyleContext } from "./quizRenderStyleContext.js";
import type { ResolvedChannelBrandIdentity } from "../brand/channelBrandAssetResolver.js";
import { buildQuizShortCompositionBundle } from "./candyArcade/quizShortComposition.js";
import { buildEpisodeCompositionBundle } from "./candyArcade/episodeComposition.js";
import type { CandyArcadeProductKind } from "./candyArcade/candyArcadeClipTypes.js";

export type CandyArcadeCompositionInput = {
  /** Episodes render the landscape bookend flow; Quiz Shorts render the portrait kickoff, questions and score CTA. */
  productKind?: CandyArcadeProductKind;
  quiz: QuizV2;
  director: DirectorPlan;
  timeline: QuizTimeline;
  styleContext: QuizRenderStyleContext;
  audioPath: string;
  narrationDurationSeconds: number;
  aspectRatio?: MascotRenderAspectRatio;
  assets?: Record<string, string>;
  bgmOptions?: ResolveBgmOptions;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  premixedAudio?: boolean;
  mascotStyleId?: string | null;
  /** Must match the renderer CLI --fps so markup and encoder stay in sync. */
  fps?: number;
  introVideoPath?: string;
  outroVideoPath?: string;
  transitionType?: IntroOutroTransitionType;
  transitionDurationSeconds?: number;
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
  audioMode?: "use_video_audio" | "overlay_bgm";
  introHasAudio?: boolean;
  outroHasAudio?: boolean;
  mascotAnimationSnapshot?: MascotAnimationRenderSnapshot;
  mascotMediaMode?: MascotStateMediaMode;
  brandIdentity?: ResolvedChannelBrandIdentity;
  topic?: string;
  introMotionTemplateId?: string;
  introMotionTemplateOptions?: MotionTemplateOptions;
  outroMotionTemplateId?: string;
  outroMotionTemplateOptions?: MotionTemplateOptions;
  channelName?: string;
};

export type CandyArcadeCompositionBundle = {
  html: string;
  files: Record<string, string>;
  transitionInstances: Record<string, ResolvedTransitionInstance>;
  mascotAnimationSnapshot?: MascotAnimationRenderSnapshot;
};

export {
  candyArcadeHeroAreaRatio,
  candyArcadeCss,
  highlightQuestionMarkup,
  illustrationDataUri,
  QUESTION_KEYWORD_STOP_WORDS,
  esc,
  escAttr,
  buildBgmClips,
  buildSfxClips,
  sfxSource,
  source,
  assetFor,
  introClip,
  outroClip,
  customIntroVideoClip,
  customOutroVideoClip,
  questionClip,
  bridgeTopicClip,
  bridgeSubscribeCtaClip,
  brandLogoStingerClip,
  energyWhipStingerClip,
  celebrationStingerClip,
  transitionClip,
  mascotElement,
  quizCopy,
  toSubComposition,
  subCompositionMount,
  renderChannelBrandMark,
  autoInjectFontFaces,
  candyArcadeSystemFontFaceCss,
};

export function buildCandyArcadeComposition(input: CandyArcadeCompositionInput): string {
  return buildCandyArcadeCompositionBundle(input).html;
}

/** Entry point for every product: Quiz Shorts take the portrait path, Episodes the landscape bookend flow. */
export function buildCandyArcadeCompositionBundle(input: CandyArcadeCompositionInput): CandyArcadeCompositionBundle {
  return input.productKind === "quiz_short" ? buildQuizShortCompositionBundle(input) : buildEpisodeCompositionBundle(input);
}

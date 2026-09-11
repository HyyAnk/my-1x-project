import type {
  ChannelMascotConfig,
  DirectorPlan,
  MascotProfile,
  QuizTimeline,
  QuizV2,
  MascotRenderAspectRatio,
  Scene,
  IntroOutroTransitionType,
  ResolvedTransitionInstance,
} from "@studio/shared";
import type { ResolveBgmOptions } from "../audio/bgmRegistry.js";
import type { QuizRenderStyleContext } from "./quizRenderStyleContext.js";

export type QuizRenderInput = {
  quiz: QuizV2;
  director: DirectorPlan;
  timeline: QuizTimeline;
  scenes: Scene[];
  audioPath: string;
  styleContext: QuizRenderStyleContext;
  narrationDurationSeconds?: number;
  /** Canonical output canvas used by production and preview renderers. */
  aspectRatio?: MascotRenderAspectRatio;
  assets?: Record<string, string>;
  bgmOptions?: ResolveBgmOptions;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
  premixedAudio?: boolean;
  /** Must match the renderer CLI --fps so markup and encoder stay in sync. */
  fps?: number;
  introVideoPath?: string;
  outroVideoPath?: string;
  transitionType?: IntroOutroTransitionType;
  transitionDurationSeconds?: number;
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
};

export type PreparedQuizRender = {
  html: string;
  compositionFiles: Record<string, string>;
  durationSeconds: number;
  questionCount: number;
  styleCatalogRevision?: string;
  stylePresetRevision?: number;
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
};
export type QuizRenderResult = { composition: string; durationSeconds: number };

export interface QuizRenderer {
  prepare(input: QuizRenderInput): Promise<PreparedQuizRender>;
  render(input: QuizRenderInput): Promise<QuizRenderResult>;
}

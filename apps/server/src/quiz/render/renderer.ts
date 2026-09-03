import type {
  ChannelMascotConfig,
  DirectorPlan,
  MascotProfile,
  QuizTimeline,
  QuizV2,
  MascotRenderAspectRatio,
  Scene,
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
};

export type PreparedQuizRender = {
  html: string;
  compositionFiles: Record<string, string>;
  durationSeconds: number;
  questionCount: number;
  styleCatalogRevision?: string;
  stylePresetRevision?: number;
};
export type QuizRenderResult = { composition: string; durationSeconds: number };

export interface QuizRenderer {
  prepare(input: QuizRenderInput): Promise<PreparedQuizRender>;
  render(input: QuizRenderInput): Promise<QuizRenderResult>;
}

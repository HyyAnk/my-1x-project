import type { BridgeSceneConfig, DirectorPlan, QuizPacingProfile, QuizTimingPolicy, QuizV2, VoicePlan } from "@studio/shared";
import type { QuizTimelineProductKind } from "./quizShortTimelinePolicy.js";

export type TimelineCompileInput = {
  quiz: QuizV2;
  director: DirectorPlan;
  voicePlan: VoicePlan;
  audioDurations?: Record<string, number>;
  timing?: Partial<QuizTimingPolicy>;
  introDuration?: number;
  outroDuration?: number;
  channelName?: string;
  topic?: string;
  bridgeConfig?: BridgeSceneConfig;
  /** Defaults to "short" for quiz_short and "standard" otherwise. */
  pacingProfile?: QuizPacingProfile;
  /** Defaults to "episode", which keeps the historical intro/bridge/outro stage set. */
  productKind?: QuizTimelineProductKind;
  /** Quiz Short only: compile the three-second score CTA stage after the last question (default true). */
  outroCtaEnabled?: boolean;
};

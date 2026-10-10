import type { QuizAssetPlan, QuizAssetResolution, QuizQuestion } from "@studio/shared";
import type { BundleImageAsset } from "../types.js";

export interface BuildSlotsContext {
  question?: QuizQuestion;
  questionNumber: number;
  effectiveLayoutId: string;
  assetPlan: QuizAssetPlan | null;
  assetResolution: QuizAssetResolution | null;
  bundle?: BundleImageAsset;
  channelId: string;
  episodeId: string;
}

export type PlannedQuizAsset = QuizAssetPlan["assets"][number];
export type ResolvedQuizAsset = QuizAssetResolution["assets"][number];

/** Values derived once per question and shared by every slot builder. */
export interface SlotBuildScope {
  context: BuildSlotsContext;
  questionId: string;
  plannedAssets: PlannedQuizAsset[];
  resolvedAssets: ResolvedQuizAsset[];
}

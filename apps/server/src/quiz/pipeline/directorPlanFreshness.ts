import { QUIZ_GAMEPLAY_POLICY_VERSION, isQuizPortraitLayoutId, type DirectorPlan } from "@studio/shared";
import { matchesEpisodeLayout } from "../director/episodeDirectorPlan.js";
import type { QuizProductView } from "./quizProductView.js";

/** A Quiz Short plan is current when it carries the latest gameplay policy and only portrait layouts. */
export function matchesQuizShortLayout(plan: DirectorPlan): boolean {
  const policyVersion = plan.gameplay_policy_version ?? 0;
  if (policyVersion < QUIZ_GAMEPLAY_POLICY_VERSION) return false;
  return plan.beats.length > 0 && plan.beats.every((beat) => isQuizPortraitLayoutId(beat.layout_id));
}

/** Resume rule shared by the pipeline runners: regenerate the Director plan when it no longer fits its product. */
export function directorPlanNeedsRefresh(plan: DirectorPlan | null, view: QuizProductView): boolean {
  if (!plan) return true;
  if (view.kind === "quiz_short") return !matchesQuizShortLayout(plan);
  return view.episode !== null && !matchesEpisodeLayout(plan, view.episode.quiz_config);
}

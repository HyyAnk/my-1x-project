import type { QuizProductRef } from "@studio/shared";
import { RepositoryError } from "../../repository/errors.js";
import type { QuizRenderArtifactRepository, RequiredQuizRenderArtifacts } from "./quizRenderArtifacts.types.js";

export type { QuizRenderArtifactRepository, RequiredQuizRenderArtifacts };

/** Accepts an Episode id or an explicit product ref (Quiz Shorts live under a different collection). */
export async function loadRequiredQuizRenderArtifacts(
  repository: QuizRenderArtifactRepository,
  channelId: string,
  product: string | QuizProductRef,
): Promise<RequiredQuizRenderArtifacts> {
  const [quiz, director, assetPlan, voicePlan, timeline] = await Promise.all([
    repository.readQuiz(channelId, product),
    repository.readDirectorPlan(channelId, product),
    repository.readAssetPlan(channelId, product),
    repository.readVoicePlan(channelId, product),
    repository.readQuizTimeline(channelId, product),
  ]);

  const missing: string[] = [];
  if (!quiz) missing.push("quiz-v2.json");
  if (!director) missing.push("director-plan.json");
  if (!assetPlan) missing.push("asset-plan.json");
  if (!voicePlan) missing.push("voice-plan.json");
  if (!timeline) missing.push("timeline.json");

  if (missing.length > 0 || !quiz || !director || !assetPlan || !voicePlan || !timeline) {
    throw new RepositoryError(
      `Quiz V2 artifacts are required before rendering. Missing: ${missing.join(", ")}. Run the quiz-native generation stages and retry.`,
      "QUIZ_V2_REQUIRED",
    );
  }

  return {
    quiz,
    director,
    assetPlan,
    voicePlan,
    timeline,
  };
}

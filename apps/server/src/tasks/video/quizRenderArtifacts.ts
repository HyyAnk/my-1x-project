import { RepositoryError } from "../../repository/errors.js";
import type { QuizRenderArtifactRepository, RequiredQuizRenderArtifacts } from "./quizRenderArtifacts.types.js";

export type { QuizRenderArtifactRepository, RequiredQuizRenderArtifacts };

export async function loadRequiredQuizRenderArtifacts(
  repository: QuizRenderArtifactRepository,
  channelId: string,
  episodeId: string,
): Promise<RequiredQuizRenderArtifacts> {
  const [quiz, director, assetPlan, voicePlan, timeline] = await Promise.all([
    repository.readQuiz(channelId, episodeId),
    repository.readDirectorPlan(channelId, episodeId),
    repository.readAssetPlan(channelId, episodeId),
    repository.readVoicePlan(channelId, episodeId),
    repository.readQuizTimeline(channelId, episodeId),
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

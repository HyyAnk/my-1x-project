import type { DirectorPlan, QuestionHistoryCheckResult, QuizV2 } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import { createDefaultDirectorPlan } from "../../director/parseDirectorPlan.js";
import { deriveQuizV2FromScenes } from "../../domain/quiz.js";
import { checkQuestionsAgainstHistory } from "../../qa/questionHistory.js";
import { invalidateQuizArtifacts } from "../invalidation.js";
import type { QuizArtifacts, QuizOrchestratorInput } from "../orchestrator.js";

export async function readQuizArtifacts(input: QuizOrchestratorInput): Promise<QuizArtifacts> {
  const [quiz, history_check, director_plan, asset_plan, asset_resolution, voice_plan, timeline, assessment] = await Promise.all([
    input.repository.readQuiz(input.channelId, input.episodeId),
    input.repository.readHistoryCheck(input.channelId, input.episodeId),
    input.repository.readDirectorPlan(input.channelId, input.episodeId),
    input.repository.readAssetPlan(input.channelId, input.episodeId),
    input.repository.readQuizAssetResolution(input.channelId, input.episodeId),
    input.repository.readVoicePlan(input.channelId, input.episodeId),
    input.repository.readQuizTimeline(input.channelId, input.episodeId),
    input.repository.readQuizAssessment(input.channelId, input.episodeId),
  ]);
  return { quiz, history_check, director_plan, asset_plan, asset_resolution, voice_plan, timeline, assessment };
}

export async function generateQuiz(
  input: QuizOrchestratorInput,
): Promise<{ quiz: QuizV2; history_check: QuestionHistoryCheckResult; artifact_path: string; invalidated: string[] }> {
  const [episode, channel, scenes] = await Promise.all([
    input.repository.getEpisode(input.channelId, input.episodeId),
    input.repository.getChannel(input.channelId),
    input.repository.readScenes(input.channelId, input.episodeId),
  ]);
  const quiz = deriveQuizV2FromScenes({
    episodeId: episode.episode_id,
    language: channel.language,
    ageBand: episode.quiz_config.age_band,
    format: episode.quiz_config.quiz_format,
    scenes,
  });
  const artifact_path = await input.repository.writeQuiz(input.channelId, input.episodeId, quiz);

  // Run History Check against past 30 days
  const history = await input.repository.readQuestionHistory(input.channelId);
  const passThreshold = input.config.question_history?.pass_threshold ?? 2;
  const history_check = checkQuestionsAgainstHistory(input.episodeId, quiz.questions, history, passThreshold);
  await input.repository.writeHistoryCheck(input.channelId, input.episodeId, history_check);

  const invalidatedStages = invalidateQuizArtifacts("quiz");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);
  return { quiz, history_check, artifact_path, invalidated };
}

export async function generateDirector(
  input: QuizOrchestratorInput,
): Promise<{ director_plan: DirectorPlan; artifact_path: string; invalidated: string[] }> {
  const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
  if (!quiz) throw new RepositoryError("Generate the Quiz facts before the Director plan", "QUIZ_REQUIRED");
  const director_plan = createDefaultDirectorPlan(quiz);
  const artifact_path = await input.repository.writeDirectorPlan(input.channelId, input.episodeId, director_plan);
  const invalidatedStages = invalidateQuizArtifacts("director");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);
  return { director_plan, artifact_path, invalidated };
}

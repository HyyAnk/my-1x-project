import type { DirectorPlan, QuestionHistoryCheckResult, QuizV2 } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import { createEpisodeDirectorPlan } from "../../director/episodeDirectorPlan.js";
import { createQuizShortDirectorPlan } from "../../director/quizShortDirectorPlan.js";
import { deriveQuizV2FromScenes } from "../../domain/quiz.js";
import { checkQuestionsAgainstHistory } from "../../qa/questionHistory.js";
import { invalidateQuizArtifacts } from "../invalidation.js";
import type { QuizArtifacts, QuizOrchestratorInput } from "../orchestrator.js";
import { loadPipelineProductView, type QuizProductView } from "../quizProductView.js";

export async function readQuizArtifacts(input: QuizOrchestratorInput): Promise<QuizArtifacts> {
  const [quiz, history_check, director_plan, asset_plan, asset_resolution, voice_plan, timeline, assessment, description, title] =
    await Promise.all([
      input.repository.readQuiz(input.channelId, input.episodeId),
      input.repository.readHistoryCheck(input.channelId, input.episodeId),
      input.repository.readDirectorPlan(input.channelId, input.episodeId),
      input.repository.readAssetPlan(input.channelId, input.episodeId),
      input.repository.readQuizAssetResolution(input.channelId, input.episodeId),
      input.repository.readVoicePlan(input.channelId, input.episodeId),
      input.repository.readQuizTimeline(input.channelId, input.episodeId),
      input.repository.readQuizAssessment(input.channelId, input.episodeId),
      input.repository.readVideoDescription(input.channelId, input.episodeId),
      input.repository.readVideoTitle(input.channelId, input.episodeId),
    ]);
  return { quiz, history_check, director_plan, asset_plan, asset_resolution, voice_plan, timeline, assessment, description, title };
}

/** Quiz Shorts receive their questions from the bank at confirmation, so the saved quiz is the only source. */
async function readQuizShortQuiz(input: QuizOrchestratorInput): Promise<QuizV2> {
  const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
  if (quiz) return quiz;
  throw new RepositoryError(
    "Quiz Short questions are created at topic confirmation and cannot be regenerated here",
    "QUIZ_SHORT_QUIZ_MISSING",
  );
}

/** Episodes derive their quiz from scenes; Quiz Shorts reuse the quiz locked at confirmation. */
async function deriveProductQuiz(input: QuizOrchestratorInput, view: QuizProductView): Promise<QuizV2> {
  if (view.kind === "quiz_short") return readQuizShortQuiz(input);
  const [channel, scenes] = await Promise.all([
    input.repository.getChannel(input.channelId),
    input.repository.readScenes(input.channelId, view.id),
  ]);
  return deriveQuizV2FromScenes({
    episodeId: view.id,
    language: channel.language,
    ageBand: view.quiz_config.age_band,
    format: view.quiz_config.quiz_format,
    targetLayout: view.quiz_config.target_layout,
    gameplayId: view.quiz_config.archetype,
    scenes,
  });
}

export async function generateQuiz(
  input: QuizOrchestratorInput,
): Promise<{ quiz: QuizV2; history_check: QuestionHistoryCheckResult; artifact_path: string; invalidated: string[] }> {
  const view = await loadPipelineProductView(input);
  const quiz = await deriveProductQuiz(input, view);
  const artifact_path = await input.repository.writeQuiz(input.channelId, input.episodeId, quiz);

  // Run History Check against past 30 days
  const history = await input.repository.readQuestionHistory(input.channelId);
  const passThreshold = input.config.question_history?.pass_threshold ?? 2;
  const history_check = checkQuestionsAgainstHistory(input.episodeId, quiz.questions, history, passThreshold, view.kind);
  await input.repository.writeHistoryCheck(input.channelId, input.episodeId, history_check);

  const invalidatedStages = invalidateQuizArtifacts("quiz");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);
  return { quiz, history_check, artifact_path, invalidated };
}

/** Quiz Shorts alternate their portrait layout pair under the short pacing profile; Episodes keep the landscape director. */
function createProductDirectorPlan(quiz: QuizV2, view: QuizProductView): DirectorPlan {
  if (view.kind === "quiz_short") {
    if (!view.quizShort) throw new RepositoryError("Quiz Short record is required for the Director plan", "QUIZ_SHORT_REQUIRED");
    return createQuizShortDirectorPlan(quiz, view.quizShort.quiz_config);
  }
  if (!view.episode) throw new RepositoryError("Episode record is required for the Director plan", "EPISODE_REQUIRED");
  return createEpisodeDirectorPlan(quiz, view.episode.quiz_config);
}

export async function generateDirector(
  input: QuizOrchestratorInput,
): Promise<{ director_plan: DirectorPlan; artifact_path: string; invalidated: string[] }> {
  const [quiz, view] = await Promise.all([input.repository.readQuiz(input.channelId, input.episodeId), loadPipelineProductView(input)]);
  if (!quiz) throw new RepositoryError("Generate the Quiz facts before the Director plan", "QUIZ_REQUIRED");
  const director_plan = createProductDirectorPlan(quiz, view);
  const artifact_path = await input.repository.writeDirectorPlan(input.channelId, input.episodeId, director_plan);
  const invalidatedStages = invalidateQuizArtifacts("director");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);
  return { director_plan, artifact_path, invalidated };
}

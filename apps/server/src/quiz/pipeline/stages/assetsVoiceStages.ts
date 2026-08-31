import type { QuizAssetPlan, QuizAssetResolution, QuizIssue, VoicePlan, QuizTimeline } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import { planQuizAssets } from "../../assets/assetPlanner.js";
import { resolveQuizAssets } from "../../assets/resolveQuizAssets.js";
import { buildQuizVoicePlan } from "../../audio/voicePlan.js";
import { assembleQuizNarration, synthesizeQuizVoiceSegments } from "../../audio/voiceSynthesis.js";
import { quizVoiceTargetWordsPerSecond } from "../../audio/voicePolicy.js";
import { assertDirectorPlanValid } from "../../director/validateDirectorPlan.js";
import { compileQuizTimeline } from "../../timeline/compileTimeline.js";
import { invalidateQuizArtifacts } from "../invalidation.js";
import type { QuizOrchestratorInput } from "../orchestrator.js";

export async function planAssets(
  input: QuizOrchestratorInput,
): Promise<{ asset_plan: QuizAssetPlan; artifact_path: string; invalidated: string[] }> {
  const [quiz, director_plan] = await Promise.all([
    input.repository.readQuiz(input.channelId, input.episodeId),
    input.repository.readDirectorPlan(input.channelId, input.episodeId),
  ]);
  if (!quiz) throw new RepositoryError("Generate the Quiz facts before planning visual assets", "QUIZ_REQUIRED");
  if (!director_plan) throw new RepositoryError("Generate the Director plan before planning visual assets", "DIRECTOR_REQUIRED");
  const asset_plan = planQuizAssets(quiz, director_plan);
  const artifact_path = await input.repository.writeAssetPlan(input.channelId, input.episodeId, asset_plan);
  const invalidatedStages = invalidateQuizArtifacts("assets");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);
  return { asset_plan, artifact_path, invalidated };
}

export async function resolveAssets(
  input: QuizOrchestratorInput,
): Promise<{ asset_resolution: QuizAssetResolution; issues: QuizIssue[]; invalidated: string[] }> {
  const [asset_plan, channel] = await Promise.all([
    input.repository.readAssetPlan(input.channelId, input.episodeId),
    input.repository.getChannel(input.channelId),
  ]);
  if (!asset_plan) throw new RepositoryError("Generate the Asset plan before resolving visual assets", "ASSET_PLAN_REQUIRED");
  const visualStyle = channel.selected_styles?.[0];
  const result = await resolveQuizAssets({
    repository: input.repository,
    channelId: input.channelId,
    episodeId: input.episodeId,
    plan: asset_plan,
    visualStyle,
    activeEngine: input.activeEngine,
    antigravityClient: input.antigravityClient,
    imageConfig: input.config.image_generation
      ? {
          api_key: input.config.image_generation.api_key,
          model: input.config.image_generation.model,
          provider: input.config.image_generation.provider,
          base_url: input.config.image_generation.base_url,
          quality: input.config.image_generation.quality,
        }
      : undefined,
    onProgress: input.onAssetProgress,
  });
  const invalidated = await input.repository.invalidateQuizArtifacts(
    input.channelId,
    input.episodeId,
    invalidateQuizArtifacts("asset_resolution"),
  );
  return { asset_resolution: result.resolution, issues: result.issues, invalidated };
}

export async function planVoice(
  input: QuizOrchestratorInput,
): Promise<{ voice_plan: VoicePlan; artifact_path: string; invalidated: string[] }> {
  const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
  if (!quiz) throw new RepositoryError("Generate the Quiz facts before planning voice", "QUIZ_REQUIRED");
  const voice_plan = buildQuizVoicePlan(quiz);
  const artifact_path = await input.repository.writeVoicePlan(input.channelId, input.episodeId, voice_plan);
  const invalidatedStages = invalidateQuizArtifacts("voice");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);
  return { voice_plan, artifact_path, invalidated };
}

export async function generateVoice(input: QuizOrchestratorInput): Promise<{
  voice_plan: VoicePlan;
  timeline: QuizTimeline;
  narration_asset_path: string;
  narration_duration_seconds: number;
  artifact_path: string;
  timeline_path: string;
  invalidated: string[];
}> {
  const [quiz, director_plan] = await Promise.all([
    input.repository.readQuiz(input.channelId, input.episodeId),
    input.repository.readDirectorPlan(input.channelId, input.episodeId),
  ]);
  if (!quiz) throw new RepositoryError("Generate the Quiz facts before generating voice", "QUIZ_REQUIRED");
  if (!director_plan) throw new RepositoryError("Generate the Director plan before generating voice", "DIRECTOR_REQUIRED");
  assertDirectorPlanValid(quiz, director_plan);
  const invalidatedStages = invalidateQuizArtifacts("voice");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);
  const plannedVoice = buildQuizVoicePlan(quiz);
  const measured = await synthesizeQuizVoiceSegments({
    repository: input.repository,
    config: input.config.audio_generation,
    channelId: input.channelId,
    episodeId: input.episodeId,
    voicePlan: plannedVoice,
    targetWordsPerSecond: quizVoiceTargetWordsPerSecond(quiz.age_band),
    onProgress: input.onVoiceProgress,
    onPacingClamp: input.onVoicePacingClamp,
  });
  const audioDurations = Object.fromEntries(
    measured.voicePlan.segments.flatMap((segment) =>
      segment.duration_seconds === null ? [] : [[segment.segment_id, segment.duration_seconds]],
    ),
  );
  const timeline = compileQuizTimeline({ quiz, director: director_plan, voicePlan: measured.voicePlan, audioDurations });
  const narration = await assembleQuizNarration({
    repository: input.repository,
    channelId: input.channelId,
    episodeId: input.episodeId,
    voicePlan: measured.voicePlan,
    timeline,
    segmentPaths: measured.segmentPaths,
  });
  const [artifact_path, timeline_path] = await Promise.all([
    input.repository.writeVoicePlan(input.channelId, input.episodeId, measured.voicePlan),
    input.repository.writeQuizTimeline(input.channelId, input.episodeId, timeline),
  ]);
  return {
    voice_plan: measured.voicePlan,
    timeline,
    narration_asset_path: narration.assetPath,
    narration_duration_seconds: narration.durationSeconds,
    artifact_path,
    timeline_path,
    invalidated,
  };
}

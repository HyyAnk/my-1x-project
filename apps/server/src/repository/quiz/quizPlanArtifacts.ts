import {
  DirectorPlanSchema,
  QuizAssessmentSchema,
  QuizAssetPlanSchema,
  QuizAssetResolutionSchema,
  QuizTimelineSchema,
  QuizV2Schema,
  QuestionHistoryCheckResultSchema,
  VideoDescriptionSchema,
  VoicePlanSchema,
  type DirectorPlan,
  type QuizAssessment,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizTimeline,
  type QuizV2,
  type QuestionHistoryCheckResult,
  type VideoDescription,
  type VoicePlan,
} from "@studio/shared";
import type { RepositoryRuntime } from "../runtime.js";

export async function readQuiz(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<QuizV2 | null> {
  return this.readQuizArtifact(channelId, episodeId, "quiz-v2.json", QuizV2Schema);
}

export async function writeQuiz(this: RepositoryRuntime, channelId: string, episodeId: string, quiz: QuizV2): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "quiz-v2.json", QuizV2Schema.parse(quiz));
}

export async function readDirectorPlan(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<DirectorPlan | null> {
  return this.readQuizArtifact(channelId, episodeId, "director-plan.json", DirectorPlanSchema);
}

export async function writeDirectorPlan(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  plan: DirectorPlan,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "director-plan.json", DirectorPlanSchema.parse(plan));
}

export async function readAssetPlan(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<QuizAssetPlan | null> {
  return this.readQuizArtifact(channelId, episodeId, "asset-plan.json", QuizAssetPlanSchema);
}

export async function writeAssetPlan(this: RepositoryRuntime, channelId: string, episodeId: string, plan: QuizAssetPlan): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "asset-plan.json", QuizAssetPlanSchema.parse(plan));
}

export async function readQuizAssetResolution(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
): Promise<QuizAssetResolution | null> {
  return this.readQuizArtifact(channelId, episodeId, "asset-resolution.json", QuizAssetResolutionSchema);
}

export async function writeQuizAssetResolution(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  resolution: QuizAssetResolution,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "asset-resolution.json", QuizAssetResolutionSchema.parse(resolution));
}

export async function readQuizTimeline(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<QuizTimeline | null> {
  return this.readQuizArtifact(channelId, episodeId, "timeline.json", QuizTimelineSchema);
}

export async function writeQuizTimeline(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  timeline: QuizTimeline,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "timeline.json", QuizTimelineSchema.parse(timeline));
}

export async function readQuizAssessment(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<QuizAssessment | null> {
  return this.readQuizArtifact(channelId, episodeId, "qa.json", QuizAssessmentSchema);
}

export async function writeQuizAssessment(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  assessment: QuizAssessment,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "qa.json", QuizAssessmentSchema.parse(assessment));
}

export async function readVoicePlan(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<VoicePlan | null> {
  return this.readQuizArtifact(channelId, episodeId, "voice-plan.json", VoicePlanSchema);
}

export async function writeVoicePlan(this: RepositoryRuntime, channelId: string, episodeId: string, plan: VoicePlan): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "voice-plan.json", VoicePlanSchema.parse(plan));
}

export async function readHistoryCheck(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
): Promise<QuestionHistoryCheckResult | null> {
  return this.readQuizArtifact(channelId, episodeId, "history-check.json", QuestionHistoryCheckResultSchema);
}

export async function writeHistoryCheck(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  result: QuestionHistoryCheckResult,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "history-check.json", QuestionHistoryCheckResultSchema.parse(result));
}

export async function readVideoDescription(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
): Promise<VideoDescription | null> {
  return this.readQuizArtifact(channelId, episodeId, "video-description.json", VideoDescriptionSchema);
}

export async function writeVideoDescription(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  description: VideoDescription,
): Promise<string> {
  const parsed = VideoDescriptionSchema.parse(description);
  const artifactPath = await this.writeQuizArtifact(channelId, episodeId, "video-description.json", parsed);
  try {
    const episode = await this.getEpisode(channelId, episodeId);
    const channel = await this.getChannel(channelId);
    const textPath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "description.md");
    await this.writeTextAtomic(textPath, `${parsed.full_description_text}\n`);
  } catch {
    // Non-critical fallback if episode directory lookup fails
  }
  return artifactPath;
}

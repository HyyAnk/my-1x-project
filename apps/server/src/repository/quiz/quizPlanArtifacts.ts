import path from "node:path";
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
  QuizStageTimingsSchema,
  type DirectorPlan,
  type QuizAssessment,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizTimeline,
  type QuizV2,
  type QuestionHistoryCheckResult,
  type VideoDescription,
  type VoicePlan,
  type QuizStageTimings,
} from "@studio/shared";
import type { QuizProductId, RepositoryRuntime } from "../runtime.js";

export async function readQuiz(this: RepositoryRuntime, channelId: string, product: QuizProductId): Promise<QuizV2 | null> {
  return this.readQuizArtifact(channelId, product, "quiz-v2.json", QuizV2Schema);
}

export async function writeQuiz(this: RepositoryRuntime, channelId: string, product: QuizProductId, quiz: QuizV2): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "quiz-v2.json", QuizV2Schema.parse(quiz));
}

export async function readDirectorPlan(this: RepositoryRuntime, channelId: string, product: QuizProductId): Promise<DirectorPlan | null> {
  return this.readQuizArtifact(channelId, product, "director-plan.json", DirectorPlanSchema);
}

export async function writeDirectorPlan(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  plan: DirectorPlan,
): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "director-plan.json", DirectorPlanSchema.parse(plan));
}

export async function readAssetPlan(this: RepositoryRuntime, channelId: string, product: QuizProductId): Promise<QuizAssetPlan | null> {
  return this.readQuizArtifact(channelId, product, "asset-plan.json", QuizAssetPlanSchema);
}

export async function writeAssetPlan(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  plan: QuizAssetPlan,
): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "asset-plan.json", QuizAssetPlanSchema.parse(plan));
}

export async function readQuizAssetResolution(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
): Promise<QuizAssetResolution | null> {
  return this.readQuizArtifact(channelId, product, "asset-resolution.json", QuizAssetResolutionSchema);
}

export async function writeQuizAssetResolution(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  resolution: QuizAssetResolution,
): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "asset-resolution.json", QuizAssetResolutionSchema.parse(resolution));
}

export async function readQuizTimeline(this: RepositoryRuntime, channelId: string, product: QuizProductId): Promise<QuizTimeline | null> {
  return this.readQuizArtifact(channelId, product, "timeline.json", QuizTimelineSchema);
}

export async function writeQuizTimeline(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  timeline: QuizTimeline,
): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "timeline.json", QuizTimelineSchema.parse(timeline));
}

export async function readQuizAssessment(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
): Promise<QuizAssessment | null> {
  return this.readQuizArtifact(channelId, product, "qa.json", QuizAssessmentSchema);
}

export async function writeQuizAssessment(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  assessment: QuizAssessment,
): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "qa.json", QuizAssessmentSchema.parse(assessment));
}

export async function readVoicePlan(this: RepositoryRuntime, channelId: string, product: QuizProductId): Promise<VoicePlan | null> {
  return this.readQuizArtifact(channelId, product, "voice-plan.json", VoicePlanSchema);
}

export async function writeVoicePlan(this: RepositoryRuntime, channelId: string, product: QuizProductId, plan: VoicePlan): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "voice-plan.json", VoicePlanSchema.parse(plan));
}

export async function readHistoryCheck(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
): Promise<QuestionHistoryCheckResult | null> {
  return this.readQuizArtifact(channelId, product, "history-check.json", QuestionHistoryCheckResultSchema);
}

export async function writeHistoryCheck(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  result: QuestionHistoryCheckResult,
): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "history-check.json", QuestionHistoryCheckResultSchema.parse(result));
}

export async function readVideoDescription(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
): Promise<VideoDescription | null> {
  return this.readQuizArtifact(channelId, product, "video-description.json", VideoDescriptionSchema);
}

export async function writeVideoDescription(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  description: VideoDescription,
): Promise<string> {
  const parsed = VideoDescriptionSchema.parse(description);
  const artifactPath = await this.writeQuizArtifact(channelId, product, "video-description.json", parsed);
  try {
    const location = await this.locateQuizProduct(channelId, product);
    await this.writeTextAtomic(path.join(location.directory, "description.md"), `${parsed.full_description_text}\n`);
  } catch {
    // Non-critical fallback if the product directory lookup fails
  }
  return artifactPath;
}

export async function readQuizStageTimings(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
): Promise<QuizStageTimings | null> {
  return this.readQuizArtifact(channelId, product, "stage-timings.json", QuizStageTimingsSchema);
}

export async function writeQuizStageTimings(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  timings: QuizStageTimings,
): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "stage-timings.json", QuizStageTimingsSchema.parse(timings));
}

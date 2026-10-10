import type {
  BgmHistoryEntry,
  DirectorPlan,
  QuestionContentType,
  QuestionHistoryCheckResult,
  QuestionHistoryEntry,
  QuizAssessment,
  QuizAssetPlan,
  QuizAssetResolution,
  QuizQuestion,
  QuizStageTimings,
  QuizTimeline,
  QuizV2,
  UsageLedger,
  VideoDescription,
  VideoTitle,
  VoicePlan,
  QuestionImageItem,
  QuestionImagesOverviewResponse,
} from "@studio/shared";
import type { BundleImageMeta } from "../types.js";
import type { QuizProductId } from "../quizProductPaths.js";

export type QuizArtifactFilename =
  | "quiz-v2.json"
  | "director-plan.json"
  | "asset-plan.json"
  | "asset-resolution.json"
  | "voice-plan.json"
  | "timeline.json"
  | "qa.json"
  | "history-check.json"
  | "video-description.json"
  | "video-title.json"
  | "stage-timings.json";

export interface IQuizArtifactRepository {
  // Generic Quiz Artifact targets
  readQuizArtifact<T>(
    channelId: string,
    product: QuizProductId,
    filename: QuizArtifactFilename,
    schema: { parse(value: unknown): T },
  ): Promise<T | null>;
  writeQuizArtifact<T>(channelId: string, product: QuizProductId, filename: QuizArtifactFilename, value: T): Promise<string>;
  quizArtifactTarget(
    channelId: string,
    product: QuizProductId,
    filename: QuizArtifactFilename,
  ): Promise<{ absolutePath: string; relativePath: string }>;

  // Specific Quiz Artifacts
  readQuiz(channelId: string, product: QuizProductId): Promise<QuizV2 | null>;
  writeQuiz(channelId: string, product: QuizProductId, quiz: QuizV2): Promise<string>;
  readDirectorPlan(channelId: string, product: QuizProductId): Promise<DirectorPlan | null>;
  writeDirectorPlan(channelId: string, product: QuizProductId, plan: DirectorPlan): Promise<string>;
  readAssetPlan(channelId: string, product: QuizProductId): Promise<QuizAssetPlan | null>;
  writeAssetPlan(channelId: string, product: QuizProductId, plan: QuizAssetPlan): Promise<string>;
  readQuizAssetResolution(channelId: string, product: QuizProductId): Promise<QuizAssetResolution | null>;
  writeQuizAssetResolution(channelId: string, product: QuizProductId, resolution: QuizAssetResolution): Promise<string>;
  writeQuizImageAsset(
    channelId: string,
    product: QuizProductId,
    assetId: string,
    fingerprint: string,
    content: Uint8Array,
    meta?: BundleImageMeta,
  ): Promise<string>;
  resolveQuizAssetPath(channelId: string, product: QuizProductId, assetPath: string): Promise<string>;
  // Question image uploads remain Episode-only until the Quiz Short editor lands (Phase 6).
  listEpisodeQuestionImages(channelId: string, episodeId: string): Promise<QuestionImagesOverviewResponse>;
  saveUploadedQuestionImage(
    channelId: string,
    episodeId: string,
    questionNumber: number,
    content: Uint8Array,
    filename?: string,
    options?: { slotId?: string; assetId?: string },
  ): Promise<{ item: QuestionImageItem; invalidated: string[] }>;
  deleteUploadedQuestionImage(
    channelId: string,
    episodeId: string,
    questionNumber: number,
    options?: { slotId?: string; assetId?: string },
  ): Promise<{ item: QuestionImageItem; invalidated: string[] }>;
  readQuizTimeline(channelId: string, product: QuizProductId): Promise<QuizTimeline | null>;
  writeQuizTimeline(channelId: string, product: QuizProductId, timeline: QuizTimeline): Promise<string>;
  readQuizAssessment(channelId: string, product: QuizProductId): Promise<QuizAssessment | null>;
  writeQuizAssessment(channelId: string, product: QuizProductId, assessment: QuizAssessment): Promise<string>;
  readVoicePlan(channelId: string, product: QuizProductId): Promise<VoicePlan | null>;
  writeVoicePlan(channelId: string, product: QuizProductId, plan: VoicePlan): Promise<string>;
  getRenderedVoiceMetrics(): Promise<{
    rendered_characters: number;
    rendered_duration_seconds: number;
    rendered_segments_count: number;
    rendered_episodes_count: number;
  }>;
  readUsageLedger(): Promise<UsageLedger>;
  reconcileUsageLedgerFromDisk(): Promise<UsageLedger>;
  recordVoiceUsage(input: {
    channelId?: string;
    episodeId?: string;
    characters: number;
    durationSeconds: number;
    segmentsCount?: number;
    note?: string;
  }): Promise<UsageLedger>;
  recordImageUsage(input: {
    channelId?: string;
    episodeId?: string;
    reelId?: string;
    provider: string;
    model?: string;
    count?: number;
    costVnd?: number;
    costUsd?: number;
    note?: string;
  }): Promise<UsageLedger>;
  readHistoryCheck(channelId: string, product: QuizProductId): Promise<QuestionHistoryCheckResult | null>;
  writeHistoryCheck(channelId: string, product: QuizProductId, result: QuestionHistoryCheckResult): Promise<string>;
  readVideoDescription(channelId: string, product: QuizProductId): Promise<VideoDescription | null>;
  writeVideoDescription(channelId: string, product: QuizProductId, description: VideoDescription): Promise<string>;
  readVideoTitle(channelId: string, product: QuizProductId): Promise<VideoTitle | null>;
  writeVideoTitle(channelId: string, product: QuizProductId, title: VideoTitle): Promise<string>;
  readQuizStageTimings(channelId: string, product: QuizProductId): Promise<QuizStageTimings | null>;
  writeQuizStageTimings(channelId: string, product: QuizProductId, timings: QuizStageTimings): Promise<string>;
  readQuestionHistory(channelId: string): Promise<QuestionHistoryEntry[]>;
  appendQuestionHistory(
    channelId: string,
    product: QuizProductId,
    questions: QuizQuestion[],
    ttlDays?: number,
    renderTaskId?: string,
    contentType?: QuestionContentType,
  ): Promise<void>;
  removeQuestionHistoryEntries(
    channelId: string,
    filter: { episodeIds?: string[]; renderTaskIds?: string[] },
    ttlDays?: number,
  ): Promise<void>;
  readBgmHistory(channelId: string): Promise<BgmHistoryEntry[]>;
  appendBgmHistory(channelId: string, product: QuizProductId, trackId: string, filename: string, ttlDays?: number): Promise<void>;
  invalidateQuizArtifacts(channelId: string, product: QuizProductId, stages: string[]): Promise<string[]>;
}

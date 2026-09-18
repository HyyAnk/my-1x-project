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
  VoicePlan,
} from "@studio/shared";
import type { BundleImageMeta } from "../types.js";

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
  | "stage-timings.json";

export interface IQuizArtifactRepository {
  // Generic Quiz Artifact targets
  readQuizArtifact<T>(
    channelId: string,
    episodeId: string,
    filename: QuizArtifactFilename,
    schema: { parse(value: unknown): T },
  ): Promise<T | null>;
  writeQuizArtifact<T>(channelId: string, episodeId: string, filename: QuizArtifactFilename, value: T): Promise<string>;
  quizArtifactTarget(
    channelId: string,
    episodeId: string,
    filename: QuizArtifactFilename,
  ): Promise<{ absolutePath: string; relativePath: string }>;

  // Specific Quiz Artifacts
  readQuiz(channelId: string, episodeId: string): Promise<QuizV2 | null>;
  writeQuiz(channelId: string, episodeId: string, quiz: QuizV2): Promise<string>;
  readDirectorPlan(channelId: string, episodeId: string): Promise<DirectorPlan | null>;
  writeDirectorPlan(channelId: string, episodeId: string, plan: DirectorPlan): Promise<string>;
  readAssetPlan(channelId: string, episodeId: string): Promise<QuizAssetPlan | null>;
  writeAssetPlan(channelId: string, episodeId: string, plan: QuizAssetPlan): Promise<string>;
  readQuizAssetResolution(channelId: string, episodeId: string): Promise<QuizAssetResolution | null>;
  writeQuizAssetResolution(channelId: string, episodeId: string, resolution: QuizAssetResolution): Promise<string>;
  writeQuizImageAsset(
    channelId: string,
    episodeId: string,
    assetId: string,
    fingerprint: string,
    content: Uint8Array,
    meta?: BundleImageMeta,
  ): Promise<string>;
  resolveQuizAssetPath(channelId: string, episodeId: string, assetPath: string): Promise<string>;
  readQuizTimeline(channelId: string, episodeId: string): Promise<QuizTimeline | null>;
  writeQuizTimeline(channelId: string, episodeId: string, timeline: QuizTimeline): Promise<string>;
  readQuizAssessment(channelId: string, episodeId: string): Promise<QuizAssessment | null>;
  writeQuizAssessment(channelId: string, episodeId: string, assessment: QuizAssessment): Promise<string>;
  readVoicePlan(channelId: string, episodeId: string): Promise<VoicePlan | null>;
  writeVoicePlan(channelId: string, episodeId: string, plan: VoicePlan): Promise<string>;
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
  readHistoryCheck(channelId: string, episodeId: string): Promise<QuestionHistoryCheckResult | null>;
  writeHistoryCheck(channelId: string, episodeId: string, result: QuestionHistoryCheckResult): Promise<string>;
  readVideoDescription(channelId: string, episodeId: string): Promise<VideoDescription | null>;
  writeVideoDescription(channelId: string, episodeId: string, description: VideoDescription): Promise<string>;
  readQuizStageTimings(channelId: string, episodeId: string): Promise<QuizStageTimings | null>;
  writeQuizStageTimings(channelId: string, episodeId: string, timings: QuizStageTimings): Promise<string>;
  readQuestionHistory(channelId: string): Promise<QuestionHistoryEntry[]>;
  appendQuestionHistory(
    channelId: string,
    episodeId: string,
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
  appendBgmHistory(channelId: string, episodeId: string, trackId: string, filename: string, ttlDays?: number): Promise<void>;
  invalidateQuizArtifacts(channelId: string, episodeId: string, stages: string[]): Promise<string[]>;
}

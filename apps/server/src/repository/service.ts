import { access, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import {
  ChannelSchema,
  type BgmHistoryEntry,
  type CalibrateMascotActionInput,
  type Channel,
  type ChannelMascotConfig,
  type CreateChannelInput,
  type DirectorPlan,
  type Episode,
  type EpisodeSettingsInput,
  type MascotActionType,
  type MascotProfile,
  type QuestionHistoryCheckResult,
  type QuestionHistoryEntry,
  type QuizAssessment,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizImageStyle,
  type QuizQuestion,
  type QuizTimeline,
  type QuizV2,
  type Scene,
  type TopicCandidate,
  type VoicePlan,
  type VoiceProfile,
} from "@studio/shared";
import { writeBinaryAtomic, writeJsonAtomic, writeTextAtomic } from "../utils/fs.js";
import { RepositoryError } from "./errors.js";
import { type TopicRun } from "./helpers.js";
import {
  assertRealPathInside,
  createRoots,
  isInside,
  resolveContextPath as resolveSafeContextPath,
  resolvePath as resolveSafePath,
  slugify as createSlug,
} from "./pathSafety.js";
import type { QuizArtifactFilename, RepositoryRuntime } from "./runtime.js";
import type { BundleImageAsset, BundleImageMeta, RepositoryRoots } from "./types.js";
import {
  listChannels as listChannelsImplementation,
  getChannel as getChannelImplementation,
  getChannelBySlug as getChannelBySlugImplementation,
  createChannel as createChannelImplementation,
  updateChannel as updateChannelImplementation,
} from "./channels.js";
import {
  listMascots as listMascotsImplementation,
  getMascot as getMascotImplementation,
  saveMascot as saveMascotImplementation,
  deleteMascot as deleteMascotImplementation,
  saveMascotAsset as saveMascotAssetImplementation,
  getMascotAssetFile as getMascotAssetFileImplementation,
  calibrateMascotAction as calibrateMascotActionImplementation,
  listMascotAssets as listMascotAssetsImplementation,
  deleteMascotAssetFile as deleteMascotAssetFileImplementation,
  assignMascotToChannel as assignMascotToChannelImplementation,
} from "./mascots.js";
import {
  saveVoiceReference as saveVoiceReferenceImplementation,
  listVoices as listVoicesImplementation,
  getVoice as getVoiceImplementation,
  createVoiceProfile as createVoiceProfileImplementation,
  updateVoiceSample as updateVoiceSampleImplementation,
  deleteVoiceProfile as deleteVoiceProfileImplementation,
  assignVoice as assignVoiceImplementation,
  getVoiceSampleFile as getVoiceSampleFileImplementation,
} from "./voices.js";
import {
  deleteChannel as deleteChannelImplementation,
  deleteEpisode as deleteEpisodeImplementation,
  getChannelDna as getChannelDnaImplementation,
  saveChannelDna as saveChannelDnaImplementation,
  resetChannelDna as resetChannelDnaImplementation,
  listEpisodes as listEpisodesImplementation,
  getEpisode as getEpisodeImplementation,
  getEpisodeFile as getEpisodeFileImplementation,
  saveEpisodeFile as saveEpisodeFileImplementation,
} from "./episodes.js";
import {
  readQuiz as readQuizImplementation,
  writeQuiz as writeQuizImplementation,
  readDirectorPlan as readDirectorPlanImplementation,
  writeDirectorPlan as writeDirectorPlanImplementation,
  readAssetPlan as readAssetPlanImplementation,
  writeAssetPlan as writeAssetPlanImplementation,
  readQuizAssetResolution as readQuizAssetResolutionImplementation,
  writeQuizAssetResolution as writeQuizAssetResolutionImplementation,
  writeQuizImageAsset as writeQuizImageAssetImplementation,
  resolveQuizAssetPath as resolveQuizAssetPathImplementation,
  readQuizTimeline as readQuizTimelineImplementation,
  writeQuizTimeline as writeQuizTimelineImplementation,
  readQuizAssessment as readQuizAssessmentImplementation,
  writeQuizAssessment as writeQuizAssessmentImplementation,
  readVoicePlan as readVoicePlanImplementation,
  writeVoicePlan as writeVoicePlanImplementation,
  getRenderedVoiceMetrics as getRenderedVoiceMetricsImplementation,
  readHistoryCheck as readHistoryCheckImplementation,
  writeHistoryCheck as writeHistoryCheckImplementation,
  readQuestionHistory as readQuestionHistoryImplementation,
  appendQuestionHistory as appendQuestionHistoryImplementation,
  removeQuestionHistoryEntries as removeQuestionHistoryEntriesImplementation,
  readBgmHistory as readBgmHistoryImplementation,
  appendBgmHistory as appendBgmHistoryImplementation,
  invalidateQuizArtifacts as invalidateQuizArtifactsImplementation,
} from "./quizArtifacts.js";
import {
  listTopics as listTopicsImplementation,
  saveTopicRun as saveTopicRunImplementation,
  confirmTopic as confirmTopicImplementation,
  updateEpisodeSettings as updateEpisodeSettingsImplementation,
} from "./topics.js";
import {
  readScenes as readScenesImplementation,
  listBundleImages as listBundleImagesImplementation,
  getBundleImagePath as getBundleImagePathImplementation,
  getBundleImageFile as getBundleImageFileImplementation,
  writeBundleImage as writeBundleImageImplementation,
  writeBundleImageFromFile as writeBundleImageFromFileImplementation,
  clearBundleImages as clearBundleImagesImplementation,
  attachBundleReference as attachBundleReferenceImplementation,
  saveScenes as saveScenesImplementation,
  invalidateQuizSourceArtifacts as invalidateQuizSourceArtifactsImplementation,
} from "./scenes.js";
import {
  saveSceneAudio as saveSceneAudioImplementation,
  getSceneAudioFile as getSceneAudioFileImplementation,
  writeSceneAudio as writeSceneAudioImplementation,
  writeNarrationAudio as writeNarrationAudioImplementation,
  writeQuizVoiceSegmentAudio as writeQuizVoiceSegmentAudioImplementation,
  writeQuizNarrationAudio as writeQuizNarrationAudioImplementation,
  getQuizVoiceSegmentAudioFile as getQuizVoiceSegmentAudioFileImplementation,
  writeVideoArtifact as writeVideoArtifactImplementation,
  getEpisodeVideoFile as getEpisodeVideoFileImplementation,
  writeRenderManifest as writeRenderManifestImplementation,
  saveVideoMetadata as saveVideoMetadataImplementation,
  getEpisodeAudioFile as getEpisodeAudioFileImplementation,
  saveNarrationMetadata as saveNarrationMetadataImplementation,
} from "./media.js";
import {
  clearSequenceDrafts as clearSequenceDraftsImplementation,
  removeEpisodeRuntimeArtifacts as removeEpisodeRuntimeArtifactsImplementation,
  saveSequenceDraft as saveSequenceDraftImplementation,
  readSequenceDrafts as readSequenceDraftsImplementation,
  commitSequenceDrafts as commitSequenceDraftsImplementation,
  updateEpisodeStage as updateEpisodeStageImplementation,
  backupEpisodeFile as backupEpisodeFileImplementation,
} from "./sequenceDrafts.js";
import { getGitInfo as getGitInfoImplementation } from "./gitInfo.js";

export class RepositoryService implements RepositoryRuntime {
  roots: RepositoryRoots;
  readonly questionHistoryWrites = new Map<string, Promise<void>>();

  constructor(
    readonly rootDirectory: string,
    storageRoot = rootDirectory,
  ) {
    this.roots = this.createRoots(storageRoot);
  }

  get storageRoot(): string {
    return path.dirname(this.roots.channels);
  }

  setStorageRoot(storageRoot: string): void {
    this.roots = this.createRoots(storageRoot);
  }

  resolveContextPath(relativePath: string): string {
    return resolveSafeContextPath(this.roots, relativePath);
  }

  async ensureBootstrap(): Promise<void> {
    await Promise.all([
      mkdir(this.roots.channels, { recursive: true }),
      mkdir(path.join(this.roots.runtime, "tasks"), { recursive: true }),
      mkdir(path.join(this.roots.runtime, "codex"), { recursive: true }),
      mkdir(path.join(this.roots.runtime, "logs"), { recursive: true }),
      mkdir(this.roots.voices, { recursive: true }),
      mkdir(this.roots.mascots, { recursive: true }),
    ]);
  }

  listChannels(includeArchived?: boolean): Promise<Channel[]> {
    return listChannelsImplementation.call(this, includeArchived);
  }
  getChannel(channelId: string): Promise<Channel> {
    return getChannelImplementation.call(this, channelId);
  }
  getChannelBySlug(slug: string): Promise<Channel> {
    return getChannelBySlugImplementation.call(this, slug);
  }
  createChannel(input: CreateChannelInput): Promise<Channel> {
    return createChannelImplementation.call(this, input);
  }
  updateChannel(channelId: string, patch: Partial<Channel>): Promise<Channel> {
    return updateChannelImplementation.call(this, channelId, patch);
  }
  listMascots(): Promise<MascotProfile[]> {
    return listMascotsImplementation.call(this);
  }
  getMascot(mascotId: string): Promise<MascotProfile> {
    return getMascotImplementation.call(this, mascotId);
  }
  saveMascot(mascot: Partial<MascotProfile> & { name: string }): Promise<MascotProfile> {
    return saveMascotImplementation.call(this, mascot);
  }
  deleteMascot(mascotId: string): Promise<void> {
    return deleteMascotImplementation.call(this, mascotId);
  }
  saveMascotAsset(mascotId: string, filename: string, content: Uint8Array): Promise<string> {
    return saveMascotAssetImplementation.call(this, mascotId, filename, content);
  }
  getMascotAssetFile(mascotId: string, filename: string): Promise<{ absolutePath: string; size: number; modified_at: string }> {
    return getMascotAssetFileImplementation.call(this, mascotId, filename);
  }
  calibrateMascotAction(mascotId: string, action: MascotActionType, calibration: CalibrateMascotActionInput): Promise<MascotProfile> {
    return calibrateMascotActionImplementation.call(this, mascotId, action, calibration);
  }
  listMascotAssets(mascotId: string): Promise<string[]> {
    return listMascotAssetsImplementation.call(this, mascotId);
  }
  deleteMascotAssetFile(mascotId: string, filename: string): Promise<void> {
    return deleteMascotAssetFileImplementation.call(this, mascotId, filename);
  }
  assignMascotToChannel(channelId: string, mascotId: string | null, config?: Partial<ChannelMascotConfig>): Promise<Channel> {
    return assignMascotToChannelImplementation.call(this, channelId, mascotId, config);
  }
  saveVoiceReference(channelId: string, content: Uint8Array): Promise<{ path: string; modified_at: string }> {
    return saveVoiceReferenceImplementation.call(this, channelId, content);
  }
  listVoices(): Promise<VoiceProfile[]> {
    return listVoicesImplementation.call(this);
  }
  getVoice(voiceId: string): Promise<VoiceProfile> {
    return getVoiceImplementation.call(this, voiceId);
  }
  createVoiceProfile(name: string, referenceContent: Uint8Array, sampleContent: Uint8Array): Promise<VoiceProfile> {
    return createVoiceProfileImplementation.call(this, name, referenceContent, sampleContent);
  }
  updateVoiceSample(voiceId: string, content: Uint8Array): Promise<VoiceProfile> {
    return updateVoiceSampleImplementation.call(this, voiceId, content);
  }
  deleteVoiceProfile(voiceId: string): Promise<void> {
    return deleteVoiceProfileImplementation.call(this, voiceId);
  }
  assignVoice(channelId: string, voiceId: string | null): Promise<Channel> {
    return assignVoiceImplementation.call(this, channelId, voiceId);
  }
  getVoiceSampleFile(voiceId: string): Promise<{ absolutePath: string; size: number; modified_at: string }> {
    return getVoiceSampleFileImplementation.call(this, voiceId);
  }
  deleteChannel(channelId: string, confirmed?: boolean): Promise<void> {
    return deleteChannelImplementation.call(this, channelId, confirmed);
  }
  deleteEpisode(channelId: string, episodeId: string, confirmed?: boolean): Promise<void> {
    return deleteEpisodeImplementation.call(this, channelId, episodeId, confirmed);
  }
  getChannelDna(channelId: string): Promise<{ content: string; path: string; modified_at: string }> {
    return getChannelDnaImplementation.call(this, channelId);
  }
  saveChannelDna(channelId: string, content: string): Promise<{ path: string; modified_at: string }> {
    return saveChannelDnaImplementation.call(this, channelId, content);
  }
  resetChannelDna(channelId: string): Promise<{ content: string; path: string; modified_at: string }> {
    return resetChannelDnaImplementation.call(this, channelId);
  }
  listEpisodes(channelId: string): Promise<Episode[]> {
    return listEpisodesImplementation.call(this, channelId);
  }
  getEpisode(channelId: string, episodeId: string): Promise<Episode> {
    return getEpisodeImplementation.call(this, channelId, episodeId);
  }
  getEpisodeFile(channelId: string, episodeId: string, filename: string): Promise<{ content: string; path: string; modified_at: string }> {
    return getEpisodeFileImplementation.call(this, channelId, episodeId, filename);
  }
  saveEpisodeFile(channelId: string, episodeId: string, filename: string, content: string): Promise<{ path: string; modified_at: string }> {
    return saveEpisodeFileImplementation.call(this, channelId, episodeId, filename, content);
  }
  readQuiz(channelId: string, episodeId: string): Promise<QuizV2 | null> {
    return readQuizImplementation.call(this, channelId, episodeId);
  }
  writeQuiz(channelId: string, episodeId: string, quiz: QuizV2): Promise<string> {
    return writeQuizImplementation.call(this, channelId, episodeId, quiz);
  }
  readDirectorPlan(channelId: string, episodeId: string): Promise<DirectorPlan | null> {
    return readDirectorPlanImplementation.call(this, channelId, episodeId);
  }
  writeDirectorPlan(channelId: string, episodeId: string, plan: DirectorPlan): Promise<string> {
    return writeDirectorPlanImplementation.call(this, channelId, episodeId, plan);
  }
  readAssetPlan(channelId: string, episodeId: string): Promise<QuizAssetPlan | null> {
    return readAssetPlanImplementation.call(this, channelId, episodeId);
  }
  writeAssetPlan(channelId: string, episodeId: string, plan: QuizAssetPlan): Promise<string> {
    return writeAssetPlanImplementation.call(this, channelId, episodeId, plan);
  }
  readQuizAssetResolution(channelId: string, episodeId: string): Promise<QuizAssetResolution | null> {
    return readQuizAssetResolutionImplementation.call(this, channelId, episodeId);
  }
  writeQuizAssetResolution(channelId: string, episodeId: string, resolution: QuizAssetResolution): Promise<string> {
    return writeQuizAssetResolutionImplementation.call(this, channelId, episodeId, resolution);
  }
  writeQuizImageAsset(
    channelId: string,
    episodeId: string,
    assetId: string,
    fingerprint: string,
    content: Uint8Array,
    meta?: BundleImageMeta,
  ): Promise<string> {
    return writeQuizImageAssetImplementation.call(this, channelId, episodeId, assetId, fingerprint, content, meta);
  }
  resolveQuizAssetPath(channelId: string, episodeId: string, assetPath: string): Promise<string> {
    return resolveQuizAssetPathImplementation.call(this, channelId, episodeId, assetPath);
  }
  readQuizTimeline(channelId: string, episodeId: string): Promise<QuizTimeline | null> {
    return readQuizTimelineImplementation.call(this, channelId, episodeId);
  }
  writeQuizTimeline(channelId: string, episodeId: string, timeline: QuizTimeline): Promise<string> {
    return writeQuizTimelineImplementation.call(this, channelId, episodeId, timeline);
  }
  readQuizAssessment(channelId: string, episodeId: string): Promise<QuizAssessment | null> {
    return readQuizAssessmentImplementation.call(this, channelId, episodeId);
  }
  writeQuizAssessment(channelId: string, episodeId: string, assessment: QuizAssessment): Promise<string> {
    return writeQuizAssessmentImplementation.call(this, channelId, episodeId, assessment);
  }
  readVoicePlan(channelId: string, episodeId: string): Promise<VoicePlan | null> {
    return readVoicePlanImplementation.call(this, channelId, episodeId);
  }
  writeVoicePlan(channelId: string, episodeId: string, plan: VoicePlan): Promise<string> {
    return writeVoicePlanImplementation.call(this, channelId, episodeId, plan);
  }
  getRenderedVoiceMetrics(): Promise<{
    rendered_characters: number;
    rendered_duration_seconds: number;
    rendered_segments_count: number;
    rendered_episodes_count: number;
  }> {
    return getRenderedVoiceMetricsImplementation.call(this);
  }
  readHistoryCheck(channelId: string, episodeId: string): Promise<QuestionHistoryCheckResult | null> {
    return readHistoryCheckImplementation.call(this, channelId, episodeId);
  }
  writeHistoryCheck(channelId: string, episodeId: string, result: QuestionHistoryCheckResult): Promise<string> {
    return writeHistoryCheckImplementation.call(this, channelId, episodeId, result);
  }
  readQuestionHistory(channelId: string): Promise<QuestionHistoryEntry[]> {
    return readQuestionHistoryImplementation.call(this, channelId);
  }
  appendQuestionHistory(
    channelId: string,
    episodeId: string,
    questions: QuizQuestion[],
    ttlDays?: number,
    renderTaskId?: string,
  ): Promise<void> {
    return appendQuestionHistoryImplementation.call(this, channelId, episodeId, questions, ttlDays, renderTaskId);
  }
  removeQuestionHistoryEntries(
    channelId: string,
    filter: { episodeIds?: string[]; renderTaskIds?: string[] },
    ttlDays?: number,
  ): Promise<void> {
    return removeQuestionHistoryEntriesImplementation.call(this, channelId, filter, ttlDays);
  }
  readBgmHistory(channelId: string): Promise<BgmHistoryEntry[]> {
    return readBgmHistoryImplementation.call(this, channelId);
  }
  appendBgmHistory(channelId: string, episodeId: string, trackId: string, filename: string, ttlDays?: number): Promise<void> {
    return appendBgmHistoryImplementation.call(this, channelId, episodeId, trackId, filename, ttlDays);
  }
  invalidateQuizArtifacts(channelId: string, episodeId: string, stages: string[]): Promise<string[]> {
    return invalidateQuizArtifactsImplementation.call(this, channelId, episodeId, stages);
  }
  listTopics(channelId: string): Promise<TopicCandidate[]> {
    return listTopicsImplementation.call(this, channelId);
  }
  saveTopicRun(channelId: string, candidates: TopicCandidate[]): Promise<void> {
    return saveTopicRunImplementation.call(this, channelId, candidates);
  }
  confirmTopic(channelId: string, topicId: string, questionCount?: number, visualStyle?: QuizImageStyle | "mixed"): Promise<Episode> {
    return confirmTopicImplementation.call(this, channelId, topicId, questionCount, visualStyle);
  }
  updateEpisodeSettings(channelId: string, episodeId: string, settings: EpisodeSettingsInput, wordsPerSecond: number): Promise<Episode> {
    return updateEpisodeSettingsImplementation.call(this, channelId, episodeId, settings, wordsPerSecond);
  }
  readScenes(channelId: string, episodeId: string): Promise<Scene[]> {
    return readScenesImplementation.call(this, channelId, episodeId);
  }
  listBundleImages(channelId: string, episodeId: string): Promise<BundleImageAsset[]> {
    return listBundleImagesImplementation.call(this, channelId, episodeId);
  }
  getBundleImagePath(
    channelId: string,
    episodeId: string,
    bundleNumber: number,
    variant?: number,
  ): Promise<{ bundle_id: string; filename: string; path: string; absolutePath: string }> {
    return getBundleImagePathImplementation.call(this, channelId, episodeId, bundleNumber, variant);
  }
  getBundleImageFile(channelId: string, episodeId: string, filename: string): Promise<BundleImageAsset> {
    return getBundleImageFileImplementation.call(this, channelId, episodeId, filename);
  }
  writeBundleImage(
    channelId: string,
    episodeId: string,
    bundleNumber: number,
    content: Uint8Array,
    variant?: number,
    meta?: BundleImageMeta,
  ): Promise<string> {
    return writeBundleImageImplementation.call(this, channelId, episodeId, bundleNumber, content, variant, meta);
  }
  writeBundleImageFromFile(
    channelId: string,
    episodeId: string,
    bundleNumber: number,
    sourcePath: string,
    variant?: number,
    meta?: BundleImageMeta,
  ): Promise<string> {
    return writeBundleImageFromFileImplementation.call(this, channelId, episodeId, bundleNumber, sourcePath, variant, meta);
  }
  clearBundleImages(channelId: string, episodeId: string, bundleNumber: number): Promise<void> {
    return clearBundleImagesImplementation.call(this, channelId, episodeId, bundleNumber);
  }
  attachBundleReference(channelId: string, episodeId: string, bundleId: string, assetPath: string): Promise<number> {
    return attachBundleReferenceImplementation.call(this, channelId, episodeId, bundleId, assetPath);
  }
  saveScenes(channelId: string, episodeId: string, scenes: Scene[]): Promise<void> {
    return saveScenesImplementation.call(this, channelId, episodeId, scenes);
  }
  invalidateQuizSourceArtifacts(channelId: string, episodeId: string): Promise<void> {
    return invalidateQuizSourceArtifactsImplementation.call(this, channelId, episodeId);
  }
  saveSceneAudio(
    channelId: string,
    episodeId: string,
    sceneNumber: number,
    audioAssetPath: string,
    durationSeconds: number,
  ): Promise<void> {
    return saveSceneAudioImplementation.call(this, channelId, episodeId, sceneNumber, audioAssetPath, durationSeconds);
  }
  getSceneAudioFile(
    channelId: string,
    episodeId: string,
    filename: string,
  ): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
    return getSceneAudioFileImplementation.call(this, channelId, episodeId, filename);
  }
  writeSceneAudio(channelId: string, episodeId: string, sceneNumber: number, content: Uint8Array): Promise<string> {
    return writeSceneAudioImplementation.call(this, channelId, episodeId, sceneNumber, content);
  }
  writeNarrationAudio(channelId: string, episodeId: string, content: Uint8Array, segmentNumber?: number): Promise<string> {
    return writeNarrationAudioImplementation.call(this, channelId, episodeId, content, segmentNumber);
  }
  writeQuizVoiceSegmentAudio(
    channelId: string,
    episodeId: string,
    segmentNumber: number,
    content: Uint8Array,
    version?: string,
  ): Promise<string> {
    return writeQuizVoiceSegmentAudioImplementation.call(this, channelId, episodeId, segmentNumber, content, version);
  }
  writeQuizNarrationAudio(channelId: string, episodeId: string, content: Uint8Array): Promise<string> {
    return writeQuizNarrationAudioImplementation.call(this, channelId, episodeId, content);
  }
  getQuizVoiceSegmentAudioFile(
    channelId: string,
    episodeId: string,
    segmentNumber: number,
    version?: string,
  ): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
    return getQuizVoiceSegmentAudioFileImplementation.call(this, channelId, episodeId, segmentNumber, version);
  }
  writeVideoArtifact(channelId: string, episodeId: string, content: Uint8Array, filename?: string): Promise<string> {
    return writeVideoArtifactImplementation.call(this, channelId, episodeId, content, filename);
  }
  getEpisodeVideoFile(
    channelId: string,
    episodeId: string,
    filename?: string,
  ): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
    return getEpisodeVideoFileImplementation.call(this, channelId, episodeId, filename);
  }
  writeRenderManifest(channelId: string, episodeId: string, content: string): Promise<string> {
    return writeRenderManifestImplementation.call(this, channelId, episodeId, content);
  }
  saveVideoMetadata(
    channelId: string,
    episodeId: string,
    assetPath: string,
    durationSeconds: number,
    renderManifestPath: string,
  ): Promise<Episode> {
    return saveVideoMetadataImplementation.call(this, channelId, episodeId, assetPath, durationSeconds, renderManifestPath);
  }
  getEpisodeAudioFile(
    channelId: string,
    episodeId: string,
    filename: string,
  ): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
    return getEpisodeAudioFileImplementation.call(this, channelId, episodeId, filename);
  }
  saveNarrationMetadata(
    channelId: string,
    episodeId: string,
    assetPath: string,
    durationSeconds: number,
    segmentCount: number,
    narrationWordCount: number,
  ): Promise<Episode> {
    return saveNarrationMetadataImplementation.call(
      this,
      channelId,
      episodeId,
      assetPath,
      durationSeconds,
      segmentCount,
      narrationWordCount,
    );
  }
  clearSequenceDrafts(episodeId: string): Promise<void> {
    return clearSequenceDraftsImplementation.call(this, episodeId);
  }
  removeEpisodeRuntimeArtifacts(episodeId: string): Promise<void> {
    return removeEpisodeRuntimeArtifactsImplementation.call(this, episodeId);
  }
  saveSequenceDraft(episodeId: string, sequenceNumber: number, scenes: Scene[]): Promise<void> {
    return saveSequenceDraftImplementation.call(this, episodeId, sequenceNumber, scenes);
  }
  readSequenceDrafts(episodeId: string): Promise<Array<{ sequenceNumber: number; scenes: Scene[]; modified_at: string }>> {
    return readSequenceDraftsImplementation.call(this, episodeId);
  }
  commitSequenceDrafts(channelId: string, episodeId: string, expectedCount: number): Promise<boolean> {
    return commitSequenceDraftsImplementation.call(this, channelId, episodeId, expectedCount);
  }
  updateEpisodeStage(channelId: string, episodeId: string, stage: Episode["stage"]): Promise<Episode> {
    return updateEpisodeStageImplementation.call(this, channelId, episodeId, stage);
  }
  backupEpisodeFile(channelId: string, episodeId: string, filename: string): Promise<string | null> {
    return backupEpisodeFileImplementation.call(this, channelId, episodeId, filename);
  }
  getGitInfo(): Promise<{ branch: string | null; dirty: boolean; changed_files: number }> {
    return getGitInfoImplementation.call(this);
  }

  resolvePath(root: keyof RepositoryRoots, ...segments: string[]): string {
    return resolveSafePath(this.roots, root, ...segments);
  }

  assertBundleNumber(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 99)
      throw new RepositoryError("Bundle number must be between 1 and 99", "INVALID_BUNDLE");
    return value;
  }

  slugify(input: string): string {
    return createSlug(input);
  }

  async readQuizArtifact<T>(
    channelId: string,
    episodeId: string,
    filename: QuizArtifactFilename,
    schema: { parse(value: unknown): T },
  ): Promise<T | null> {
    const target = await this.quizArtifactTarget(channelId, episodeId, filename);
    try {
      const raw = JSON.parse(await readFile(target.absolutePath, "utf8")) as unknown;
      return schema.parse(raw);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") return null;
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError("Quiz artifact " + filename + " is malformed", "QUIZ_ARTIFACT_INVALID");
    }
  }

  async writeQuizArtifact<T>(channelId: string, episodeId: string, filename: QuizArtifactFilename, value: T): Promise<string> {
    const target = await this.quizArtifactTarget(channelId, episodeId, filename);
    await this.writeJsonAtomic(target.absolutePath, value);
    return target.relativePath;
  }

  async quizArtifactTarget(
    channelId: string,
    episodeId: string,
    filename: QuizArtifactFilename,
  ): Promise<{ absolutePath: string; relativePath: string }> {
    const episode = await this.getEpisode(channelId, episodeId);
    const channel = await this.getChannel(channelId);
    const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
    await this.assertRealPathInside(this.roots.channels, episodeDirectory);
    const absolutePath = path.join(episodeDirectory, "quiz", filename);
    return { absolutePath, relativePath: ["channels", channel.slug, "episodes", episode.slug, "quiz", filename].join("/") };
  }

  async readChannelBySlug(slug: string): Promise<Channel> {
    const directory = this.resolvePath("channels", this.assertSlug(slug));
    await this.assertRealPathInside(this.roots.channels, directory);
    const metadataPath = path.join(directory, "channel.json");
    const raw = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
    const metadata = ChannelSchema.parse(raw);
    const episodes = await this.safeEpisodeCount(directory);
    return ChannelSchema.parse({ ...metadata, episode_count: episodes });
  }

  async safeEpisodeCount(channelDirectory: string): Promise<number> {
    try {
      const entries = await readdir(path.join(channelDirectory, "episodes"), { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).length;
    } catch {
      return 0;
    }
  }

  async getTemplate(filename: string): Promise<string> {
    try {
      return await readFile(this.resolvePath("templates", filename), "utf8");
    } catch {
      throw new RepositoryError(`Required template is missing: ${filename}`, "TEMPLATE_MISSING");
    }
  }

  createRoots(storageRoot: string): RepositoryRoots {
    return createRoots(this.rootDirectory, storageRoot);
  }

  async markTopicSelected(channelId: string, topicId: string, questionCount: number): Promise<void> {
    const channel = await this.getChannel(channelId);
    const directory = this.resolvePath("channels", channel.slug, "topics");
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
      const filePath = path.join(directory, entry.name);
      try {
        const run = JSON.parse(await readFile(filePath, "utf8")) as TopicRun;
        let changed = false;
        run.candidates = run.candidates.map((topic) => {
          if (topic.topic_id !== topicId) return topic;
          changed = true;
          return { ...topic, question_count: questionCount, selected: true };
        });
        if (changed) await this.writeJsonAtomic(filePath, run);
      } catch {
        // Ignore malformed historical runs.
      }
    }
  }

  assertSlug(value: string): string {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 60) throw new RepositoryError("Invalid slug", "INVALID_SLUG");
    return value;
  }

  async uniqueSlug(input: string, parentDirectory: string): Promise<string> {
    const base = this.slugify(input);
    let candidate = base;
    let suffix = 2;
    while (await this.exists(path.join(parentDirectory, candidate))) candidate = `${base}-${suffix++}`;
    return candidate;
  }

  async exists(target: string): Promise<boolean> {
    try {
      await access(target);
      return true;
    } catch {
      return false;
    }
  }

  isInside(rootPath: string, targetPath: string): boolean {
    return isInside(rootPath, targetPath);
  }

  async assertRealPathInside(rootPath: string, targetPath: string): Promise<void> {
    await assertRealPathInside(rootPath, targetPath);
  }

  async writeJsonAtomic(target: string, value: unknown): Promise<void> {
    await writeJsonAtomic(target, value);
  }

  async writeTextAtomic(target: string, content: string): Promise<void> {
    await writeTextAtomic(target, content);
  }

  async writeBinaryAtomic(target: string, content: Uint8Array): Promise<void> {
    await writeBinaryAtomic(target, content);
  }

  async removeTree(target: string): Promise<void> {
    await rm(target, { recursive: true, force: true });
  }
}

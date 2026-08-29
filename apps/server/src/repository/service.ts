import { access, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { ChannelSchema, type Channel } from "@studio/shared";
import { writeBinaryAtomic, writeJsonAtomic, writeTextAtomic } from "./atomicWrite.js";
import { RepositoryError } from "./errors.js";
import { type TopicRun } from "./helpers.js";
import { assertRealPathInside, createRoots, isInside, resolveContextPath as resolveSafeContextPath, resolvePath as resolveSafePath, slugify as createSlug } from "./pathSafety.js";
import type { RepositoryRuntime } from "./runtime.js";
import type { RepositoryRoots } from "./types.js";
import { listChannels as listChannelsImplementation, getChannel as getChannelImplementation, getChannelBySlug as getChannelBySlugImplementation, createChannel as createChannelImplementation, updateChannel as updateChannelImplementation } from "./channels.js";
import { listMascots as listMascotsImplementation, getMascot as getMascotImplementation, saveMascot as saveMascotImplementation, deleteMascot as deleteMascotImplementation, saveMascotAsset as saveMascotAssetImplementation, getMascotAssetFile as getMascotAssetFileImplementation, calibrateMascotAction as calibrateMascotActionImplementation, listMascotAssets as listMascotAssetsImplementation, deleteMascotAssetFile as deleteMascotAssetFileImplementation, assignMascotToChannel as assignMascotToChannelImplementation } from "./mascots.js";
import { saveVoiceReference as saveVoiceReferenceImplementation, listVoices as listVoicesImplementation, getVoice as getVoiceImplementation, createVoiceProfile as createVoiceProfileImplementation, updateVoiceSample as updateVoiceSampleImplementation, deleteVoiceProfile as deleteVoiceProfileImplementation, assignVoice as assignVoiceImplementation, getVoiceSampleFile as getVoiceSampleFileImplementation } from "./voices.js";
import { deleteChannel as deleteChannelImplementation, deleteEpisode as deleteEpisodeImplementation, getChannelDna as getChannelDnaImplementation, saveChannelDna as saveChannelDnaImplementation, listEpisodes as listEpisodesImplementation, getEpisode as getEpisodeImplementation, getEpisodeFile as getEpisodeFileImplementation, saveEpisodeFile as saveEpisodeFileImplementation } from "./episodes.js";
import { readQuiz as readQuizImplementation, writeQuiz as writeQuizImplementation, readDirectorPlan as readDirectorPlanImplementation, writeDirectorPlan as writeDirectorPlanImplementation, readAssetPlan as readAssetPlanImplementation, writeAssetPlan as writeAssetPlanImplementation, readQuizAssetResolution as readQuizAssetResolutionImplementation, writeQuizAssetResolution as writeQuizAssetResolutionImplementation, writeQuizImageAsset as writeQuizImageAssetImplementation, resolveQuizAssetPath as resolveQuizAssetPathImplementation, readQuizTimeline as readQuizTimelineImplementation, writeQuizTimeline as writeQuizTimelineImplementation, readQuizAssessment as readQuizAssessmentImplementation, writeQuizAssessment as writeQuizAssessmentImplementation, readVoicePlan as readVoicePlanImplementation, writeVoicePlan as writeVoicePlanImplementation, getRenderedVoiceMetrics as getRenderedVoiceMetricsImplementation, readHistoryCheck as readHistoryCheckImplementation, writeHistoryCheck as writeHistoryCheckImplementation, readQuestionHistory as readQuestionHistoryImplementation, appendQuestionHistory as appendQuestionHistoryImplementation, readBgmHistory as readBgmHistoryImplementation, appendBgmHistory as appendBgmHistoryImplementation, invalidateQuizArtifacts as invalidateQuizArtifactsImplementation } from "./quizArtifacts.js";
import { listTopics as listTopicsImplementation, saveTopicRun as saveTopicRunImplementation, confirmTopic as confirmTopicImplementation, updateEpisodeSettings as updateEpisodeSettingsImplementation } from "./topics.js";
import { readScenes as readScenesImplementation, listBundleImages as listBundleImagesImplementation, getBundleImagePath as getBundleImagePathImplementation, getBundleImageFile as getBundleImageFileImplementation, writeBundleImage as writeBundleImageImplementation, writeBundleImageFromFile as writeBundleImageFromFileImplementation, clearBundleImages as clearBundleImagesImplementation, attachBundleReference as attachBundleReferenceImplementation, saveScenes as saveScenesImplementation, invalidateQuizSourceArtifacts as invalidateQuizSourceArtifactsImplementation } from "./scenes.js";
import { saveSceneAudio as saveSceneAudioImplementation, getSceneAudioFile as getSceneAudioFileImplementation, writeSceneAudio as writeSceneAudioImplementation, writeNarrationAudio as writeNarrationAudioImplementation, writeQuizVoiceSegmentAudio as writeQuizVoiceSegmentAudioImplementation, writeQuizNarrationAudio as writeQuizNarrationAudioImplementation, getQuizVoiceSegmentAudioFile as getQuizVoiceSegmentAudioFileImplementation, writeVideoArtifact as writeVideoArtifactImplementation, getEpisodeVideoFile as getEpisodeVideoFileImplementation, writeRenderManifest as writeRenderManifestImplementation, saveVideoMetadata as saveVideoMetadataImplementation, getEpisodeAudioFile as getEpisodeAudioFileImplementation, saveNarrationMetadata as saveNarrationMetadataImplementation } from "./media.js";
import { clearSequenceDrafts as clearSequenceDraftsImplementation, saveSequenceDraft as saveSequenceDraftImplementation, readSequenceDrafts as readSequenceDraftsImplementation, commitSequenceDrafts as commitSequenceDraftsImplementation, updateEpisodeStage as updateEpisodeStageImplementation, backupEpisodeFile as backupEpisodeFileImplementation } from "./sequenceDrafts.js";
import { getGitInfo as getGitInfoImplementation } from "./gitInfo.js";

export class RepositoryService {
  roots: RepositoryRoots;

  constructor(readonly rootDirectory: string, storageRoot = rootDirectory) {
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

  readonly listChannels = listChannelsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getChannel = getChannelImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getChannelBySlug = getChannelBySlugImplementation.bind(this as unknown as RepositoryRuntime);
  readonly createChannel = createChannelImplementation.bind(this as unknown as RepositoryRuntime);
  readonly updateChannel = updateChannelImplementation.bind(this as unknown as RepositoryRuntime);
  readonly listMascots = listMascotsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getMascot = getMascotImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveMascot = saveMascotImplementation.bind(this as unknown as RepositoryRuntime);
  readonly deleteMascot = deleteMascotImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveMascotAsset = saveMascotAssetImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getMascotAssetFile = getMascotAssetFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly calibrateMascotAction = calibrateMascotActionImplementation.bind(this as unknown as RepositoryRuntime);
  readonly listMascotAssets = listMascotAssetsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly deleteMascotAssetFile = deleteMascotAssetFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly assignMascotToChannel = assignMascotToChannelImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveVoiceReference = saveVoiceReferenceImplementation.bind(this as unknown as RepositoryRuntime);
  readonly listVoices = listVoicesImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getVoice = getVoiceImplementation.bind(this as unknown as RepositoryRuntime);
  readonly createVoiceProfile = createVoiceProfileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly updateVoiceSample = updateVoiceSampleImplementation.bind(this as unknown as RepositoryRuntime);
  readonly deleteVoiceProfile = deleteVoiceProfileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly assignVoice = assignVoiceImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getVoiceSampleFile = getVoiceSampleFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly deleteChannel = deleteChannelImplementation.bind(this as unknown as RepositoryRuntime);
  readonly deleteEpisode = deleteEpisodeImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getChannelDna = getChannelDnaImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveChannelDna = saveChannelDnaImplementation.bind(this as unknown as RepositoryRuntime);
  readonly listEpisodes = listEpisodesImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getEpisode = getEpisodeImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getEpisodeFile = getEpisodeFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveEpisodeFile = saveEpisodeFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readQuiz = readQuizImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeQuiz = writeQuizImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readDirectorPlan = readDirectorPlanImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeDirectorPlan = writeDirectorPlanImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readAssetPlan = readAssetPlanImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeAssetPlan = writeAssetPlanImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readQuizAssetResolution = readQuizAssetResolutionImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeQuizAssetResolution = writeQuizAssetResolutionImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeQuizImageAsset = writeQuizImageAssetImplementation.bind(this as unknown as RepositoryRuntime);
  readonly resolveQuizAssetPath = resolveQuizAssetPathImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readQuizTimeline = readQuizTimelineImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeQuizTimeline = writeQuizTimelineImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readQuizAssessment = readQuizAssessmentImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeQuizAssessment = writeQuizAssessmentImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readVoicePlan = readVoicePlanImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeVoicePlan = writeVoicePlanImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getRenderedVoiceMetrics = getRenderedVoiceMetricsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readHistoryCheck = readHistoryCheckImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeHistoryCheck = writeHistoryCheckImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readQuestionHistory = readQuestionHistoryImplementation.bind(this as unknown as RepositoryRuntime);
  readonly appendQuestionHistory = appendQuestionHistoryImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readBgmHistory = readBgmHistoryImplementation.bind(this as unknown as RepositoryRuntime);
  readonly appendBgmHistory = appendBgmHistoryImplementation.bind(this as unknown as RepositoryRuntime);
  readonly invalidateQuizArtifacts = invalidateQuizArtifactsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly listTopics = listTopicsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveTopicRun = saveTopicRunImplementation.bind(this as unknown as RepositoryRuntime);
  readonly confirmTopic = confirmTopicImplementation.bind(this as unknown as RepositoryRuntime);
  readonly updateEpisodeSettings = updateEpisodeSettingsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readScenes = readScenesImplementation.bind(this as unknown as RepositoryRuntime);
  readonly listBundleImages = listBundleImagesImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getBundleImagePath = getBundleImagePathImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getBundleImageFile = getBundleImageFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeBundleImage = writeBundleImageImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeBundleImageFromFile = writeBundleImageFromFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly clearBundleImages = clearBundleImagesImplementation.bind(this as unknown as RepositoryRuntime);
  readonly attachBundleReference = attachBundleReferenceImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveScenes = saveScenesImplementation.bind(this as unknown as RepositoryRuntime);
  readonly invalidateQuizSourceArtifacts = invalidateQuizSourceArtifactsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveSceneAudio = saveSceneAudioImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getSceneAudioFile = getSceneAudioFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeSceneAudio = writeSceneAudioImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeNarrationAudio = writeNarrationAudioImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeQuizVoiceSegmentAudio = writeQuizVoiceSegmentAudioImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeQuizNarrationAudio = writeQuizNarrationAudioImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getQuizVoiceSegmentAudioFile = getQuizVoiceSegmentAudioFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeVideoArtifact = writeVideoArtifactImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getEpisodeVideoFile = getEpisodeVideoFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly writeRenderManifest = writeRenderManifestImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveVideoMetadata = saveVideoMetadataImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getEpisodeAudioFile = getEpisodeAudioFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveNarrationMetadata = saveNarrationMetadataImplementation.bind(this as unknown as RepositoryRuntime);
  readonly clearSequenceDrafts = clearSequenceDraftsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly saveSequenceDraft = saveSequenceDraftImplementation.bind(this as unknown as RepositoryRuntime);
  readonly readSequenceDrafts = readSequenceDraftsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly commitSequenceDrafts = commitSequenceDraftsImplementation.bind(this as unknown as RepositoryRuntime);
  readonly updateEpisodeStage = updateEpisodeStageImplementation.bind(this as unknown as RepositoryRuntime);
  readonly backupEpisodeFile = backupEpisodeFileImplementation.bind(this as unknown as RepositoryRuntime);
  readonly getGitInfo = getGitInfoImplementation.bind(this as unknown as RepositoryRuntime);
  resolvePath(root: keyof RepositoryRoots, ...segments: string[]): string {
    return resolveSafePath(this.roots, root, ...segments);
  }

  private assertBundleNumber(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 99) throw new RepositoryError("Bundle number must be between 1 and 99", "INVALID_BUNDLE");
    return value;
  }

  slugify(input: string): string {
    return createSlug(input);
  }

  private async readQuizArtifact<T>(channelId: string, episodeId: string, filename: "quiz-v2.json" | "director-plan.json" | "asset-plan.json" | "asset-resolution.json" | "voice-plan.json" | "timeline.json" | "qa.json" | "history-check.json", schema: { parse(value: unknown): T }): Promise<T | null> {
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

  private async writeQuizArtifact<T>(channelId: string, episodeId: string, filename: "quiz-v2.json" | "director-plan.json" | "asset-plan.json" | "asset-resolution.json" | "voice-plan.json" | "timeline.json" | "qa.json" | "history-check.json", value: T): Promise<string> {
    const target = await this.quizArtifactTarget(channelId, episodeId, filename);
    await this.writeJsonAtomic(target.absolutePath, value);
    return target.relativePath;
  }

  private async quizArtifactTarget(channelId: string, episodeId: string, filename: "quiz-v2.json" | "director-plan.json" | "asset-plan.json" | "asset-resolution.json" | "voice-plan.json" | "timeline.json" | "qa.json" | "history-check.json"): Promise<{ absolutePath: string; relativePath: string }> {
    const episode = await this.getEpisode(channelId, episodeId);
    const channel = await this.getChannel(channelId);
    const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
    await this.assertRealPathInside(this.roots.channels, episodeDirectory);
    const absolutePath = path.join(episodeDirectory, "quiz", filename);
    return { absolutePath, relativePath: ["channels", channel.slug, "episodes", episode.slug, "quiz", filename].join("/") };
  }

  private async readChannelBySlug(slug: string): Promise<Channel> {
    const directory = this.resolvePath("channels", this.assertSlug(slug));
    await this.assertRealPathInside(this.roots.channels, directory);
    const metadataPath = path.join(directory, "channel.json");
    const raw = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
    const metadata = ChannelSchema.parse(raw);
    const episodes = await this.safeEpisodeCount(directory);
    return ChannelSchema.parse({ ...metadata, episode_count: episodes });
  }

  private async safeEpisodeCount(channelDirectory: string): Promise<number> {
    try {
      const entries = await readdir(path.join(channelDirectory, "episodes"), { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).length;
    } catch {
      return 0;
    }
  }

  private async getTemplate(filename: string): Promise<string> {
    try {
      return await readFile(this.resolvePath("templates", filename), "utf8");
    } catch {
      throw new RepositoryError(`Required template is missing: ${filename}`, "TEMPLATE_MISSING");
    }
  }

  private createRoots(storageRoot: string): RepositoryRoots {
    return createRoots(this.rootDirectory, storageRoot);
  }

  private async markTopicSelected(channelId: string, topicId: string, questionCount: number): Promise<void> {
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

  private assertSlug(value: string): string {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 60) throw new RepositoryError("Invalid slug", "INVALID_SLUG");
    return value;
  }

  private async uniqueSlug(input: string, parentDirectory: string): Promise<string> {
    const base = this.slugify(input);
    let candidate = base;
    let suffix = 2;
    while (await this.exists(path.join(parentDirectory, candidate))) candidate = `${base}-${suffix++}`;
    return candidate;
  }

  private async exists(target: string): Promise<boolean> {
    try {
      await access(target);
      return true;
    } catch {
      return false;
    }
  }

  private isInside(rootPath: string, targetPath: string): boolean {
    return isInside(rootPath, targetPath);
  }

  private async assertRealPathInside(rootPath: string, targetPath: string): Promise<void> {
    await assertRealPathInside(rootPath, targetPath);
  }

  private async writeJsonAtomic(target: string, value: unknown): Promise<void> {
    await writeJsonAtomic(target, value);
  }

  private async writeTextAtomic(target: string, content: string): Promise<void> {
    await writeTextAtomic(target, content);
  }

  private async writeBinaryAtomic(target: string, content: Uint8Array): Promise<void> {
    await writeBinaryAtomic(target, content);
  }

  private async removeTree(target: string): Promise<void> {
    await rm(target, { recursive: true, force: true });
  }
}

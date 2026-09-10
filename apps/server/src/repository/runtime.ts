import type {
  BgmHistoryEntry,
  CalibrateMascotActionInput,
  Channel,
  ChannelMascotConfig,
  CreateChannelInput,
  CreateMascotStyleInput,
  DirectorPlan,
  Episode,
  EpisodeSettingsInput,
  MascotActionType,
  MascotProfile,
  MascotStyle,
  UpdateMascotSlotInput,
  UpdateMascotStyleInput,
  QuestionHistoryCheckResult,
  QuestionHistoryEntry,
  QuizAssessment,
  QuizAssetPlan,
  QuizAssetResolution,
  QuizImageStyle,
  QuizQuestion,
  QuizTimeline,
  QuizV2,
  Scene,
  TopicCandidate,
  TopicRunResult,
  VideoDescription,
  VoicePlan,
  VoiceProfile,
  UsageLedger,
  QuizStageTimings,
  BankTaxonomy,
  BankIndex,
  BankSubtopicBatch,
  BankQuestion,
  BankQuestionWithCooldown,
  BankTranslationContent,
  MatrixCoverageStats,
  IntroOutroStyle,
  IntroOutroClipMeta,
} from "@studio/shared";
import type { BankQuestionSnapshot } from "./quiz/bank/bankSerializationBoundary.js";
import type { CreateStylePresetInput, StylePreset, UpdateStylePresetInput } from "@studio/shared";
import type {
  MutationContext,
  ReelKey,
  ShortReelEditCommand,
  ShortReelRecord,
  ShortReelSourceSnapshot,
  ShortReelTopicSnapshot,
} from "@studio/shared";
import type { QueryQuestionBankParams } from "./quiz/questionBankRepository.js";
import type { BundleImageAsset, BundleImageMeta, RepositoryRoots } from "./types.js";
import type { EntityIdResolver } from "./cache/entityIdResolver.js";
import type { ChannelCache } from "./cache/channelCache.js";
import type { TransparentMascotAssetOptions, TransparentMascotAssetResult } from "./mascot/mascotTransparentCache.js";

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

export interface RepositoryRuntime {
  readonly serviceId: string;
  readonly rootDirectory: string;
  readonly storageRoot: string;
  readonly entityIdResolver: EntityIdResolver;
  readonly channelCache: ChannelCache;
  roots: RepositoryRoots;
  questionHistoryWrites: Map<string, Promise<void>>;
  usageLedgerWrites: Map<string, Promise<void>>;
  artifactMutationQueues: Map<string, Promise<void>>;
  shortReelMutationQueues: Map<string, Promise<void>>;

  // Writer admission lifecycle
  acquireWriterAdmission(): void;
  releaseWriterAdmission(): Promise<void>;
  isWriterAdmissionHeld(): boolean;
  close(): Promise<void> | void;

  // Infrastructure & Path safety
  resolvePath(root: keyof RepositoryRoots, ...segments: string[]): string;
  resolveContextPath(relativePath: string): string;
  ensureBootstrap(): Promise<void>;
  assertBundleNumber(value: number): number;
  slugify(input: string): string;
  assertSlug(value: string): string;
  uniqueSlug(input: string, parentDirectory: string): Promise<string>;
  exists(target: string): Promise<boolean>;
  isInside(rootPath: string, targetPath: string): boolean;
  assertRealPathInside(rootPath: string, targetPath: string): Promise<void>;
  queueEpisodeArtifactMutation<T>(channelId: string, episodeId: string, operation: () => Promise<T>): Promise<T>;
  writeJsonAtomic(target: string, value: unknown): Promise<void>;
  writeTextAtomic(target: string, content: string): Promise<void>;
  writeBinaryAtomic(target: string, content: Uint8Array): Promise<void>;
  removeTree(target: string): Promise<void>;
  safeEpisodeCount(channelDirectory: string): Promise<number>;
  getTemplate(filename: string): Promise<string>;
  readChannelBySlug(slug: string, forceDisk?: boolean): Promise<Channel>;
  markTopicSelected(channelId: string, topicId: string, questionCount: number): Promise<void>;

  // Quiz Artifact targets
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

  // Channel Operations
  listChannels(includeArchived?: boolean): Promise<Channel[]>;
  getChannel(channelId: string): Promise<Channel>;
  getChannelBySlug(slug: string): Promise<Channel>;
  createChannel(input: CreateChannelInput): Promise<Channel>;
  updateChannel(channelId: string, patch: Partial<Channel>): Promise<Channel>;
  deleteChannel(channelId: string, confirmed?: boolean): Promise<void>;
  getChannelDna(channelId: string): Promise<{ content: string; path: string; modified_at: string }>;
  saveChannelDna(channelId: string, content: string): Promise<{ path: string; modified_at: string }>;
  resetChannelDna(channelId: string): Promise<{ content: string; path: string; modified_at: string }>;

  // Mascot Operations
  listMascots(): Promise<MascotProfile[]>;
  getMascot(mascotId: string): Promise<MascotProfile>;
  saveMascot(mascot: Partial<MascotProfile> & { name: string }): Promise<MascotProfile>;
  deleteMascot(mascotId: string): Promise<void>;
  saveMascotAsset(mascotId: string, filename: string, content: Uint8Array): Promise<string>;
  getMascotAssetFile(mascotId: string, filename: string): Promise<{ absolutePath: string; size: number; modified_at: string }>;
  calibrateMascotAction(mascotId: string, action: MascotActionType, calibration: CalibrateMascotActionInput): Promise<MascotProfile>;
  listMascotAssets(mascotId: string): Promise<string[]>;
  deleteMascotAssetFile(mascotId: string, filename: string): Promise<void>;
  getTransparentMascotAssetFile(mascotId: string, filename: string): Promise<{ absolutePath: string; size: number; modified_at: string }>;
  deleteTransparentMascotAssetFile(mascotId: string, filename: string): Promise<void>;
  getOrCreateTransparentMascotAsset(
    mascotId: string,
    filename: string,
    options?: TransparentMascotAssetOptions,
  ): Promise<TransparentMascotAssetResult>;
  assignMascotToChannel(channelId: string, mascotId: string | null, config?: Partial<ChannelMascotConfig>): Promise<Channel>;
  createMascotStyle(mascotId: string, input: CreateMascotStyleInput): Promise<{ mascot: MascotProfile; style: MascotStyle }>;
  updateMascotStyle(mascotId: string, styleId: string, input: UpdateMascotStyleInput): Promise<MascotProfile>;
  deleteMascotStyle(mascotId: string, styleId: string): Promise<MascotProfile>;
  updateMascotSlot(mascotId: string, input: UpdateMascotSlotInput): Promise<MascotProfile>;
  setActiveMascotStyle(mascotId: string, styleId: string): Promise<MascotProfile>;

  // Voice Operations
  saveVoiceReference(channelId: string, content: Uint8Array): Promise<{ path: string; modified_at: string }>;
  listVoices(): Promise<VoiceProfile[]>;
  getVoice(voiceId: string): Promise<VoiceProfile>;
  createVoiceProfile(name: string, referenceContent: Uint8Array, sampleContent: Uint8Array): Promise<VoiceProfile>;
  updateVoiceSample(voiceId: string, content: Uint8Array): Promise<VoiceProfile>;
  deleteVoiceProfile(voiceId: string): Promise<void>;
  assignVoice(channelId: string, voiceId: string | null): Promise<Channel>;
  getVoiceSampleFile(voiceId: string): Promise<{ absolutePath: string; size: number; modified_at: string }>;

  // Episode Operations
  listEpisodes(channelId: string): Promise<Episode[]>;
  getEpisode(channelId: string, episodeId: string): Promise<Episode>;
  resolveEpisodeTitles(episodeIds: string[]): Promise<Record<string, string>>;
  getEpisodeFile(channelId: string, episodeId: string, filename: string): Promise<{ content: string; path: string; modified_at: string }>;
  loadEpisodeFile(channelId: string, episodeId: string, filename: string): Promise<string>;
  saveEpisodeFile(channelId: string, episodeId: string, filename: string, content: string): Promise<{ path: string; modified_at: string }>;
  deleteEpisode(channelId: string, episodeId: string, confirmed?: boolean): Promise<void>;
  updateEpisodeStage(channelId: string, episodeId: string, stage: Episode["stage"]): Promise<Episode>;
  backupEpisodeFile(channelId: string, episodeId: string, filename: string): Promise<string | null>;

  // Quiz Artifacts
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
  ): Promise<void>;
  removeQuestionHistoryEntries(
    channelId: string,
    filter: { episodeIds?: string[]; renderTaskIds?: string[] },
    ttlDays?: number,
  ): Promise<void>;
  readBgmHistory(channelId: string): Promise<BgmHistoryEntry[]>;
  appendBgmHistory(channelId: string, episodeId: string, trackId: string, filename: string, ttlDays?: number): Promise<void>;
  invalidateQuizArtifacts(channelId: string, episodeId: string, stages: string[]): Promise<string[]>;

  // Topics
  listTopics(channelId: string): Promise<TopicCandidate[]>;
  saveTopicRun(channelId: string, candidates: TopicCandidate[] | TopicRunResult): Promise<void>;
  confirmTopic(channelId: string, topicId: string, questionCount?: number, visualStyle?: QuizImageStyle | "mixed"): Promise<Episode>;
  updateEpisodeSettings(channelId: string, episodeId: string, settings: EpisodeSettingsInput, wordsPerSecond: number): Promise<Episode>;

  // Scenes & Bundles
  readScenes(channelId: string, episodeId: string): Promise<Scene[]>;
  listBundleImages(channelId: string, episodeId: string): Promise<BundleImageAsset[]>;
  getBundleImagePath(
    channelId: string,
    episodeId: string,
    bundleNumber: number,
    variant?: number,
  ): Promise<{ bundle_id: string; filename: string; path: string; absolutePath: string }>;
  getBundleImageFile(channelId: string, episodeId: string, filename: string): Promise<BundleImageAsset>;
  writeBundleImage(
    channelId: string,
    episodeId: string,
    bundleNumber: number,
    content: Uint8Array,
    variant?: number,
    meta?: BundleImageMeta,
  ): Promise<string>;
  writeBundleImageFromFile(
    channelId: string,
    episodeId: string,
    bundleNumber: number,
    sourcePath: string,
    variant?: number,
    meta?: BundleImageMeta,
  ): Promise<string>;
  clearBundleImages(channelId: string, episodeId: string, bundleNumber: number): Promise<void>;
  attachBundleReference(channelId: string, episodeId: string, bundleId: string, assetPath: string): Promise<number>;
  saveScenes(channelId: string, episodeId: string, scenes: Scene[]): Promise<void>;
  invalidateQuizSourceArtifacts(channelId: string, episodeId: string): Promise<void>;

  // Media
  saveSceneAudio(channelId: string, episodeId: string, sceneNumber: number, audioAssetPath: string, durationSeconds: number): Promise<void>;
  getSceneAudioFile(
    channelId: string,
    episodeId: string,
    filename: string,
  ): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }>;
  writeSceneAudio(channelId: string, episodeId: string, sceneNumber: number, content: Uint8Array): Promise<string>;
  writeNarrationAudio(channelId: string, episodeId: string, content: Uint8Array, segmentNumber?: number): Promise<string>;
  writeQuizVoiceSegmentAudio(
    channelId: string,
    episodeId: string,
    segmentNumber: number,
    content: Uint8Array,
    version?: string,
  ): Promise<string>;
  writeQuizNarrationAudio(channelId: string, episodeId: string, content: Uint8Array): Promise<string>;
  getQuizVoiceSegmentAudioFile(
    channelId: string,
    episodeId: string,
    segmentNumber: number,
    version?: string,
  ): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }>;
  writeVideoArtifact(channelId: string, episodeId: string, content: Uint8Array, filename?: string): Promise<string>;
  getEpisodeVideoFile(
    channelId: string,
    episodeId: string,
    filename?: string,
  ): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }>;
  writeRenderManifest(channelId: string, episodeId: string, content: string): Promise<string>;
  saveVideoMetadata(
    channelId: string,
    episodeId: string,
    assetPath: string,
    durationSeconds: number,
    renderManifestPath: string,
  ): Promise<Episode>;
  getEpisodeAudioFile(
    channelId: string,
    episodeId: string,
    filename: string,
  ): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }>;
  saveNarrationMetadata(
    channelId: string,
    episodeId: string,
    assetPath: string,
    durationSeconds: number,
    segmentCount: number,
    narrationWordCount: number,
  ): Promise<Episode>;

  // Sequence Drafts
  clearSequenceDrafts(episodeId: string): Promise<void>;
  removeEpisodeRuntimeArtifacts(episodeId: string): Promise<void>;
  saveSequenceDraft(episodeId: string, sequenceNumber: number, scenes: Scene[]): Promise<void>;
  readSequenceDrafts(episodeId: string): Promise<Array<{ sequenceNumber: number; scenes: Scene[]; modified_at: string }>>;
  commitSequenceDrafts(channelId: string, episodeId: string, expectedCount: number): Promise<boolean>;

  // Git Info
  getGitInfo(): Promise<{ branch: string | null; dirty: boolean; changed_files: number }>;

  // Dashboard-managed style presets
  listStylePresets(): Promise<StylePreset[]>;
  createStylePreset(input: CreateStylePresetInput): Promise<StylePreset>;
  updateStylePreset(presetId: string, input: UpdateStylePresetInput): Promise<StylePreset>;
  deleteStylePreset(presetId: string): Promise<void>;

  // Question Bank
  getQuestionBankPath(...segments: string[]): string;
  readQuestionBankTaxonomy(): Promise<BankTaxonomy>;
  readQuestionBankIndex(): Promise<BankIndex>;
  listQuestionBankBatches(filter?: { archetypeId?: string; domainId?: string }): Promise<BankSubtopicBatch[]>;
  recalculateQuestionBankIndex(): Promise<BankIndex>;
  queryQuestionBankQuestions(params?: QueryQuestionBankParams): Promise<{ questions: BankQuestionWithCooldown[]; total: number }>;
  readQuestionBankQuestionsSnapshot(
    params?: QueryQuestionBankParams,
  ): Promise<{ questions: BankQuestionWithCooldown[]; total: number; revision: number }>;
  getQuestionBankQuestion(questionId: string, channelId?: string): Promise<BankQuestionWithCooldown | null>;
  readQuestionBankSnapshot(): Promise<BankQuestionSnapshot>;
  saveQuestionBankQuestion(question: BankQuestion): Promise<BankQuestion>;
  saveQuestionBankTranslation(questionId: string, translation: BankTranslationContent): Promise<BankQuestion | null>;
  deleteQuestionBankQuestion(questionId: string): Promise<boolean>;
  clearQuestionBank(): Promise<{ cleared_batches_count: number }>;
  getQuestionBankMatrixCoverage(): Promise<MatrixCoverageStats>;

  // Short Reels
  listShortReels(channelId: string): Promise<ShortReelRecord[]>;
  getShortReel(key: ReelKey): Promise<ShortReelRecord>;
  getShortReelByTopic(channelId: string, topicId: string): Promise<ShortReelRecord | null>;
  createShortReel(
    channelId: string,
    topic: ShortReelTopicSnapshot,
    source: ShortReelSourceSnapshot,
    requestId?: string,
    reelId?: string,
  ): Promise<ShortReelRecord>;
  updateShortReel(key: ReelKey, context: MutationContext, command: ShortReelEditCommand): Promise<ShortReelRecord>;
  deleteShortReel(key: ReelKey): Promise<boolean>;

  // Intro / Outro Styles
  listChannelIntroOutroStyles(channelId: string): Promise<IntroOutroStyle[]>;
  getChannelIntroOutroStyle(channelId: string, styleId: string): Promise<IntroOutroStyle | null>;
  saveChannelIntroOutroStyle(channelId: string, style: IntroOutroStyle): Promise<void>;
  deleteChannelIntroOutroStyle(channelId: string, styleId: string): Promise<void>;
  processAndStoreStyleClip(
    channelId: string,
    styleId: string,
    kind: "intro" | "outro",
    sourceBufferOrPath: Buffer | string,
    originalFilename: string,
  ): Promise<IntroOutroClipMeta>;
  getIntroOutroClipPath(channelId: string, styleId: string, kind: "intro" | "outro"): Promise<string>;
  getIntroOutroThumbPath(channelId: string, styleId: string, kind: "intro" | "outro"): Promise<string | null>;
}

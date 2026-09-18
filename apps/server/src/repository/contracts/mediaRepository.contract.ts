import type {
  Channel,
  CreateStylePresetInput,
  Episode,
  IntroOutroClipMeta,
  IntroOutroStyle,
  Scene,
  StylePreset,
  UpdateStylePresetInput,
  VoiceProfile,
} from "@studio/shared";
import type { BundleImageAsset, BundleImageMeta } from "../types.js";

export interface IMediaRepository {
  // Voice Operations
  saveVoiceReference(channelId: string, content: Uint8Array): Promise<{ path: string; modified_at: string }>;
  listVoices(): Promise<VoiceProfile[]>;
  getVoice(voiceId: string): Promise<VoiceProfile>;
  createVoiceProfile(name: string, referenceContent: Uint8Array, sampleContent: Uint8Array): Promise<VoiceProfile>;
  updateVoiceSample(voiceId: string, content: Uint8Array): Promise<VoiceProfile>;
  deleteVoiceProfile(voiceId: string): Promise<void>;
  assignVoice(channelId: string, voiceId: string | null): Promise<Channel>;
  getVoiceSampleFile(voiceId: string): Promise<{ absolutePath: string; size: number; modified_at: string }>;

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
  saveBundleImage?(
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
  deleteBundleImage?(channelId: string, episodeId: string, bundleNumber: number): Promise<void>;
  attachBundleReference(channelId: string, episodeId: string, bundleId: string, assetPath: string): Promise<number>;
  saveScenes(channelId: string, episodeId: string, scenes: Scene[]): Promise<void>;
  invalidateQuizSourceArtifacts(channelId: string, episodeId: string): Promise<void>;

  // Media (Audio / Video)
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

  // Dashboard-managed style presets
  listStylePresets(): Promise<StylePreset[]>;
  createStylePreset(input: CreateStylePresetInput): Promise<StylePreset>;
  updateStylePreset(presetId: string, input: UpdateStylePresetInput): Promise<StylePreset>;
  deleteStylePreset(presetId: string): Promise<void>;

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

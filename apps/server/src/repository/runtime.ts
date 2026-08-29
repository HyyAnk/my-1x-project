import type { BgmHistoryEntry, Channel, Episode, MascotProfile, QuestionHistoryEntry, Scene, TopicCandidate, VoiceProfile } from "@studio/shared";
import type { BundleImageAsset, RepositoryRoots } from "./types.js";

export interface RepositoryRuntime {
  readonly rootDirectory: string;
  roots: RepositoryRoots;
  resolvePath(root: keyof RepositoryRoots, ...segments: string[]): string;
  getChannel(channelId: string): Promise<Channel>;
  getEpisode(channelId: string, episodeId: string): Promise<Episode>;
  getMascot(mascotId: string): Promise<MascotProfile>;
  getVoice(voiceId: string): Promise<VoiceProfile>;
  listChannels(includeArchived?: boolean): Promise<Channel[]>;
  listMascots(): Promise<MascotProfile[]>;
  listEpisodes(channelId: string): Promise<Episode[]>;
  listBundleImages(channelId: string, episodeId: string): Promise<BundleImageAsset[]>;
  listTopics(channelId: string): Promise<TopicCandidate[]>;
  listVoices(): Promise<VoiceProfile[]>;
  readChannelBySlug(slug: string): Promise<Channel>;
  readBgmHistory(channelId: string): Promise<BgmHistoryEntry[]>;
  readQuestionHistory(channelId: string): Promise<QuestionHistoryEntry[]>;
  readScenes(channelId: string, episodeId: string): Promise<Scene[]>;
  readSequenceDrafts(episodeId: string): Promise<Array<{ sequenceNumber: number; scenes: Scene[]; modified_at: string }>>;
  writeJsonAtomic(target: string, value: unknown): Promise<void>;
  writeTextAtomic(target: string, content: string): Promise<void>;
  writeBinaryAtomic(target: string, content: Uint8Array): Promise<void>;
  assertRealPathInside(rootPath: string, targetPath: string): Promise<void>;
  [member: string]: any;
}

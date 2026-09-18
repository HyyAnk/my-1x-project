import type { Episode, EpisodeSettingsInput, QuizImageStyle, Scene, TopicCandidate, TopicRunResult } from "@studio/shared";

export interface IEpisodeRepository {
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

  // Sequence Drafts
  clearSequenceDrafts(episodeId: string): Promise<void>;
  removeEpisodeRuntimeArtifacts(episodeId: string): Promise<void>;
  saveSequenceDraft(episodeId: string, sequenceNumber: number, scenes: Scene[]): Promise<void>;
  readSequenceDrafts(episodeId: string): Promise<Array<{ sequenceNumber: number; scenes: Scene[]; modified_at: string }>>;
  commitSequenceDrafts(channelId: string, episodeId: string, expectedCount: number): Promise<boolean>;

  // Topics
  listTopics(channelId: string): Promise<TopicCandidate[]>;
  saveTopicRun(channelId: string, candidates: TopicCandidate[] | TopicRunResult): Promise<void>;
  confirmTopic(channelId: string, topicId: string, questionCount?: number, visualStyle?: QuizImageStyle | "mixed"): Promise<Episode>;
  updateEpisodeSettings(channelId: string, episodeId: string, settings: EpisodeSettingsInput, wordsPerSecond: number): Promise<Episode>;
  markTopicSelected(channelId: string, topicId: string, questionCount: number): Promise<void>;
}

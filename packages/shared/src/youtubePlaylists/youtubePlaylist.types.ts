import type { QUIZ_GAMEPLAY_IDS } from "../quizGameplaySchema.js";

type QuizGameplayId = (typeof QUIZ_GAMEPLAY_IDS)[number];

export const YOUTUBE_PLAYLIST_KEYS = [
  "animal_nature_quiz",
  "science_space_quiz",
  "world_culture_quiz",
  "pop_culture_quiz",
  "everyday_things_quiz",
  "guess_the_picture",
  "quick_quiz_shorts",
  "true_or_false_shorts",
  "this_vs_that_shorts",
] as const;

export type YouTubePlaylistKey = (typeof YOUTUBE_PLAYLIST_KEYS)[number];

/** Long-form playlists hold 16:9 Episodes; Shorts playlists hold 9:16 Quiz Shorts and Short Reels. */
export type YouTubePlaylistFormat = "long_form" | "shorts";

export interface YouTubePlaylistDefinition {
  key: YouTubePlaylistKey;
  title: string;
  format: YouTubePlaylistFormat;
  summary: string;
}

export type PlaylistContentKind = "episode" | "quiz_short" | "short_reel";

export interface PlaylistAssignmentInput {
  contentKind: PlaylistContentKind;
  domainId?: string | null;
  archetype?: QuizGameplayId | null;
  quizFormat?: string | null;
  /** Topic title / premise used to infer a domain when `domainId` is missing. */
  topicText?: string | null;
}

/** How the topic playlist was chosen: stored domain, keyword inference, or no topic match. */
export type PlaylistDomainSource = "stored" | "inferred" | "none";

export interface PlaylistAssignment {
  /** The playlist the video belongs to first; null when no topic or format rule matched. */
  primary: YouTubePlaylistDefinition | null;
  /** Additional playlists the same video should also be added to. */
  secondary: YouTubePlaylistDefinition[];
  domainId: string | null;
  domainSource: PlaylistDomainSource;
}

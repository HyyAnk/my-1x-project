import type { Episode, QuizV2 } from "@studio/shared";

/** Result of bootstrapping an episode directory, record, and quiz metadata on disk. */
export interface BootstrapEpisodeResult {
  episode: Episode;
  quiz: QuizV2;
  episodeDirectory: string;
  timestamp: string;
}

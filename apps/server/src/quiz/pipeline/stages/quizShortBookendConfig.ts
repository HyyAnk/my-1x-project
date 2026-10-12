import type { RepositoryService } from "../../../repository.js";
import { createQuizShortBookendDeps, pinQuizShortBookends } from "../../../quizShortBookends/index.js";

export type QuizShortBookendConfig = {
  style: null;
  skipIntro: true;
  skipOutro: true;
  introDuration: number;
  outroDuration: number;
  shortIntroTitle: string | undefined;
};

/**
 * Pins the Short Intro & Outro pair before voice is planned. With an intro the kickoff reads the
 * quiz title; the intro length itself does not set the timeline, the title narration does.
 */
export async function resolveQuizShortBookendConfig(
  repository: RepositoryService,
  channelId: string,
  quizShortId: string,
): Promise<QuizShortBookendConfig> {
  const quizShort = await repository.getQuizShort(channelId, quizShortId);
  const snapshot = await pinQuizShortBookends(createQuizShortBookendDeps(repository), quizShort);
  const hasIntro = snapshot.intro_duration_seconds > 0;
  return {
    style: null,
    skipIntro: true,
    skipOutro: true,
    introDuration: snapshot.intro_duration_seconds,
    outroDuration: snapshot.outro_duration_seconds,
    shortIntroTitle: hasIntro ? quizShort.topic.title.trim() || undefined : undefined,
  };
}

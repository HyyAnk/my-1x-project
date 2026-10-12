import { quizShortProductRef, type QuizShort, type QuizShortBookendSnapshot } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { createQuizShortBookendDeps } from "./index.js";
import { pinQuizShortBookends } from "./quizShortBookendSelection.js";

type SyncRepository = Pick<
  RepositoryService,
  "getChannel" | "resolvePath" | "writeJsonAtomic" | "queueEpisodeArtifactMutation" | "invalidateQuizArtifacts" | "getQuizShort"
>;

function bookendShape(snapshot: QuizShortBookendSnapshot | undefined): string {
  return JSON.stringify([snapshot?.intro_duration_seconds ?? 0, snapshot?.outro_duration_seconds ?? 0]);
}

/**
 * Re-pins the Short Intro & Outro pair after a settings change. When the intro or outro appears,
 * disappears or changes length, the kickoff line and timeline no longer fit, so voice is rebuilt.
 */
export async function syncQuizShortBookendPin(repository: SyncRepository, quizShort: QuizShort): Promise<QuizShort> {
  const deps = createQuizShortBookendDeps(repository);
  const previous = await deps.store.readSnapshot(quizShort.channel_id, quizShort.quiz_short_id);
  const next = await pinQuizShortBookends(deps, quizShort);
  if (bookendShape(previous) === bookendShape(next)) return quizShort;
  const ref = quizShortProductRef(quizShort.channel_id, quizShort.quiz_short_id);
  await repository.invalidateQuizArtifacts(quizShort.channel_id, ref, ["voice", "timeline", "qa", "render"]);
  return repository.getQuizShort(quizShort.channel_id, quizShort.quiz_short_id);
}

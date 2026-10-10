import path from "node:path";
import { quizShortProductRef, type DirectorPlan, type QuizShort, type QuizV2 } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { saveQuizShortLocalizationArtifact } from "../localization/quizShortLocalizationStore.js";
import type { ProductLocalizationArtifact } from "../localization/localization.types.js";

export interface WriteQuizShortConfirmationArtifactsParams {
  repository: RepositoryService;
  channelId: string;
  quizShort: QuizShort;
  quiz: QuizV2;
  directorPlan: DirectorPlan;
  localizationArtifact: ProductLocalizationArtifact;
  sourcesContent: string;
}

/**
 * Persists the Quiz Short record first, then every confirmation artifact through the product-ref
 * helpers so the files land under `channels/<slug>/quiz_shorts/<slug>/`. A preparing-receipt retry
 * simply overwrites the previous attempt because every write is atomic and keyed by the same slug.
 */
export async function writeQuizShortConfirmationArtifacts(params: WriteQuizShortConfirmationArtifactsParams): Promise<void> {
  const { repository, channelId, quizShort, quiz, directorPlan, localizationArtifact, sourcesContent } = params;
  const ref = quizShortProductRef(channelId, quizShort.quiz_short_id);

  await repository.saveQuizShort(channelId, quizShort);
  await repository.writeQuiz(channelId, ref, quiz);
  await repository.writeDirectorPlan(channelId, ref, directorPlan);
  await saveQuizShortLocalizationArtifact(repository, channelId, quizShort.quiz_short_id, localizationArtifact);

  const location = await repository.locateQuizProduct(channelId, ref);
  await repository.writeTextAtomic(path.join(location.directory, "sources.md"), sourcesContent);
}

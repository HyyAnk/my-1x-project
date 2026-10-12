import type { RepositoryService } from "../repository.js";
import { QuizShortBookendService } from "./quizShortBookendService.js";
import { QuizShortBookendStore } from "./quizShortBookendStore.js";
import type { QuizShortBookendSelectionDeps } from "./quizShortBookendSelection.js";

export { QuizShortBookendService } from "./quizShortBookendService.js";
export { QuizShortBookendStore } from "./quizShortBookendStore.js";
export {
  pinQuizShortBookends,
  quizShortBookendSelectionKey,
  resolveQuizShortBookends,
  type QuizShortBookendSelectionDeps,
  type ReadyQuizShortBookends,
} from "./quizShortBookendSelection.js";
export { CreateQuizShortBookendPairInputSchema, UpdateQuizShortBookendPairInputSchema } from "./quizShortBookendSchemas.js";

type BookendRepository = Pick<RepositoryService, "getChannel" | "resolvePath" | "writeJsonAtomic" | "queueEpisodeArtifactMutation">;

/** Builds the store, service and selection dependencies over one repository. */
export function createQuizShortBookendDeps(repository: BookendRepository): QuizShortBookendSelectionDeps {
  const store = new QuizShortBookendStore(repository);
  return { repository, store, service: new QuizShortBookendService(store) };
}

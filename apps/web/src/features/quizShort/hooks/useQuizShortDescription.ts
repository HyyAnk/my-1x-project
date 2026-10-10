import { useMemo } from "react";
import { buildQuizShortDescriptionClient } from "../services/quizShortMetadataClients";
import type { VideoDescriptionClient } from "../types/quizShort.types";

/** Memoized description client so the shared VideoDescriptionCard talks to the Quiz Short routes. */
export function useQuizShortDescription(channelId: string, quizShortId: string): VideoDescriptionClient {
  return useMemo(() => buildQuizShortDescriptionClient(channelId, quizShortId), [channelId, quizShortId]);
}

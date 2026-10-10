import { useMemo } from "react";
import { buildQuizShortTitleClient } from "../services/quizShortMetadataClients";
import type { VideoTitleClient } from "../types/quizShort.types";

/** Memoized title client so the shared VideoTitleCard talks to the Quiz Short title routes. */
export function useQuizShortTitle(channelId: string, quizShortId: string): VideoTitleClient {
  return useMemo(() => buildQuizShortTitleClient(channelId, quizShortId), [channelId, quizShortId]);
}

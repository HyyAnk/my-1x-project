import { quizShortApi } from "../../../api/quizShortApi";
import type { VideoDescriptionClient, VideoTitleClient } from "../types/quizShort.types";

export function buildQuizShortTitleClient(channelId: string, quizShortId: string): VideoTitleClient {
  return {
    get: () => quizShortApi.getQuizShortTitle(channelId, quizShortId),
    generate: (toneHint) => quizShortApi.generateQuizShortTitle(channelId, quizShortId, toneHint),
    save: (input) => quizShortApi.saveQuizShortTitle(channelId, quizShortId, input),
  };
}

export function buildQuizShortDescriptionClient(channelId: string, quizShortId: string): VideoDescriptionClient {
  return {
    get: () => quizShortApi.getQuizShortDescription(channelId, quizShortId),
    generate: (toneHint, force) => quizShortApi.generateQuizShortDescription(channelId, quizShortId, toneHint, force),
    save: (input) => quizShortApi.saveQuizShortDescription(channelId, quizShortId, input),
  };
}

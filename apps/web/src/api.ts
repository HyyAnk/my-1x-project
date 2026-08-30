import { channelApi } from "./api/channelApi";
import { episodeApi } from "./api/episodeApi";
import { quizApi } from "./api/quizApi";
import { mediaApi } from "./api/mediaApi";
import { taskApi } from "./api/taskApi";
import { voiceApi } from "./api/voiceApi";
import { mascotApi } from "./api/mascotApi";
import { settingsApi } from "./api/settingsApi";

export * from "./api/client";
export * from "./api/channelApi";
export * from "./api/episodeApi";
export * from "./api/quizApi";
export * from "./api/mediaApi";
export * from "./api/taskApi";
export * from "./api/voiceApi";
export * from "./api/mascotApi";
export * from "./api/settingsApi";

/**
 * Unified API Client Facade
 * Aggregates all modular sub-APIs while preserving 100% backward compatibility.
 */
export const api = {
  ...channelApi,
  ...episodeApi,
  ...quizApi,
  ...mediaApi,
  ...taskApi,
  ...voiceApi,
  ...mascotApi,
  ...settingsApi,
};

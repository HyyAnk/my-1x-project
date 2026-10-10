import type { VideoDescription, VideoDescriptionInput, VideoTitle, VideoTitleInput } from "@studio/shared";

/**
 * Data-access contracts for the YouTube title and description cards. Episodes and Quiz Shorts
 * store these artifacts behind different routes, so each feature supplies its own client and
 * the presentation components stay identical.
 */
export interface VideoTitleClient {
  get: () => Promise<{ title: VideoTitle | null }>;
  generate: (toneHint?: string) => Promise<{ title: VideoTitle }>;
  save: (input: VideoTitleInput) => Promise<{ title: VideoTitle }>;
}

export interface VideoDescriptionClient {
  get: () => Promise<{ description: VideoDescription | null }>;
  generate: (toneHint?: string, force?: boolean) => Promise<{ description: VideoDescription }>;
  save: (input: VideoDescriptionInput) => Promise<{ description: VideoDescription }>;
}

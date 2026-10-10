import { VideoTitleSchema, type VideoTitle } from "@studio/shared";
import type { RepositoryRuntime } from "../runtime.js";

export async function readVideoTitle(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<VideoTitle | null> {
  return this.readQuizArtifact(channelId, episodeId, "video-title.json", VideoTitleSchema);
}

export async function writeVideoTitle(this: RepositoryRuntime, channelId: string, episodeId: string, title: VideoTitle): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "video-title.json", VideoTitleSchema.parse(title));
}

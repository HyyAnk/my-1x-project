import { VideoTitleSchema, type VideoTitle } from "@studio/shared";
import type { QuizProductId, RepositoryRuntime } from "../runtime.js";

export async function readVideoTitle(this: RepositoryRuntime, channelId: string, product: QuizProductId): Promise<VideoTitle | null> {
  return this.readQuizArtifact(channelId, product, "video-title.json", VideoTitleSchema);
}

export async function writeVideoTitle(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  title: VideoTitle,
): Promise<string> {
  return this.writeQuizArtifact(channelId, product, "video-title.json", VideoTitleSchema.parse(title));
}

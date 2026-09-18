import path from "node:path";
import type { RepositoryService } from "../../repository.js";
import type { TransitionPreviewLimiterPort } from "./transitionPreview.types.js";
import { TransitionPreviewService } from "./transitionPreviewService.js";
import { DiskTransitionPreviewStore } from "./transitionPreviewStore.js";
import { HyperframesTransitionPreviewRunner } from "../../tasks/video/transitionPreviewRunner.js";

interface EpisodeWithTransition {
  render_output?: {
    video_path?: string;
    manifest_path?: string;
  };
  director_plan?: {
    beats?: Array<{
      transition_id?: string;
    }>;
  };
}

export function createTransitionPreviewService(
  repository: RepositoryService,
  limiter: TransitionPreviewLimiterPort,
): { service: TransitionPreviewService; store: DiskTransitionPreviewStore } {
  const store = new DiskTransitionPreviewStore({
    storeDir: repository.resolvePath("runtime", "transition-previews", "artifacts"),
  });
  const runner = new HyperframesTransitionPreviewRunner({
    runtimeDir: repository.resolvePath("runtime", "transition-previews", "renders"),
  });
  const service = new TransitionPreviewService({
    store,
    runner,
    repository: {
      getEpisodeRenderOutput: async (channelId: string, episodeId: string) => {
        try {
          const episode = (await repository.getEpisode(channelId, episodeId)) as unknown as EpisodeWithTransition;
          const videoPath = episode?.render_output?.video_path;
          if (!videoPath) return null;
          const manifestPath = episode.render_output?.manifest_path;
          const transitionId = episode.director_plan?.beats?.[0]?.transition_id;
          const resolveFullPath = (p: string) => (path.isAbsolute(p) ? p : repository.resolvePath("channels", p));
          return {
            videoPath: resolveFullPath(videoPath),
            manifestPath: manifestPath ? resolveFullPath(manifestPath) : undefined,
            transitionSettings: transitionId ? { scene: { id: transitionId } } : undefined,
          };
        } catch {
          return null;
        }
      },
    },
    limiter,
  });
  return { service, store };
}

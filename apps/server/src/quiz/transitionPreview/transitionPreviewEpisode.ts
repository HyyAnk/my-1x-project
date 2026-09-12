import type {
  TransitionPreviewRequest,
  TransitionPreviewStatus,
} from "@studio/shared";
import type { TransitionPreviewRepositoryPort } from "./transitionPreview.types.js";

export async function resolveEpisodeTransitionPreview(
  repository: TransitionPreviewRepositoryPort | undefined,
  request: TransitionPreviewRequest,
  jobId: string,
): Promise<TransitionPreviewStatus> {
  if (request.source.kind !== "episode") {
    throw new Error("Invalid source kind for episode preview resolution");
  }

  const { channelId, episodeId } = request.source;
  const episodeOutput = await repository?.getEpisodeRenderOutput?.(channelId, episodeId);

  if (!episodeOutput || !episodeOutput.videoPath) {
    return {
      status: "failed",
      jobId,
      requestId: request.clientRequestId,
      fingerprint: "",
      revision: 1,
      error: {
        code: "RENDER_REQUIRED",
        message: "Episode output has not been rendered yet",
        retryable: false,
      },
    };
  }

  const renderedTransitionId =
    episodeOutput.transitionSettings?.scene?.id ?? episodeOutput.transitionSettings?.intro?.id;
  if (renderedTransitionId && renderedTransitionId !== request.selection.id) {
    return {
      status: "failed",
      jobId,
      requestId: request.clientRequestId,
      fingerprint: "",
      revision: 1,
      error: {
        code: "RENDER_REQUIRED",
        message: "Draft differs from render: render required to preview changed transition settings",
        retryable: false,
      },
    };
  }

  const artifactId = `ep_${episodeId}`;
  return {
    status: "ready",
    jobId,
    requestId: request.clientRequestId,
    fingerprint: `ep_fp_${episodeId}`,
    revision: 1,
    artifactId,
    manifestUrl: `/api/transition-previews/artifacts/${artifactId}/manifest`,
    videoUrl: `/api/transition-previews/artifacts/${artifactId}/video`,
  };
}

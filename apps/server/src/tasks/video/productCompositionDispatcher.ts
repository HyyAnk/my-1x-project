import type { Channel, Scene } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { prepareVideoComposition, type VideoCompositionContext } from "./videoCompositionPreparer.js";
import { prepareQuizShortComposition } from "./quizShortCompositionPreparer.js";
import type { VideoRenderProduct } from "./videoRenderProduct.js";

export type ProductCompositionOptions = {
  runtime: TaskManagerRuntime;
  repository: RepositoryService;
  taskId: string;
  signal: AbortSignal;
  channel: Channel;
  product: VideoRenderProduct;
  scenes: Scene[];
  onProgress: (message: string, percent: number) => Promise<void>;
};

/**
 * Routes composition preparation by product kind. Episodes use the landscape preparer with its
 * intro/outro bookends; Quiz Shorts use the portrait preparer (kickoff, questions, score CTA).
 */
export async function prepareProductVideoComposition(options: ProductCompositionOptions): Promise<VideoCompositionContext> {
  const { product, ...rest } = options;
  if (product.view.episode) {
    return prepareVideoComposition({ ...rest, episode: product.view.episode, renderAspectRatio: product.renderAspectRatio });
  }
  if (product.view.quizShort) {
    return prepareQuizShortComposition({ ...rest, product, quizShort: product.view.quizShort });
  }
  throw new RepositoryError(`Unsupported product kind "${product.view.kind}" for video composition`, "UNSUPPORTED_PRODUCT_KIND");
}

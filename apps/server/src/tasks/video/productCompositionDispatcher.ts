import type { Channel, Scene } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import type { TaskManagerRuntime } from "../runtime.js";
import { prepareVideoComposition, type VideoCompositionContext } from "./videoCompositionPreparer.js";
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
 * Routes composition preparation by product kind. Episodes use the landscape preparer as before.
 * The portrait Quiz Short composition (layout slots, mascot rules, CTA clip) is Phase 4 work, so
 * a Quiz Short render stops here with an explicit error instead of pretending to compose.
 */
export async function prepareProductVideoComposition(options: ProductCompositionOptions): Promise<VideoCompositionContext> {
  const { product, ...rest } = options;
  if (product.view.episode) {
    return prepareVideoComposition({ ...rest, episode: product.view.episode, renderAspectRatio: product.renderAspectRatio });
  }
  throw new RepositoryError("Quiz Short portrait composition is not implemented in this phase", "QUIZ_SHORT_RENDER_NOT_IMPLEMENTED");
}

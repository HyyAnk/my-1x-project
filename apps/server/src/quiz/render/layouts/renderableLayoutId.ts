import { QuizPreviewLayoutIdSchema, type QuizPreviewLayoutId } from "@studio/shared";

/**
 * Layout ids that have a production HTML renderer: the landscape Episode catalog, the portrait
 * Quiz Short catalog and the preview baseline. Any other id reaching a renderer is a programming
 * error (a stale director plan or an unregistered catalog entry), not a recoverable render state.
 */
export function isRenderableLayoutId(layoutId: string): layoutId is QuizPreviewLayoutId {
  return QuizPreviewLayoutIdSchema.safeParse(layoutId).success;
}

export function assertRenderableLayoutId(layoutId: string): QuizPreviewLayoutId {
  if (!isRenderableLayoutId(layoutId)) {
    throw new Error(`Layout ${layoutId} has no production renderer`);
  }
  return layoutId;
}

import { QuizPreviewLayoutIdSchema, type QuizPreviewLayoutId } from "@studio/shared";

/**
 * Layout ids that currently have an HTML renderer. Portrait Quiz Short layouts exist in the
 * shared catalog ahead of their renderers; routing one here is a programming error, not a
 * recoverable render state.
 */
export function isRenderableLayoutId(layoutId: string): layoutId is QuizPreviewLayoutId {
  return QuizPreviewLayoutIdSchema.safeParse(layoutId).success;
}

export function assertRenderableLayoutId(layoutId: string): QuizPreviewLayoutId {
  if (!isRenderableLayoutId(layoutId)) {
    throw new Error(`Layout ${layoutId} has no production renderer yet`);
  }
  return layoutId;
}

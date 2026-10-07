import type { ThumbnailAspectRatio } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { QuizThumbnailPlan } from "./thumbnailTypes.js";
import { composeEditorialThumbnail } from "./editorial/editorialCompositor.js";

export async function writeGeneratedThumbnail(input: {
  repository: RepositoryService;
  source: Buffer;
  plan: QuizThumbnailPlan;
  ratio: ThumbnailAspectRatio;
  targets: { variantAbsolute: string; activeAbsolute: string };
  signal?: AbortSignal;
  assertCurrent?: () => Promise<void>;
}): Promise<void> {
  input.signal?.throwIfAborted();
  const image = await composeEditorialThumbnail(input.source, input.plan, input.ratio, input.repository.rootDirectory);
  await input.assertCurrent?.();
  input.signal?.throwIfAborted();
  await input.repository.writeBinaryAtomic(input.targets.variantAbsolute, image);
  await input.repository.writeBinaryAtomic(input.targets.activeAbsolute, image);
}

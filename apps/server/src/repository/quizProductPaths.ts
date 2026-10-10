import { QUIZ_SHORT_ID_PREFIX, episodeProductRef, quizShortProductRef, type QuizProductKind, type QuizProductRef } from "@studio/shared";
import { resolvePath } from "./pathSafety.js";
import type { RepositoryRoots } from "./types.js";

/**
 * Product reference mechanism for the quiz repository layer.
 *
 * Every artifact and media helper keyed by `(channelId, episodeId)` now accepts a `QuizProductId`
 * in the second position: either a `QuizProductRef` (explicit kind) or a plain id string. A plain
 * string keeps every existing Episode call site compiling unchanged; its kind is resolved from the
 * id prefix (`qshort_` means Quiz Short, anything else is an Episode). New code should pass a ref.
 */
export type QuizProductId = string | QuizProductRef;

export function toQuizProductRef(channelId: string, product: QuizProductId): QuizProductRef {
  if (typeof product !== "string") return product;
  return product.startsWith(QUIZ_SHORT_ID_PREFIX) ? quizShortProductRef(channelId, product) : episodeProductRef(channelId, product);
}

export function quizProductIdOf(product: QuizProductId): string {
  return typeof product === "string" ? product : product.product_id;
}

const PRODUCT_COLLECTION_DIRECTORIES: Record<QuizProductKind, "episodes" | "quiz_shorts"> = {
  episode: "episodes",
  quiz_short: "quiz_shorts",
};

const PRODUCT_RECORD_FILENAMES: Record<QuizProductKind, "episode.json" | "quiz_short.json"> = {
  episode: "episode.json",
  quiz_short: "quiz_short.json",
};

export function quizProductCollectionDirectory(kind: QuizProductKind): "episodes" | "quiz_shorts" {
  return PRODUCT_COLLECTION_DIRECTORIES[kind];
}

export function quizProductRecordFilename(kind: QuizProductKind): "episode.json" | "quiz_short.json" {
  return PRODUCT_RECORD_FILENAMES[kind];
}

/** Path segments under the `channels` root, e.g. `[slug, "quiz_shorts", productSlug]`. */
export function quizProductDirectorySegments(kind: QuizProductKind, channelSlug: string, productSlug: string): string[] {
  return [channelSlug, quizProductCollectionDirectory(kind), productSlug];
}

/** Repository-relative POSIX path, e.g. `channels/<slug>/quiz_shorts/<productSlug>`. */
export function quizProductRelativeDirectory(kind: QuizProductKind, channelSlug: string, productSlug: string): string {
  return ["channels", ...quizProductDirectorySegments(kind, channelSlug, productSlug)].join("/");
}

/** Absolute, safety-checked product directory. */
export function resolveQuizProductDirectory(
  roots: RepositoryRoots,
  kind: QuizProductKind,
  channelSlug: string,
  productSlug: string,
  ...segments: string[]
): string {
  return resolvePath(roots, "channels", ...quizProductDirectorySegments(kind, channelSlug, productSlug), ...segments);
}

/** Absolute collection root (`channels/<slug>/episodes` or `channels/<slug>/quiz_shorts`). */
export function resolveQuizProductCollectionDirectory(roots: RepositoryRoots, kind: QuizProductKind, channelSlug: string): string {
  return resolvePath(roots, "channels", channelSlug, quizProductCollectionDirectory(kind));
}

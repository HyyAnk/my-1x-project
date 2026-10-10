import { readFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "./errors.js";
import type { QuizProductId } from "./quizProductPaths.js";
import type { QuizArtifactFilename, RepositoryRuntime } from "./runtime.js";

/**
 * Quiz artifacts live under `<product directory>/quiz/<filename>` for both Episodes and Quiz
 * Shorts. See `quizProductPaths.ts` for how the `product` argument resolves its kind.
 */
export async function quizArtifactTarget(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  filename: QuizArtifactFilename,
): Promise<{ absolutePath: string; relativePath: string }> {
  const location = await this.locateQuizProduct(channelId, product);
  return {
    absolutePath: path.join(location.directory, "quiz", filename),
    relativePath: `${location.relativeDirectory}/quiz/${filename}`,
  };
}

export async function readQuizArtifact<T>(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  filename: QuizArtifactFilename,
  schema: { parse(value: unknown): T },
): Promise<T | null> {
  const target = await this.quizArtifactTarget(channelId, product, filename);
  try {
    const raw = JSON.parse(await readFile(target.absolutePath, "utf8")) as unknown;
    return schema.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") return null;
    if (error instanceof RepositoryError) throw error;
    throw new RepositoryError("Quiz artifact " + filename + " is malformed", "QUIZ_ARTIFACT_INVALID");
  }
}

export async function writeQuizArtifact<T>(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  filename: QuizArtifactFilename,
  value: T,
): Promise<string> {
  const target = await this.quizArtifactTarget(channelId, product, filename);
  await this.queueEpisodeArtifactMutation(channelId, product, () => this.writeJsonAtomic(target.absolutePath, value));
  return target.relativePath;
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "./errors.js";
import type { QuizArtifactFilename, RepositoryRuntime } from "./runtime.js";

export async function quizArtifactTarget(
  runtime: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: QuizArtifactFilename,
): Promise<{ absolutePath: string; relativePath: string }> {
  const episode = await runtime.getEpisode(channelId, episodeId);
  const channel = await runtime.getChannel(channelId);
  const episodeDirectory = runtime.resolvePath("channels", channel.slug, "episodes", episode.slug);
  await runtime.assertRealPathInside(runtime.roots.channels, episodeDirectory);
  const absolutePath = path.join(episodeDirectory, "quiz", filename);
  return { absolutePath, relativePath: ["channels", channel.slug, "episodes", episode.slug, "quiz", filename].join("/") };
}

export async function readQuizArtifact<T>(
  runtime: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: QuizArtifactFilename,
  schema: { parse(value: unknown): T },
): Promise<T | null> {
  const target = await runtime.quizArtifactTarget(channelId, episodeId, filename);
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
  runtime: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: QuizArtifactFilename,
  value: T,
): Promise<string> {
  const target = await runtime.quizArtifactTarget(channelId, episodeId, filename);
  await runtime.writeJsonAtomic(target.absolutePath, value);
  return target.relativePath;
}

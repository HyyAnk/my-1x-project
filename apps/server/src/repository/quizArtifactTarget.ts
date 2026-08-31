import { readFile } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "./errors.js";
import type { QuizArtifactFilename, RepositoryRuntime } from "./runtime.js";

export async function quizArtifactTarget(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: QuizArtifactFilename,
): Promise<{ absolutePath: string; relativePath: string }> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
  await this.assertRealPathInside(this.roots.channels, episodeDirectory);
  const absolutePath = path.join(episodeDirectory, "quiz", filename);
  return { absolutePath, relativePath: ["channels", channel.slug, "episodes", episode.slug, "quiz", filename].join("/") };
}

export async function readQuizArtifact<T>(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: QuizArtifactFilename,
  schema: { parse(value: unknown): T },
): Promise<T | null> {
  const target = await this.quizArtifactTarget(channelId, episodeId, filename);
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
  episodeId: string,
  filename: QuizArtifactFilename,
  value: T,
): Promise<string> {
  const target = await this.quizArtifactTarget(channelId, episodeId, filename);
  await this.writeJsonAtomic(target.absolutePath, value);
  return target.relativePath;
}

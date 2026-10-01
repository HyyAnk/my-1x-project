import { readFile } from "node:fs/promises";
import { IntroOutroSnapshotSchema, type IntroOutroSnapshot } from "@studio/shared";
import type { PairRepository } from "../quiz/introOutro/pairMedia.js";

export async function readIntroOutroSnapshot(
  repository: PairRepository,
  channelSlug: string,
  episodeId: string,
): Promise<IntroOutroSnapshot | undefined> {
  const file = repository.resolvePath("channels", channelSlug, "intro_outro_selections", `${episodeId}.json`);
  try {
    return IntroOutroSnapshotSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeIntroOutroSnapshot(
  repository: PairRepository,
  channelSlug: string,
  episodeId: string,
  snapshot: IntroOutroSnapshot,
): Promise<void> {
  await repository.writeJsonAtomic(
    repository.resolvePath("channels", channelSlug, "intro_outro_selections", `${episodeId}.json`),
    snapshot,
  );
}

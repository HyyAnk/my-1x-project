import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import type { IntroOutroStyle } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";

export type ReadyPair = { style: IntroOutroStyle; introSourcePath: string; outroSourcePath: string };
export type PairRepository = Pick<
  RepositoryService,
  | "getIntroOutroClipPath"
  | "getChannelIntroOutroStyle"
  | "listChannelIntroOutroStyles"
  | "resolvePath"
  | "queueEpisodeArtifactMutation"
  | "writeJsonAtomic"
>;

export async function readyPair(repository: PairRepository, channelId: string, style: IntroOutroStyle): Promise<ReadyPair | null> {
  if (style.status !== "active") return null;
  try {
    const [introSourcePath, outroSourcePath] = await Promise.all([
      repository.getIntroOutroClipPath(channelId, style.style_id, "intro"),
      repository.getIntroOutroClipPath(channelId, style.style_id, "outro"),
    ]);
    return { style, introSourcePath, outroSourcePath };
  } catch (error) {
    if (error instanceof Error && "code" in error && ["ENOENT", "INTRO_OUTRO_CLIP_NOT_FOUND", "NOT_FOUND"].includes(String(error.code)))
      return null;
    throw error;
  }
}

async function hashFile(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(Buffer.from(chunk as Uint8Array));
  return hash.digest("hex");
}

export async function pairFingerprint(pair: ReadyPair): Promise<string> {
  const hashes = await Promise.all([hashFile(pair.introSourcePath), hashFile(pair.outroSourcePath)]);
  return createHash("sha256")
    .update(
      JSON.stringify({
        hashes,
        intro: pair.style.intro,
        outro: pair.style.outro,
        transition: pair.style.transition_type,
        transitionDuration: pair.style.transition_duration_seconds,
      }),
    )
    .digest("hex");
}

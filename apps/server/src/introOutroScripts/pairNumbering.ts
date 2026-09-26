import path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { RepositoryService } from "../repository.js";
import { isMissingFile } from "./repositories/storage.js";

// Caller holds the channel pair-creation lock across allocation and metadata save.
export async function allocatePairName(repository: RepositoryService, channelId: string, category: string): Promise<string> {
  const channel = await repository.getChannel(channelId);
  const filename = repository.resolvePath("channels", channel.slug, "intro_outro_styles", "pair-sequences.json");
  let counters: Record<string, number> = {};
  try {
    counters = z.record(z.number().int().nonnegative()).parse(JSON.parse(await readFile(filename, "utf8")));
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
  const styles = await repository.listChannelIntroOutroStyles(channelId);
  const highest = styles
    .filter((style) => style.style_preset_id === category && /^\d+$/.test(style.name))
    .reduce((max, style) => Math.max(max, Number(style.name)), 0);
  const next = Math.max(counters[category] ?? 0, highest) + 1;
  await repository.writeJsonAtomic(path.resolve(filename), { ...counters, [category]: next });
  return String(next).padStart(3, "0");
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ExportsManifestSchema, nowIso, type ExportsManifest, type ExportsManifestItem } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";

export interface UpdateExportsManifestOptions {
  repository: RepositoryService;
  channelId: string;
  item: ExportsManifestItem;
}

const MANIFEST_FILENAME = "exports_manifest.json";

export async function updateExportsManifest(options: UpdateExportsManifestOptions): Promise<string> {
  const { repository, channelId, item } = options;
  const channel = await repository.getChannel(channelId);
  const manifestPath = repository.resolvePath("channels", channel.slug, MANIFEST_FILENAME);

  let manifest: ExportsManifest;
  try {
    const raw = await readFile(manifestPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    manifest = ExportsManifestSchema.parse(parsed);
  } catch {
    manifest = {
      channel_id: channel.channel_id,
      channel_slug: channel.slug,
      updated_at: nowIso(),
      episodes: [],
    };
  }

  const existingIndex = manifest.episodes.findIndex((e) => e.episode_id === item.episode_id);
  if (existingIndex >= 0) {
    manifest.episodes[existingIndex] = item;
  } else {
    manifest.episodes.push(item);
  }

  manifest.updated_at = nowIso();
  await repository.writeJsonAtomic(manifestPath, manifest);
  return path.relative(repository.rootDirectory, manifestPath).replace(/\\/g, "/");
}

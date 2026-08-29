import { access, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { EpisodeSchema, nowIso, type Episode } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { allowedEpisodeFiles } from "./helpers.js";
import type { RepositoryRuntime } from "./runtime.js";

export async function deleteChannel(this: RepositoryRuntime, channelId: string, confirmed = true): Promise<void> {
  if (!confirmed) throw new RepositoryError("Delete confirmation is required", "CONFIRMATION_REQUIRED");
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug);
  await this.removeTree(directory);
}

export async function deleteEpisode(this: RepositoryRuntime, channelId: string, episodeId: string, confirmed = true): Promise<void> {
  if (!confirmed) throw new RepositoryError("Delete confirmation is required", "CONFIRMATION_REQUIRED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const episodesRoot = this.resolvePath("channels", channel.slug, "episodes");
  const directory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
  await this.assertRealPathInside(episodesRoot, directory);
  await this.removeTree(directory);
  await this.updateChannel(channelId, { updated_at: nowIso() });
}

export async function getChannelDna(
  this: RepositoryRuntime,
  channelId: string,
): Promise<{ content: string; path: string; modified_at: string }> {
  const channel = await this.getChannel(channelId);
  const absolutePath = this.resolvePath("channels", channel.slug, "channel_dna.md");
  const [content, metadata] = await Promise.all([readFile(absolutePath, "utf8"), stat(absolutePath)]);
  return { content, path: channel.channel_dna_path, modified_at: metadata.mtime.toISOString() };
}

export async function saveChannelDna(
  this: RepositoryRuntime,
  channelId: string,
  content: string,
): Promise<{ path: string; modified_at: string }> {
  const channel = await this.getChannel(channelId);
  if (!content.trim()) throw new RepositoryError("Channel DNA cannot be empty", "INVALID_DNA");
  const absolutePath = this.resolvePath("channels", channel.slug, "channel_dna.md");
  await this.writeTextAtomic(absolutePath, content.endsWith("\n") ? content : `${content}\n`);
  await this.updateChannel(channelId, { status: channel.status === "DRAFT" ? "ACTIVE" : channel.status });
  const metadata = await stat(absolutePath);
  return { path: channel.channel_dna_path, modified_at: metadata.mtime.toISOString() };
}

export async function resetChannelDna(
  this: RepositoryRuntime,
  channelId: string,
): Promise<{ content: string; path: string; modified_at: string }> {
  const channel = await this.getChannel(channelId);
  const templateName = channel.group_id === "quiz" ? "quiz_channel_dna.md" : "example_channel_dna.md";
  const dna = await this.getTemplate(templateName);
  const dnaContent = dna
    .replace("- Channel name: ", `- Channel name: ${channel.display_name}`)
    .replace("- Primary audience: ", `- Primary audience: ${channel.target_audience || "Children and families"}`)
    .replace("- Market: ", `- Market: ${channel.market || channel.country || "Global"}`)
    .replace("- Language: ", `- Language: ${channel.language || "English"}`)
    .replace(
      "Describe the quiz channel territory in one clear paragraph.",
      channel.description || "A playful, fact-checked quiz channel that turns broad knowledge into short moments of discovery.",
    );
  const absolutePath = this.resolvePath("channels", channel.slug, "channel_dna.md");
  await this.writeTextAtomic(absolutePath, `${dnaContent.trim()}\n`);
  const metadata = await stat(absolutePath);
  return { content: dnaContent.trim(), path: channel.channel_dna_path, modified_at: metadata.mtime.toISOString() };
}

export async function listEpisodes(this: RepositoryRuntime, channelId: string): Promise<Episode[]> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "episodes");
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  const episodes: Episode[] = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    try {
      const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", entry.name);
      await this.assertRealPathInside(path.join(this.resolvePath("channels", channel.slug), "episodes"), episodeDirectory);
      const episode = EpisodeSchema.parse(JSON.parse(await readFile(path.join(episodeDirectory, "episode.json"), "utf8")));
      episodes.push(episode);
    } catch {
      // Ignore incomplete episode directories and keep the rest visible.
    }
  }
  return episodes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getEpisode(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<Episode> {
  const episodes = await this.listEpisodes(channelId);
  const episode = episodes.find((item) => item.episode_id === episodeId);
  if (!episode) throw new RepositoryError("Episode not found", "EPISODE_NOT_FOUND");
  return episode;
}

export async function getEpisodeFile(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: string,
): Promise<{ content: string; path: string; modified_at: string }> {
  if (!allowedEpisodeFiles.has(filename)) throw new RepositoryError("Unsupported episode file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, filename);
  try {
    const [content, metadata] = await Promise.all([readFile(absolutePath, "utf8"), stat(absolutePath)]);
    return { content, path: `channels/${channel.slug}/episodes/${episode.slug}/${filename}`, modified_at: metadata.mtime.toISOString() };
  } catch {
    return { content: "", path: `channels/${channel.slug}/episodes/${episode.slug}/${filename}`, modified_at: "" };
  }
}

export async function saveEpisodeFile(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: string,
  content: string,
): Promise<{ path: string; modified_at: string }> {
  if (!allowedEpisodeFiles.has(filename)) throw new RepositoryError("Unsupported episode file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, filename);
  await this.writeTextAtomic(absolutePath, content.endsWith("\n") ? content : `${content}\n`);
  const updated = EpisodeSchema.parse({
    ...episode,
    ...(filename === "script.md"
      ? {
          narration_asset_path: null,
          narration_generated_at: null,
          narration_duration_seconds: null,
          narration_segment_count: 0,
          measured_narration_words_per_second: null,
        }
      : {}),
    updated_at: nowIso(),
  });
  await this.writeJsonAtomic(path.join(path.dirname(absolutePath), "episode.json"), updated);
  if (["research.md", "treatment.md", "script.md", "visual_bible.md"].includes(filename))
    await this.invalidateQuizSourceArtifacts(channelId, episodeId);
  const metadata = await stat(absolutePath);
  return { path: `channels/${channel.slug}/episodes/${episode.slug}/${filename}`, modified_at: metadata.mtime.toISOString() };
}

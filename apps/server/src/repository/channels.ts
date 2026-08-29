import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ChannelSchema, makeId, nowIso, type Channel, type CreateChannelInput } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";

export async function listChannels(this: RepositoryRuntime, includeArchived = true): Promise<Channel[]> {
  await this.ensureBootstrap();
  const entries = await readdir(this.roots.channels, { withFileTypes: true });
  const channels: Channel[] = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    try {
      const channel = await this.readChannelBySlug(entry.name);
      if (includeArchived || channel.status !== "ARCHIVED") channels.push(channel);
    } catch {
      // An incomplete directory should not hide every other channel from the UI.
    }
  }
  return channels.sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export async function getChannel(this: RepositoryRuntime, channelId: string): Promise<Channel> {
  const channels = await this.listChannels(true);
  const channel = channels.find((item) => item.channel_id === channelId);
  if (!channel) throw new RepositoryError("Channel not found", "CHANNEL_NOT_FOUND");
  return channel;
}

export async function getChannelBySlug(this: RepositoryRuntime, slug: string): Promise<Channel> {
  return this.readChannelBySlug(this.assertSlug(slug));
}

export async function readChannelBySlug(this: RepositoryRuntime, slug: string): Promise<Channel> {
  const directory = this.resolvePath("channels", this.assertSlug(slug));
  await this.assertRealPathInside(this.roots.channels, directory);
  const metadataPath = path.join(directory, "channel.json");
  const raw = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
  const metadata = ChannelSchema.parse(raw);
  const episodes = await this.safeEpisodeCount(directory);
  return ChannelSchema.parse({ ...metadata, episode_count: episodes });
}

export async function safeEpisodeCount(_channelDirectory: string): Promise<number> {
  try {
    const entries = await readdir(path.join(_channelDirectory, "episodes"), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).length;
  } catch {
    return 0;
  }
}

export async function createChannel(this: RepositoryRuntime, input: CreateChannelInput): Promise<Channel> {
  await this.ensureBootstrap();
  const slug = await this.uniqueSlug(input.name, this.roots.channels);
  const channelId = makeId("ch");
  const timestamp = nowIso();
  const directory = this.resolvePath("channels", slug);
  await mkdir(path.join(directory, "topics"), { recursive: true });
  await mkdir(path.join(directory, "episodes"), { recursive: true });
  await mkdir(path.join(directory, "assets"), { recursive: true });
  await writeFile(path.join(directory, "topic_database.json"), "[]\n", "utf8");

  const dna = await this.getTemplate(input.group_id === "quiz" ? "quiz_channel_dna.md" : "example_channel_dna.md");
  const styleGuide = await this.getTemplate("example_style_guide.md");
  const dnaContent =
    input.dna_mode === "upload" && input.dna_content?.trim()
      ? input.dna_content
      : dna
          .replace("- Channel name: ", `- Channel name: ${input.name}`)
          .replace("- Primary audience: ", `- Primary audience: ${input.target_audience}`)
          .replace("- Market: ", `- Market: ${input.market}`)
          .replace("- Language: ", `- Language: ${input.language}`)
          .replace(
            "Describe the channel's documentary territory in one clear paragraph.",
            input.description || "A playful, fact-checked quiz channel that turns broad knowledge into short moments of discovery.",
          )
          .replace(
            "Describe the quiz channel territory in one clear paragraph.",
            input.description || "A playful, fact-checked quiz channel that turns broad knowledge into short moments of discovery.",
          );
  await writeFile(path.join(directory, "channel_dna.md"), `${dnaContent.trim()}\n`, "utf8");
  await writeFile(path.join(directory, "style_guide.md"), `${styleGuide.trim()}\n`, "utf8");

  const channelCountry = input.country || input.market || "GLOBAL";
  const channel = ChannelSchema.parse({
    channel_id: channelId,
    slug,
    display_name: input.name,
    description: input.description,
    target_audience: input.target_audience,
    language: input.language,
    country: channelCountry,
    market: input.market || channelCountry,
    channel_dna_path: `channels/${slug}/channel_dna.md`,
    style_guide_path: `channels/${slug}/style_guide.md`,
    status: "DRAFT",
    created_at: timestamp,
    updated_at: timestamp,
    episode_count: 0,
    group_id: "quiz",
    engine: "quiz",
  });
  await this.writeJsonAtomic(path.join(directory, "channel.json"), channel);
  return channel;
}

export async function updateChannel(this: RepositoryRuntime, channelId: string, patch: Partial<Channel>): Promise<Channel> {
  const current = await this.getChannel(channelId);
  const next = ChannelSchema.parse({ ...current, ...patch, updated_at: nowIso() });
  await this.writeJsonAtomic(this.resolvePath("channels", current.slug, "channel.json"), next);
  return next;
}

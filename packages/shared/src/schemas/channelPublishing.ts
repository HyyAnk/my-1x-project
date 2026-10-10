import { z } from "zod";

export const CHANNEL_ABOUT_TEXT_MAX_LENGTH = 300;
export const CHANNEL_PLAYLIST_LINKS_MAX = 20;

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && YOUTUBE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export const YouTubeUrlSchema = z
  .string()
  .trim()
  .refine(isYouTubeUrl, { message: "Must be an https://youtube.com or https://youtu.be link" });

export const ChannelPlaylistLinkSchema = z.object({
  title: z.string().trim().min(1).max(100),
  url: YouTubeUrlSchema,
});

export type ChannelPlaylistLink = z.infer<typeof ChannelPlaylistLinkSchema>;

/** Public YouTube links and copy appended to every generated episode description. */
export const ChannelPublishingProfileSchema = z.object({
  channel_url: YouTubeUrlSchema.optional(),
  about_text: z.string().trim().max(CHANNEL_ABOUT_TEXT_MAX_LENGTH).default(""),
  playlists: z.array(ChannelPlaylistLinkSchema).max(CHANNEL_PLAYLIST_LINKS_MAX).default([]),
});

export type ChannelPublishingProfile = z.infer<typeof ChannelPublishingProfileSchema>;

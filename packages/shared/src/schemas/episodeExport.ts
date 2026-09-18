import { z } from "zod";

export const EpisodeExportStatusSchema = z.enum(["ready", "published", "archived"]).default("ready");
export type EpisodeExportStatus = z.infer<typeof EpisodeExportStatusSchema>;

export const EpisodeExportMetadataSchema = z.object({
  channel_id: z.string().min(1),
  channel_slug: z.string().min(1),
  episode_id: z.string().min(1),
  episode_slug: z.string().min(1),
  title: z.string().min(1),
  status: EpisodeExportStatusSchema,
  duration_seconds: z.number().nonnegative(),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  video_file: z.string().default("quiz-video.mp4"),
  primary_thumbnail: z.string().nullable().default(null),
  available_thumbnails: z.array(z.string()).default([]),
  description_file: z.string().default("description.txt"),
  tags: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  category: z.string().optional(),
  rendered_at: z.string(),
  exported_at: z.string(),
});

export type EpisodeExportMetadata = z.infer<typeof EpisodeExportMetadataSchema>;

export const ExportsManifestItemSchema = z.object({
  episode_id: z.string().min(1),
  episode_slug: z.string().min(1),
  title: z.string().min(1),
  status: EpisodeExportStatusSchema,
  duration_seconds: z.number().nonnegative(),
  export_directory: z.string().min(1),
  video_file: z.string().min(1),
  primary_thumbnail: z.string().nullable().default(null),
  exported_at: z.string(),
});

export type ExportsManifestItem = z.infer<typeof ExportsManifestItemSchema>;

export const ExportsManifestSchema = z.object({
  channel_id: z.string().min(1),
  channel_slug: z.string().min(1),
  updated_at: z.string(),
  episodes: z.array(ExportsManifestItemSchema).default([]),
});

export type ExportsManifest = z.infer<typeof ExportsManifestSchema>;

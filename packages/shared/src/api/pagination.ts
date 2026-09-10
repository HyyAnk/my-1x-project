import { z } from "zod";
import type { Episode } from "../schemas/episode.js";
import type { ShortReelRecord } from "../shortReel/shortReel.types.js";

export const PaginationSortSchema = z.enum(["updated_desc", "updated_asc", "created_desc", "created_asc", "title_asc", "title_desc"]);
export type PaginationSort = z.infer<typeof PaginationSortSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sort: z.string().trim().optional(),
  status: z.string().trim().optional(),
  projection: z.enum(["full", "lightweight"]).optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  limit: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  pagination: PaginationMeta;
}

export const EpisodeMetadataProjectionSchema = z.object({
  episode_id: z.string().min(1),
  channel_id: z.string().min(1),
  slug: z.string().min(1),
  stage: z.string(),
  title: z.string(),
  target_duration_minutes: z.number(),
  narration_duration_seconds: z.number().nullable(),
  video_duration_seconds: z.number().nullable(),
  thumbnail_asset_path_16_9: z.string().nullable(),
  thumbnail_asset_path_9_16: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EpisodeMetadataProjection = z.infer<typeof EpisodeMetadataProjectionSchema>;

export const ShortReelMetadataProjectionSchema = z.object({
  reel_id: z.string().min(1),
  channel_id: z.string().min(1),
  topic_id: z.string().min(1),
  title: z.string(),
  aspect_ratio: z.literal("9:16"),
  revision: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
  units: z.record(z.string(), z.object({ state: z.string() })),
});
export type ShortReelMetadataProjection = z.infer<typeof ShortReelMetadataProjectionSchema>;

export interface PaginatedEpisodesResponse {
  episodes: (Episode | EpisodeMetadataProjection)[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  pagination?: PaginationMeta;
}

export interface PaginatedShortReelsResponse {
  short_reels: (ShortReelRecord | ShortReelMetadataProjection)[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  pagination?: PaginationMeta;
}

export function calculatePaginationMeta(params: {
  total: number;
  page?: number;
  limit?: number;
  isPaginatedRequest: boolean;
}): PaginationMeta {
  const { total, page, limit, isPaginatedRequest } = params;
  if (!isPaginatedRequest) {
    return {
      total,
      page: 1,
      limit: total,
      total_pages: 1,
    };
  }

  const pageNum = Math.max(1, page ?? 1);
  const limitNum = Math.max(1, limit ?? 20);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limitNum);

  return {
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: totalPages,
  };
}

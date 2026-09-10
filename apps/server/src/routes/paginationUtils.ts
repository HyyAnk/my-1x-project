import type {
  Episode,
  EpisodeMetadataProjection,
  PaginatedResult,
  PaginationMeta,
  PaginationQuery,
  ShortReelMetadataProjection,
  ShortReelRecord,
} from "@studio/shared";

export interface PaginationFilterOptions<T> {
  getTitle: (item: T) => string;
  getCreatedAt: (item: T) => string;
  getUpdatedAt: (item: T) => string;
  matchesStatus?: (item: T, status: string) => boolean;
  getAdditionalSearchText?: (item: T) => string;
}

function applySearchFilter<T>(items: T[], query: PaginationQuery, options: PaginationFilterOptions<T>): T[] {
  if (!query.search) return items;
  const term = query.search.toLowerCase();
  return items.filter((item) => {
    const title = options.getTitle(item).toLowerCase();
    const additional = options.getAdditionalSearchText?.(item)?.toLowerCase() ?? "";
    return title.includes(term) || additional.includes(term);
  });
}

function applyStatusFilter<T>(items: T[], query: PaginationQuery, options: PaginationFilterOptions<T>): T[] {
  if (!query.status || !options.matchesStatus) return items;
  return items.filter((item) => options.matchesStatus!(item, query.status!));
}

function applySort<T>(items: T[], sort: string | undefined, options: PaginationFilterOptions<T>): T[] {
  const order = sort ?? "updated_desc";
  const cloned = [...items];

  return cloned.sort((a, b) => {
    switch (order) {
      case "updated_asc":
        return options.getUpdatedAt(a).localeCompare(options.getUpdatedAt(b));
      case "created_desc":
        return options.getCreatedAt(b).localeCompare(options.getCreatedAt(a));
      case "created_asc":
        return options.getCreatedAt(a).localeCompare(options.getCreatedAt(b));
      case "title_asc":
        return options.getTitle(a).localeCompare(options.getTitle(b));
      case "title_desc":
        return options.getTitle(b).localeCompare(options.getTitle(a));
      case "updated_desc":
      default:
        return options.getUpdatedAt(b).localeCompare(options.getUpdatedAt(a));
    }
  });
}

export function paginateCollection<T>(items: T[], query: PaginationQuery, options: PaginationFilterOptions<T>): PaginatedResult<T> {
  const searched = applySearchFilter(items, query, options);
  const filtered = applyStatusFilter(searched, query, options);
  const sorted = applySort(filtered, query.sort, options);

  const isPaginated = query.page !== undefined || query.limit !== undefined;

  if (!isPaginated) {
    const total = sorted.length;
    const pagination: PaginationMeta = {
      total,
      page: 1,
      limit: total,
      total_pages: 1,
    };
    return { items: sorted, total, page: 1, limit: total, total_pages: 1, pagination };
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.max(1, query.limit ?? 20);
  const total = sorted.length;
  const total_pages = total === 0 ? 0 : Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const pagedItems = sorted.slice(offset, offset + limit);

  const pagination: PaginationMeta = { total, page, limit, total_pages };
  return { items: pagedItems, total, page, limit, total_pages, pagination };
}

export function projectEpisodeMetadata(ep: Episode): EpisodeMetadataProjection {
  return {
    episode_id: ep.episode_id,
    channel_id: ep.channel_id,
    slug: ep.slug,
    stage: ep.stage,
    title: ep.topic?.title ?? "",
    target_duration_minutes: ep.target_duration_minutes,
    narration_duration_seconds: ep.narration_duration_seconds,
    video_duration_seconds: ep.video_duration_seconds,
    thumbnail_asset_path_16_9: ep.thumbnail_asset_path_16_9,
    thumbnail_asset_path_9_16: ep.thumbnail_asset_path_9_16,
    created_at: ep.created_at,
    updated_at: ep.updated_at,
  };
}

export function projectShortReelMetadata(reel: ShortReelRecord): ShortReelMetadataProjection {
  const unitStates: Record<string, { state: string }> = {};
  for (const [key, unit] of Object.entries(reel.units)) {
    unitStates[key] = { state: unit.state };
  }
  return {
    reel_id: reel.reel_id,
    channel_id: reel.channel_id,
    topic_id: reel.topic_id,
    title: reel.topic?.title ?? "",
    aspect_ratio: reel.aspect_ratio,
    revision: reel.revision,
    created_at: reel.created_at,
    updated_at: reel.updated_at,
    units: unitStates,
  };
}

export function paginateEpisodes(episodes: Episode[], query: PaginationQuery): PaginatedResult<Episode | EpisodeMetadataProjection> {
  const options: PaginationFilterOptions<Episode> = {
    getTitle: (ep) => ep.topic?.title ?? "",
    getCreatedAt: (ep) => ep.created_at,
    getUpdatedAt: (ep) => ep.updated_at,
    getAdditionalSearchText: (ep) => `${ep.slug} ${ep.episode_id} ${ep.topic?.premise ?? ""}`,
    matchesStatus: (ep, status) => ep.stage.toLowerCase() === status.toLowerCase(),
  };

  const result = paginateCollection(episodes, query, options);
  if (query.projection === "lightweight") {
    const projected = result.items.map(projectEpisodeMetadata);
    return { ...result, items: projected };
  }
  return result;
}

export function paginateShortReels(
  reels: ShortReelRecord[],
  query: PaginationQuery,
): PaginatedResult<ShortReelRecord | ShortReelMetadataProjection> {
  const options: PaginationFilterOptions<ShortReelRecord> = {
    getTitle: (reel) => reel.topic?.title ?? "",
    getCreatedAt: (reel) => reel.created_at,
    getUpdatedAt: (reel) => reel.updated_at,
    getAdditionalSearchText: (reel) => `${reel.reel_id} ${reel.topic_id} ${reel.topic?.premise ?? ""}`,
    matchesStatus: (reel, status) => {
      const s = status.toLowerCase();
      if (s === "ready") {
        return Object.values(reel.units).every((u) => u.state === "ready") || reel.units.publishing.state === "ready";
      }
      if (s === "draft") {
        return Object.values(reel.units).every((u) => u.state === "missing") || !reel.script;
      }
      if (s === "generating" || s === "pending") {
        return Object.values(reel.units).some((u) => u.state === "pending");
      }
      if (s === "failed") {
        return Object.values(reel.units).some((u) => u.state === "failed");
      }
      if (s === "missing") {
        return Object.values(reel.units).some((u) => u.state === "missing");
      }
      if (reel.units.publishing.state?.toLowerCase() === s) return true;
      return Object.values(reel.units).some((u) => u.state?.toLowerCase() === s);
    },
  };

  const result = paginateCollection(reels, query, options);
  if (query.projection === "lightweight") {
    const projected = result.items.map(projectShortReelMetadata);
    return { ...result, items: projected };
  }
  return result;
}

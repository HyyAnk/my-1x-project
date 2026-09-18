import type { Page } from "../../components/types";

export type RouteState = {
  page: Page;
  channelId: string | null;
  episodeId: string | null;
  shortReelId: string | null;
  mascotId: string | null;
  step: number | null;
  tab: string | null;
  group: string | null;
  rawHash: string;
};

export function parseHash(hash: string): RouteState {
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart = "", queryPart = ""] = cleanHash.split("?");

  const queryParams = new URLSearchParams(queryPart);
  const tab = queryParams.get("tab");
  const group = queryParams.get("group");
  const stepParam = queryParams.get("step");
  const parsedStep = stepParam ? parseInt(stepParam, 10) : null;
  const step = parsedStep && parsedStep >= 1 && parsedStep <= 4 ? parsedStep : null;

  // Normalize path segments, ignoring empty strings
  const segments = pathPart
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  const root = segments[0] || "dashboard";

  if (root === "dashboard" || root === "") {
    return {
      page: "dashboard",
      channelId: null,
      episodeId: null,
      shortReelId: null,
      mascotId: null,
      step: null,
      tab,
      group,
      rawHash: hash,
    };
  }

  if (root === "mascots") {
    return parseMascotRoute(segments, queryParams, tab, step, group, hash);
  }

  if (root === "tasks" || root === "settings" || root === "sandbox" || root === "question_bank" || root === "question-bank") {
    return {
      page: root === "question-bank" ? "question_bank" : root,
      channelId: null,
      episodeId: null,
      shortReelId: null,
      mascotId: null,
      step: null,
      tab,
      group,
      rawHash: hash,
    };
  }

  if (root === "channels") {
    return parseChannelRoute(segments, tab, group, hash);
  }

  // Fallback to dashboard
  return {
    page: "dashboard",
    channelId: null,
    episodeId: null,
    shortReelId: null,
    mascotId: null,
    step: null,
    tab,
    group,
    rawHash: hash,
  };
}

function parseMascotRoute(
  segments: string[],
  queryParams: URLSearchParams,
  tab: string | null,
  step: number | null,
  group: string | null,
  hash: string,
): RouteState {
  const rawMascotId = segments[1] ? decodeURIComponent(segments[1]) : queryParams.get("mascotId") || queryParams.get("id");
  const mascotId = rawMascotId ? rawMascotId.trim() : null;
  const effectiveTab = tab ?? (mascotId ? "generator" : "library");

  return {
    page: "mascots",
    channelId: null,
    episodeId: null,
    shortReelId: null,
    mascotId,
    step,
    tab: effectiveTab,
    group,
    rawHash: hash,
  };
}

function parseChannelRoute(segments: string[], tab: string | null, group: string | null, hash: string): RouteState {
  const channelId = segments[1] ? decodeURIComponent(segments[1]) : null;
  const isEpisodesSegment = segments[2] === "episodes";
  const episodeId = isEpisodesSegment && segments[3] ? decodeURIComponent(segments[3]) : null;
  const isShortReelsSegment = segments[2] === "short-reels";
  const shortReelId = isShortReelsSegment && segments[3] ? decodeURIComponent(segments[3]) : null;

  const effectiveTab = tab ?? (isShortReelsSegment && !shortReelId ? "short-reels" : null);

  return {
    page: "channels",
    channelId,
    episodeId,
    shortReelId,
    mascotId: null,
    step: null,
    tab: effectiveTab,
    group,
    rawHash: hash,
  };
}

export function buildHash(state: {
  page: Page;
  channelId?: string | null;
  episodeId?: string | null;
  shortReelId?: string | null;
  mascotId?: string | null;
  step?: number | null;
  tab?: string | null;
  group?: string | null;
}): string {
  let path = `/${state.page}`;
  if (state.page === "channels" && state.channelId) {
    path = `/channels/${encodeURIComponent(state.channelId)}`;
    if (state.shortReelId) {
      path += `/short-reels/${encodeURIComponent(state.shortReelId)}`;
    } else if (state.episodeId) {
      path += `/episodes/${encodeURIComponent(state.episodeId)}`;
    }
  } else if (state.page === "mascots" && state.mascotId) {
    path = `/mascots/${encodeURIComponent(state.mascotId)}`;
  }

  const params = new URLSearchParams();
  if (state.tab && !(state.page === "mascots" && state.mascotId)) params.set("tab", state.tab);
  if (state.step) params.set("step", String(state.step));
  if (state.group) params.set("group", state.group);

  const queryString = params.toString();
  return `#${path}${queryString ? `?${queryString}` : ""}`;
}

export function openInNewTab(to: string) {
  if (!to) return;
  const targetHash = to.startsWith("#") ? to : `#${to}`;
  const url = new URL(window.location.href);
  url.hash = targetHash;
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

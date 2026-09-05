import type { Page } from "../../components/types";

export type RouteState = {
  page: Page;
  channelId: string | null;
  episodeId: string | null;
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
      tab,
      group,
      rawHash: hash,
    };
  }

  if (root === "tasks" || root === "settings" || root === "mascots" || root === "sandbox" || root === "question_bank" || root === "question-bank") {
    return {
      page: root === "question-bank" ? "question_bank" : (root as Page),
      channelId: null,
      episodeId: null,
      tab,
      group,
      rawHash: hash,
    };
  }

  if (root === "channels") {
    const channelId = segments[1] ? decodeURIComponent(segments[1]) : null;
    const isEpisodesSegment = segments[2] === "episodes";
    const episodeId = isEpisodesSegment && segments[3] ? decodeURIComponent(segments[3]) : null;

    return {
      page: "channels",
      channelId,
      episodeId,
      tab,
      group,
      rawHash: hash,
    };
  }

  // Fallback to dashboard
  return {
    page: "dashboard",
    channelId: null,
    episodeId: null,
    tab,
    group,
    rawHash: hash,
  };
}

export function buildHash(state: {
  page: Page;
  channelId?: string | null;
  episodeId?: string | null;
  tab?: string | null;
  group?: string | null;
}): string {
  let path = `/${state.page}`;
  if (state.page === "channels" && state.channelId) {
    path = `/channels/${encodeURIComponent(state.channelId)}`;
    if (state.episodeId) {
      path += `/episodes/${encodeURIComponent(state.episodeId)}`;
    }
  }

  const params = new URLSearchParams();
  if (state.tab) params.set("tab", state.tab);
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

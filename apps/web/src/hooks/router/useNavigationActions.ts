import { useCallback } from "react";
import type { Page } from "../../components/types";
import { openInNewTab } from "./hashCodec";

export function getNavProps(to: string, onNavigate?: () => void) {
  const hash = to.startsWith("#") ? to : `#${to}`;
  return {
    href: hash,
    "data-nav-href": hash,
    onClick: (e: React.MouseEvent) => {
      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onNavigate?.();
      }
    },
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    },
    onAuxClick: (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        openInNewTab(hash);
      }
    },
  };
}

export function useNavigationActions(navigate: (to: string, replace?: boolean) => void) {
  const openPage = useCallback(
    (page: Page) => {
      if (page === "channels") {
        navigate("/channels");
      } else {
        navigate(`/${page}`);
      }
    },
    [navigate],
  );

  const openChannel = useCallback(
    (channelId: string, tab?: string) => {
      if (!channelId) {
        navigate("/channels");
        return;
      }
      const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
      navigate(`/channels/${encodeURIComponent(channelId)}${query}`);
    },
    [navigate],
  );

  const openEpisode = useCallback(
    (channelId: string, episodeId: string, tab?: string) => {
      const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
      navigate(`/channels/${encodeURIComponent(channelId)}/episodes/${encodeURIComponent(episodeId)}${query}`);
    },
    [navigate],
  );

  const setQueryParam = useCallback(
    (key: string, value: string | null, replace = true) => {
      const currentHash = window.location.hash || "#/dashboard";
      const [pathPart = "", queryPart = ""] = (currentHash.startsWith("#") ? currentHash.slice(1) : currentHash).split("?");
      const params = new URLSearchParams(queryPart);

      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      const nextQuery = params.toString();
      const nextHash = `#${pathPart}${nextQuery ? `?${nextQuery}` : ""}`;
      navigate(nextHash, replace);
    },
    [navigate],
  );

  return {
    openPage,
    openChannel,
    openEpisode,
    setQueryParam,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseHash, buildHash, openInNewTab, type RouteState } from "./router/hashCodec";
import { getNavProps, useNavigationActions } from "./router/useNavigationActions";

export { parseHash, buildHash, openInNewTab, getNavProps, type RouteState };

export function useRouter() {
  const [route, setRoute] = useState<RouteState>(() => parseHash(window.location.hash || "#/dashboard"));

  useEffect(() => {
    // Ensure initial hash exists
    if (!window.location.hash) {
      window.location.replace("#/dashboard");
    }

    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    const getNavHref = (target: HTMLElement | null): string | null => {
      if (!target) return null;
      const el = target.closest("a[href], [data-nav-href], [data-href]");
      if (!el) return null;
      const href = el.getAttribute("data-nav-href") || el.getAttribute("data-href") || el.getAttribute("href");
      return href && href !== "#" && !href.startsWith("javascript:") ? href : null;
    };

    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        const href = getNavHref(e.target as HTMLElement);
        if (href) {
          e.preventDefault();
        }
      }
    };

    const handleGlobalAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        const href = getNavHref(e.target as HTMLElement);
        if (href) {
          e.preventDefault();
          e.stopPropagation();
          openInNewTab(href);
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    window.addEventListener("mousedown", handleGlobalMouseDown);
    window.addEventListener("auxclick", handleGlobalAuxClick);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
      window.removeEventListener("mousedown", handleGlobalMouseDown);
      window.removeEventListener("auxclick", handleGlobalAuxClick);
    };
  }, []);

  const navigate = useCallback((to: string, replace = false) => {
    const targetHash = to.startsWith("#") ? to : `#${to}`;
    if (replace) {
      const url = new URL(window.location.href);
      url.hash = targetHash;
      window.location.replace(url.toString());
    } else {
      window.location.hash = targetHash;
    }
    setRoute(parseHash(targetHash));
  }, []);

  const actions = useNavigationActions(navigate);

  return useMemo(
    () => ({
      route,
      page: route.page,
      channelId: route.channelId,
      episodeId: route.episodeId,
      tab: route.tab,
      group: route.group,
      navigate,
      ...actions,
    }),
    [route, navigate, actions],
  );
}

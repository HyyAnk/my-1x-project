import type { ChannelAssetsOverviewResponse } from "@studio/shared";
import type { CategoryReadiness, ReadinessStatus } from "../types";

export function calculateCategoryReadiness(
  overview?: ChannelAssetsOverviewResponse | null,
): CategoryReadiness {
  if (!overview?.manifest) {
    return {
      logoStatus: "missing",
      youtubeStatus: "missing",
      xStatus: "missing",
      artCount: 0,
    };
  }

  const { manifest } = overview;
  const logoStatus = manifest.brand?.logo ? "configured" : "missing";

  const yt = manifest.social?.youtube;
  const ytAvatar = Boolean(yt?.avatar);
  const ytBanner = Boolean(yt?.banner);
  const youtubeStatus: ReadinessStatus =
    ytAvatar && ytBanner ? "configured" : ytAvatar || ytBanner ? "incomplete" : "missing";

  const x = manifest.social?.x;
  const xAvatar = Boolean(x?.avatar);
  const xBanner = Boolean(x?.banner);
  const xStatus: ReadinessStatus =
    xAvatar && xBanner ? "configured" : xAvatar || xBanner ? "incomplete" : "missing";

  const artCount = Array.isArray(manifest.art) ? manifest.art.length : 0;

  return {
    logoStatus,
    youtubeStatus,
    xStatus,
    artCount,
  };
}

export function formatReadinessLabel(status: ReadinessStatus): string {
  switch (status) {
    case "configured":
      return "Configured";
    case "incomplete":
      return "Incomplete";
    case "missing":
    default:
      return "Missing";
  }
}

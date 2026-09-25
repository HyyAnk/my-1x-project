import type { MascotAnimationRevision } from "@studio/shared";

/** Pin mutable artifact aliases to the approved attempt, including legacy revisions. */
export function pinRevisionArtifactUrls(revision: MascotAnimationRevision): MascotAnimationRevision {
  const pin = (url: string): string => {
    if (!url.startsWith("/api/mascots/") || !url.includes("/artifacts/")) return url;
    const parsed = new URL(url, "http://localhost");
    parsed.searchParams.set("attempt", String(revision.attempt));
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  };
  return {
    ...revision,
    manifest_url: pin(revision.manifest_url),
    ...(revision.frame_urls ? { frame_urls: revision.frame_urls.map(pin) } : {}),
    ...(revision.atlas_url ? { atlas_url: pin(revision.atlas_url) } : {}),
    ...(revision.transparent_video_url ? { transparent_video_url: pin(revision.transparent_video_url) } : {}),
  };
}

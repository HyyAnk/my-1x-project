import { request } from "../../../api/client";

export type PairResource = {
  kind: "mascot" | "logo";
  preview_url: string | null;
  transparent_url: string | null;
};

function isResource(value: unknown): value is PairResource {
  if (!value || typeof value !== "object") return false;
  return (
    "kind" in value &&
    (value.kind === "mascot" || value.kind === "logo") &&
    "preview_url" in value &&
    (value.preview_url === null || typeof value.preview_url === "string") &&
    "transparent_url" in value &&
    (value.transparent_url === null || typeof value.transparent_url === "string")
  );
}

export async function loadPairResources(channelId: string, stylePresetId: string): Promise<{ resources: PairResource[] }> {
  const query = new URLSearchParams({ style_preset_id: stylePresetId });
  const result: unknown = await request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-resources?${query}`);
  if (
    !result ||
    typeof result !== "object" ||
    !("resources" in result) ||
    !Array.isArray(result.resources) ||
    !result.resources.every(isResource)
  )
    throw new Error("Invalid resource response");
  return { resources: result.resources };
}

export async function resourcePng(url: string): Promise<Blob> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!response.ok) throw new Error("Image unavailable. Refresh resources and retry.");
  const blob = await response.blob();
  if (blob.type !== "image/png") throw new Error("Transparent PNG unavailable.");
  return blob;
}

export function downloadResource(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { BrandIdentityExportSchema } from "@studio/shared";
import { request } from "../../../api/client";

export async function fetchIdentityExport(channelId: string, format: "files" | "zip", signal: AbortSignal) {
  const response = await request<unknown>(`/api/channels/${encodeURIComponent(channelId)}/assets/identity-export?format=${format}`, {
    signal,
    cache: "no-store",
  });
  return BrandIdentityExportSchema.parse(response);
}

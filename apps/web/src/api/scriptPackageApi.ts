import { ApiError } from "./client";

export async function fetchScriptPackage(channelId: string, projectId: string, revisionId: string): Promise<Blob> {
  const url = `/api/channels/${encodeURIComponent(channelId)}/intro-outro-scripts/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(revisionId)}/package`;
  const response = await fetch(url, { headers: { accept: "application/zip" } });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "Package export failed";
    throw new ApiError(message, response.status);
  }
  return response.blob();
}

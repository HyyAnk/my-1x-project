import type {
  TransitionArtifactManifest,
  TransitionCatalogResponse,
  TransitionPreviewRequest,
  TransitionPreviewStatus,
} from "@studio/shared";
import { request } from "../../../api/client";

export async function fetchTransitionCatalog(
  sampleRevision?: string,
  signal?: AbortSignal,
): Promise<TransitionCatalogResponse> {
  const query = sampleRevision ? `?sampleRevision=${encodeURIComponent(sampleRevision)}` : "";
  return request<TransitionCatalogResponse>(`/api/transition-previews/catalog${query}`, { signal });
}

export async function requestTransitionPreview(
  req: TransitionPreviewRequest,
  signal?: AbortSignal,
): Promise<TransitionPreviewStatus> {
  return request<TransitionPreviewStatus>("/api/transition-previews", {
    method: "POST",
    body: JSON.stringify(req),
    signal,
  });
}

export async function fetchTransitionJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<TransitionPreviewStatus> {
  return request<TransitionPreviewStatus>(`/api/transition-previews/jobs/${encodeURIComponent(jobId)}`, {
    signal,
  });
}

export async function cancelTransitionJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<TransitionPreviewStatus> {
  return request<TransitionPreviewStatus>(`/api/transition-previews/jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
    signal,
  });
}

export async function fetchTransitionManifest(
  artifactId: string,
  signal?: AbortSignal,
): Promise<TransitionArtifactManifest> {
  return request<TransitionArtifactManifest>(
    `/api/transition-previews/artifacts/${encodeURIComponent(artifactId)}/manifest`,
    { signal },
  );
}

export function getTransitionVideoUrl(artifactId: string): string {
  return `/api/transition-previews/artifacts/${encodeURIComponent(artifactId)}/video`;
}

export function getTransitionFrameUrl(artifactId: string, frameIndex: number): string {
  return `/api/transition-previews/artifacts/${encodeURIComponent(artifactId)}/frames/${frameIndex}`;
}

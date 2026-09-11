import type {
  TransitionArtifactManifest,
  TransitionCatalogEntry,
  TransitionCatalogResponse,
  TransitionPreviewErrorCode,
} from "@studio/shared";

export type LoadedArtifact = {
  artifactId: string;
  videoUrl: string;
  manifestUrl: string;
  manifest: TransitionArtifactManifest;
  fingerprint: string;
};

export type TransitionPreviewState =
  | { kind: "idle" }
  | { kind: "loading-catalog" }
  | { kind: "ready-to-request" }
  | {
      kind: "queued";
      jobId: string;
      requestId: string;
      revision: number;
      staleArtifact?: LoadedArtifact;
    }
  | {
      kind: "rendering";
      jobId: string;
      requestId: string;
      revision: number;
      phase: "prepare" | "capture" | "encode" | "verify";
      completedFrames: number | null;
      totalFrames: number | null;
      staleArtifact?: LoadedArtifact;
    }
  | {
      kind: "ready";
      jobId: string;
      requestId: string;
      artifact: LoadedArtifact;
    }
  | {
      kind: "failed";
      jobId?: string;
      requestId: string;
      error: { code: TransitionPreviewErrorCode | string; message: string; retryable: boolean };
      staleArtifact?: LoadedArtifact;
    }
  | {
      kind: "cancelled";
      jobId?: string;
      requestId: string;
      staleArtifact?: LoadedArtifact;
    };

export type TransitionCatalogState = {
  catalog: TransitionCatalogResponse | null;
  entries: readonly TransitionCatalogEntry[];
  revision: string | null;
  isLoading: boolean;
  error: string | null;
};

export interface ImageReferenceInput {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
}

export interface PortraitImageRequest {
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "4:3" | "1:1" | "3:4";
  reference: ImageReferenceInput;
  operationId: string;
  dependencyFingerprint: string;
  signal: AbortSignal;
}

export interface GeneratedImageBytes {
  bytes: Uint8Array;
  provider: string;
  model: string;
  requestId?: string;
  costVnd?: number;
}

export interface PortraitImageClient {
  readonly supportsReferenceImage: boolean;
  generate(request: PortraitImageRequest): Promise<GeneratedImageBytes>;
}

import { randomUUID } from "node:crypto";
import { RepositoryError } from "../../repository.js";
import type { ImgStudioGenerationRequest, ImgStudioGenerationResponse, ImgStudioGenerationResponseItem } from "./types.js";

export const IMGSTUDIO_MAX_REFERENCE_IMAGE_BYTES = 20 * 1024 * 1024;

const MAX_REFERENCE_IMAGE_BASE64_CHARACTERS = Math.ceil((IMGSTUDIO_MAX_REFERENCE_IMAGE_BYTES * 4) / 3) + 4;

export interface ImgStudioRequestPayload {
  endpointPath: "/api/v1/images/generate" | "/api/v1/images/edit";
  body: string | Uint8Array<ArrayBuffer>;
  contentType: string;
}

interface DecodedReferenceImage {
  bytes: Buffer;
  mimeType: string;
  extension: string;
}

export function parseJsonSafe(text: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export function extractErrorMessage(rawText: string, payload?: Record<string, unknown>): string {
  if (payload) {
    if (typeof payload.error === "object" && payload.error !== null) {
      const errObj = payload.error as { message?: unknown };
      if (typeof errObj.message === "string" && errObj.message.trim()) {
        return errObj.message.trim();
      }
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  }
  return rawText.slice(0, 300).trim() || "Unknown error";
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  return typeof payload[key] === "string" ? payload[key] : undefined;
}

function readNumber(payload: Record<string, unknown>, key: string): number | undefined {
  return typeof payload[key] === "number" && Number.isFinite(payload[key]) ? payload[key] : undefined;
}

function invalidReferenceImageError(message: string): RepositoryError {
  return new RepositoryError(message, "IMAGE_REFERENCE_INVALID");
}

function referenceImageTooLargeError(): RepositoryError {
  return invalidReferenceImageError(`ImgStudio reference image must not exceed ${IMGSTUDIO_MAX_REFERENCE_IMAGE_BYTES / (1024 * 1024)} MiB`);
}

function decodeBase64Image(encodedImage: string): Buffer {
  if (encodedImage.length > MAX_REFERENCE_IMAGE_BASE64_CHARACTERS) throw referenceImageTooLargeError();

  const normalized = encodedImage.replace(/\s+/g, "");
  if (normalized.length > MAX_REFERENCE_IMAGE_BASE64_CHARACTERS) throw referenceImageTooLargeError();
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw invalidReferenceImageError("ImgStudio reference image must be valid base64 or a base64 data URL");
  }

  const paddingLength = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  const decodedLength = Math.floor((normalized.length * 3) / 4) - paddingLength;
  if (decodedLength > IMGSTUDIO_MAX_REFERENCE_IMAGE_BYTES) throw referenceImageTooLargeError();

  const bytes = Buffer.from(normalized, "base64");
  if (bytes.length === 0) {
    throw invalidReferenceImageError("ImgStudio reference image cannot be empty");
  }
  if (bytes.length > IMGSTUDIO_MAX_REFERENCE_IMAGE_BYTES) throw referenceImageTooLargeError();
  return bytes;
}

function decodeReferenceImage(image: string): DecodedReferenceImage {
  if (image.length > MAX_REFERENCE_IMAGE_BASE64_CHARACTERS + 256) throw referenceImageTooLargeError();

  const dataUrl = /^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]*)$/i.exec(image.trim());
  const mimeType = (dataUrl?.[1] || "image/png").trim().toLowerCase();
  if (!/^image\/[a-z0-9][a-z0-9.+-]*$/i.test(mimeType)) {
    throw invalidReferenceImageError(`Unsupported ImgStudio reference image MIME type '${mimeType}'`);
  }
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return {
    bytes: decodeBase64Image(dataUrl?.[2] ?? image),
    mimeType,
    extension: extensionByMimeType[mimeType] || "bin",
  };
}

function createMultipartTextPart(boundary: string, name: string, value: string): Buffer {
  return Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`, "utf8");
}

function createEditRequestPayload(request: ImgStudioGenerationRequest): ImgStudioRequestPayload {
  const reference = decodeReferenceImage(request.image || "");
  const boundary = `imgstudio-${randomUUID()}`;
  const imageHeader = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="reference.${reference.extension}"\r\n` +
      `Content-Type: ${reference.mimeType}\r\n\r\n`,
    "utf8",
  );
  const fields = [
    ["prompt", request.prompt],
    ["provider_id", request.provider_id],
    ["aspect_ratio", request.aspect_ratio],
    ["resolution", request.resolution],
    ["quality", request.quality],
  ] as const;
  const body = Buffer.concat([
    imageHeader,
    reference.bytes,
    Buffer.from("\r\n", "utf8"),
    ...fields.map(([name, value]) => createMultipartTextPart(boundary, name, value)),
    Buffer.from(`--${boundary}--\r\n`, "utf8"),
  ]);
  return {
    endpointPath: "/api/v1/images/edit",
    body: new Uint8Array(body),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export function createRequestPayload(request: ImgStudioGenerationRequest): ImgStudioRequestPayload {
  if (request.image) return createEditRequestPayload(request);
  return {
    endpointPath: "/api/v1/images/generate",
    body: JSON.stringify({
      prompt: request.prompt,
      provider_id: request.provider_id,
      aspect_ratio: request.aspect_ratio,
      resolution: request.resolution,
      quality: request.quality,
      count: 1,
    }),
    contentType: "application/json",
  };
}

function parseResponseItem(value: unknown): ImgStudioGenerationResponseItem | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  return {
    url: readString(item, "url"),
    b64_json: readString(item, "b64_json"),
    revised_prompt: readString(item, "revised_prompt"),
    price_vnd: readNumber(item, "price_vnd"),
  };
}

export function parseGenerationResponse(payload: Record<string, unknown>): ImgStudioGenerationResponse {
  const data = Array.isArray(payload.data)
    ? payload.data.map(parseResponseItem).filter((item): item is ImgStudioGenerationResponseItem => Boolean(item))
    : parseResponseItem(payload.data);
  const errorPayload = payload.error && typeof payload.error === "object" ? (payload.error as Record<string, unknown>) : undefined;
  const errorCode = errorPayload?.code;

  return {
    id: readString(payload, "id"),
    status: readString(payload, "status"),
    prompt: readString(payload, "prompt"),
    provider_name: readString(payload, "provider_name"),
    model: readString(payload, "model"),
    aspect_ratio: readString(payload, "aspect_ratio"),
    resolution: readString(payload, "resolution"),
    quality: readString(payload, "quality"),
    cost_vnd: readNumber(payload, "cost_vnd"),
    balance_vnd: readNumber(payload, "balance_vnd"),
    created_at: readString(payload, "created_at"),
    reused: typeof payload.reused === "boolean" ? payload.reused : undefined,
    code: readNumber(payload, "code"),
    message: readString(payload, "message"),
    data,
    url: readString(payload, "url"),
    b64_json: readString(payload, "b64_json"),
    price_vnd: readNumber(payload, "price_vnd"),
    error: errorPayload
      ? {
          message: readString(errorPayload, "message"),
          code: typeof errorCode === "string" || typeof errorCode === "number" ? errorCode : undefined,
        }
      : undefined,
  };
}

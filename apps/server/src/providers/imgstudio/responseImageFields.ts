import type { ImgStudioGenerationResponse } from "./types.js";

export interface ImgStudioResponseImageFields {
  b64Json: string | undefined;
  imageUrl: string | undefined;
  priceVnd: number | undefined;
}

function firstStringValue(value: unknown): string | undefined {
  const candidate: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
  return typeof candidate === "string" ? candidate : undefined;
}

function normalizeImageUrl(imageUrl: string | undefined): string | undefined {
  if (typeof imageUrl !== "string") return imageUrl;
  if (imageUrl.includes(",") && !imageUrl.startsWith("data:")) {
    return imageUrl.split(",")[0]?.trim();
  }
  if (imageUrl.includes("\n")) {
    return imageUrl.split("\n")[0]?.trim();
  }
  return imageUrl;
}

/**
 * Picks strictly the first image when multiple images are returned (e.g. Krea 2 Turbo generates 4 images).
 */
export function extractImgStudioImageFields(response: ImgStudioGenerationResponse): ImgStudioResponseImageFields {
  const dataItem = Array.isArray(response.data) ? response.data[0] : response.data;
  const b64Json = firstStringValue(dataItem?.b64_json || response.b64_json);
  const imageUrl = normalizeImageUrl(firstStringValue(dataItem?.url || response.url));
  const priceVnd = response.cost_vnd ?? dataItem?.price_vnd ?? response.price_vnd;
  return { b64Json, imageUrl, priceVnd };
}

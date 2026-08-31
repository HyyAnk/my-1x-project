import { RepositoryError } from "../../repository.js";
import { DEFAULT_BASE_URL, MAX_POLL_ATTEMPTS, POLL_INTERVAL_MS, downloadImageUrl, waitFor } from "../gpti2Dimensions.js";
import type { Gpti2ImageResult } from "../gpti2NanoBanana.js";

export async function pollGptJob(
  apiKey: string,
  jobId: string,
  model: string,
  initialPriceVnd?: number,
  cancellationSignal?: AbortSignal,
  pollIntervalMs = POLL_INTERVAL_MS,
  aspectRatio?: string,
  size?: string,
): Promise<Gpti2ImageResult> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
    if (cancellationSignal?.aborted) throw new Error("Image generation was cancelled");
    await waitFor(pollIntervalMs);

    const pollSignal = cancellationSignal
      ? AbortSignal.any([cancellationSignal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000);

    let response: Response;
    try {
      response = await fetch(`${DEFAULT_BASE_URL}/v1/images/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: pollSignal,
      });
    } catch {
      continue;
    }

    if (!response.ok) continue;

    const payload = (await response.json()) as {
      status?: string;
      price_vnd?: number;
      price_breakdown?: Record<string, number>;
      data?: Array<{ b64_json?: string; url?: string }>;
      error?: { message?: string };
    };

    if (payload.status === "succeeded") {
      const item = payload.data?.[0];
      const priceVnd = payload.price_vnd ?? initialPriceVnd;

      if (item?.b64_json) {
        return {
          bytes: new Uint8Array(Buffer.from(item.b64_json, "base64")),
          price_vnd: priceVnd,
          price_breakdown: payload.price_breakdown,
          model,
          aspect_ratio: aspectRatio,
          size,
        };
      }

      if (item?.url) {
        const bytes = await downloadImageUrl(item.url, cancellationSignal);
        return {
          bytes,
          price_vnd: priceVnd,
          price_breakdown: payload.price_breakdown,
          model,
          aspect_ratio: aspectRatio,
          size,
        };
      }

      throw new RepositoryError("Image job succeeded but returned no image payload", "IMAGE_PROVIDER_EMPTY");
    }

    if (payload.status === "failed") {
      const errorMsg = payload.error?.message || "Unknown error";
      const isContentFilter = /(?:content filter|safety|moderation|policy|prohibited)/i.test(errorMsg);
      throw new RepositoryError(
        `Image job failed: ${errorMsg}`,
        isContentFilter ? "IMAGE_CONTENT_FILTER_REJECTED" : "IMAGE_PROVIDER_FAILED",
      );
    }
  }

  throw new RepositoryError("Image generation timed out waiting for queue response", "IMAGE_PROVIDER_TIMEOUT");
}

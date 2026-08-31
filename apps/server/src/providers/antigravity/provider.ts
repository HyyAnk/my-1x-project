import type { ImageProvider } from "../index.js";
import { RepositoryError, RepositoryService } from "../../repository.js";
import { AntigravityClient } from "../../antigravity.js";
import { StudioLogger } from "../../logger.js";
import { loadConfig } from "../../config.js";
import { extractCleanVisualPrompt } from "./promptExtractor.js";
import { findGeneratedImage, findTranscriptError } from "./brainScanner.js";

export type AntigravityNativeImageTarget = {
  channelId: string;
  episodeId: string;
  bundleNumber?: number;
  variant?: number;
  assetId?: string;
  fingerprint?: string;
  theme?: string;
};

export class AntigravityNativeImageProvider implements ImageProvider {
  private readonly logger: StudioLogger;
  private static imageQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly repository: RepositoryService,
    private readonly target: AntigravityNativeImageTarget,
    private readonly client?: AntigravityClient,
  ) {
    this.logger = new StudioLogger(repository.rootDirectory);
  }

  async generateReference(
    prompt: string,
    cancellationSignal?: AbortSignal,
  ): Promise<{ asset_path: string; fallback_tier: 1; degraded: false }> {
    // Chain sequentially through static imageQueue to prevent concurrent rate limit bursts across tasks
    const result = await (AntigravityNativeImageProvider.imageQueue = AntigravityNativeImageProvider.imageQueue
      .catch(() => undefined)
      .then(async () => {
        return this.executeGenerationWithRetry(prompt, cancellationSignal);
      }));

    return result as { asset_path: string; fallback_tier: 1; degraded: false };
  }

  private async executeGenerationWithRetry(
    prompt: string,
    cancellationSignal?: AbortSignal,
  ): Promise<{ asset_path: string; fallback_tier: 1; degraded: false }> {
    const config = await loadConfig(this.repository.rootDirectory);
    const client = this.client ?? new AntigravityClient(this.repository.rootDirectory, config, this.logger);

    const imageName = this.target.assetId
      ? `quiz_${this.target.assetId.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`
      : `bundle_cb_${String(this.target.bundleNumber ?? 1).padStart(2, "0")}`;

    const cleanPrompt = extractCleanVisualPrompt(prompt);
    const ratioMatch =
      prompt.match(/Output framing:\s*(1:1|16:9|9:16|4:3|3:4|2:3|3:2)/i) || prompt.match(/Composition:\s*(1:1|16:9|9:16|4:3|3:4|2:3|3:2)/i);
    const targetAspectRatio = ratioMatch ? ratioMatch[1] : "16:9";

    const maxAttempts = 5;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (cancellationSignal?.aborted) throw new Error("Image generation aborted");

      const turnStartTime = Date.now();

      try {
        const turnPrompt = [
          `You are an AI illustrator. Call the generate_image tool immediately:`,
          `- AspectRatio: "${targetAspectRatio}"`,
          `- ImageName: "${imageName}"`,
          `- Prompt: "${cleanPrompt}"`,
          ``,
          `IMPORTANT RULES:`,
          `1. Call generate_image immediately in step 1.`,
          `2. DO NOT use schedule. DO NOT run sleep or wait commands.`,
          `3. If generate_image encounters an error or rate limit (e.g. 429 RESOURCE_EXHAUSTED), output the error message clearly so that the system retry loop can handle backoff.`,
        ].join("\n");

        const threadId = await client.startThread();
        const turnId = await client.startTurn(threadId, turnPrompt, "flash");

        // Actively poll for the image file in the Antigravity conversation directory for up to 45 seconds
        const pollDeadline = Date.now() + 45_000;
        let imageBytes: Uint8Array | null = null;
        let detectedRateLimit: string | null = null;

        while (Date.now() < pollDeadline && !imageBytes) {
          if (cancellationSignal?.aborted) {
            void client.interruptTurn(threadId, turnId);
            throw new Error("Image generation aborted");
          }

          const convId = client.getConversationId ? client.getConversationId(threadId) : null;
          imageBytes = await findGeneratedImage(imageName, turnStartTime, convId, this.logger);
          if (imageBytes && imageBytes.length > 0) break;

          // Check if the conversation transcript logged a rate limit or 429 error
          if (convId) {
            detectedRateLimit = await findTranscriptError(convId);
            if (detectedRateLimit) {
              lastError = new RepositoryError(`Antigravity image generation hit rate limit: ${detectedRateLimit}`, "RATE_LIMIT_EXCEEDED");
              break;
            }
          }

          await new Promise((r) => setTimeout(r, process.env.NODE_ENV === "test" ? 20 : 1000));
        }

        if (imageBytes && imageBytes.length > 0) {
          let assetPath: string;
          if (this.target.assetId && this.target.fingerprint) {
            assetPath = await this.repository.writeQuizImageAsset(
              this.target.channelId,
              this.target.episodeId,
              this.target.assetId,
              this.target.fingerprint,
              imageBytes,
            );
          } else {
            assetPath = await this.repository.writeBundleImage(
              this.target.channelId,
              this.target.episodeId,
              this.target.bundleNumber ?? 1,
              imageBytes,
              this.target.variant ?? 0,
            );
          }

          // Mandatory cooldown (8s) between successive image generation calls to avoid backend rate limits
          const cooldownMs = process.env.NODE_ENV === "test" ? 10 : 8000;
          this.logger.info(
            `Image created and verified successfully for ${imageName}, cooling down for ${cooldownMs / 1000}s before next image...`,
          );
          await new Promise((r) => setTimeout(r, cooldownMs));

          return { asset_path: assetPath, fallback_tier: 1, degraded: false };
        }

        if (!lastError || !/429|quota|rate limit|resource_exhausted|exhausted/i.test(lastError.message)) {
          lastError = new RepositoryError(
            `Antigravity native image tool did not produce an image for ${imageName} (attempt ${attempt}/${maxAttempts})`,
            "IMAGE_GENERATION_FAILED",
          );
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      if (attempt < maxAttempts) {
        const isRateLimit = /429|quota|rate limit|resource_exhausted|exhausted/i.test(lastError.message);
        const baseDelay = process.env.NODE_ENV === "test" ? 50 : isRateLimit ? 10000 : 3000;
        const retryDelay = attempt * baseDelay;
        this.logger.warn(
          `Antigravity image generation attempt ${attempt} failed (${lastError.message}), cooling down for ${retryDelay}ms before retry...`,
        );
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }

    throw lastError || new RepositoryError(`Antigravity native image generation failed for ${imageName}`, "IMAGE_GENERATION_FAILED");
  }
}

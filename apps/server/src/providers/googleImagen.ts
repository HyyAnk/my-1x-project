import type { ImageProvider } from "./index.js";
import { RepositoryError, RepositoryService } from "../repository.js";
import { StudioLogger } from "../logger.js";

type GoogleImagenTarget = {
  channelId: string;
  episodeId: string;
  bundleNumber?: number;
  variant?: number;
  assetId?: string;
  fingerprint?: string;
  aspectRatio?: string;
};

export class GoogleImagenProvider implements ImageProvider {
  private readonly logger: StudioLogger;

  constructor(
    private readonly repository: RepositoryService,
    private readonly target: GoogleImagenTarget,
    private readonly apiKey: string,
    private readonly model: string = "gemini-3.1-flash-image",
    private readonly apiBaseUrl: string = "https://generativelanguage.googleapis.com/v1beta",
  ) {
    this.logger = new StudioLogger(repository.rootDirectory);
  }

  private resolveTargetAspectRatio(prompt: string): string {
    const ratioMatch =
      prompt.match(/Output framing:\s*(1:1|16:9|9:16|4:3|3:4|2:3|3:2)/i) ||
      prompt.match(/Composition:\s*(1:1|16:9|9:16|4:3|3:4|2:3|3:2)/i);
    return this.target.aspectRatio || (ratioMatch ? ratioMatch[1] : "16:9");
  }

  private getGenerationUrl(): string {
    const isGeminiContentModel = !this.model.startsWith("imagen-");
    const method = isGeminiContentModel ? "generateContent" : "predict";
    return `${this.apiBaseUrl.replace(/\/+$/, "")}/models/${this.model}:${method}?key=${this.apiKey.trim()}`;
  }

  private buildRequestBody(cleanPrompt: string, targetAspectRatio: string): unknown {
    if (!this.model.startsWith("imagen-")) {
      return {
        contents: [
          {
            parts: [{ text: `${cleanPrompt}, ${targetAspectRatio} aspect ratio, high quality` }],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      };
    }
    return {
      instances: [{ prompt: cleanPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: targetAspectRatio,
        outputOptions: { mimeType: "image/png" },
      },
    };
  }

  private parseGeminiResponse(data: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { data?: string; mimeType?: string };
          inline_data?: { data?: string; mime_type?: string };
        }>;
      };
    }>;
  }): string | undefined {
    return (
      data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data || p.inline_data?.data)?.inlineData?.data ??
      data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data || p.inline_data?.data)?.inline_data?.data
    );
  }

  private parseImagenResponse(data: {
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
  }): string | undefined {
    return data.predictions?.[0]?.bytesBase64Encoded;
  }

  private extractImageBase64(data: {
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { data?: string; mimeType?: string };
          inline_data?: { data?: string; mime_type?: string };
        }>;
      };
    }>;
  }): string {
    const base64 = this.model.startsWith("imagen-") ? this.parseImagenResponse(data) : this.parseGeminiResponse(data);
    if (!base64) {
      throw new RepositoryError("Google Gemini/Imagen did not return image bytes", "IMAGE_GENERATION_FAILED");
    }
    return base64;
  }

  private formatHttpError(status: number, raw: string): RepositoryError {
    if (status === 401 || status === 403) {
      return new RepositoryError(`Google Gemini/Imagen API key is unauthorized (${status})`, "IMAGE_GENERATION_FAILED");
    }
    if (status === 429) {
      return new RepositoryError("Google Gemini/Imagen quota exceeded (429)", "RATE_LIMIT_EXCEEDED");
    }
    return new RepositoryError(
      `Google Gemini/Imagen request failed (${status}): ${raw.slice(0, 200)}`,
      "IMAGE_GENERATION_FAILED",
    );
  }

  private async persistImage(imageBytes: Buffer): Promise<string> {
    if (this.target.assetId && this.target.fingerprint) {
      return this.repository.writeQuizImageAsset(
        this.target.channelId,
        this.target.episodeId,
        this.target.assetId,
        this.target.fingerprint,
        imageBytes,
      );
    }
    return this.repository.writeBundleImage(
      this.target.channelId,
      this.target.episodeId,
      this.target.bundleNumber ?? 1,
      imageBytes,
      this.target.variant ?? 0,
    );
  }

  private calculateRetryDelay(error: Error, attempt: number): number {
    if (process.env.NODE_ENV === "test") return 20;
    const isRateLimit = error instanceof RepositoryError && error.code === "RATE_LIMIT_EXCEEDED";
    return isRateLimit ? attempt * 5000 : attempt * 2000;
  }

  private async executeGenerationAttempt(url: string, requestBody: unknown, cancellationSignal?: AbortSignal): Promise<string> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: cancellationSignal,
    });

    if (!response.ok) {
      const raw = await response.text();
      throw this.formatHttpError(response.status, raw);
    }

    const data = (await response.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            inlineData?: { data?: string; mimeType?: string };
            inline_data?: { data?: string; mime_type?: string };
          }>;
        };
      }>;
    };

    const base64 = this.extractImageBase64(data);
    const imageBytes = Buffer.from(base64, "base64");
    const assetPath = await this.persistImage(imageBytes);

    const cooldownMs = process.env.NODE_ENV === "test" ? 10 : 8000;
    await new Promise((r) => setTimeout(r, cooldownMs));

    return assetPath;
  }

  async generateReference(
    prompt: string,
    cancellationSignal?: AbortSignal,
  ): Promise<{ asset_path: string; fallback_tier: number; degraded: boolean }> {
    if (!this.apiKey.trim()) {
      throw new RepositoryError(`Google Gemini/Imagen API Key is required for ${this.model}`, "API_KEY_REQUIRED");
    }

    const cleanPrompt = this.extractCleanVisualPrompt(prompt);
    const targetAspectRatio = this.resolveTargetAspectRatio(prompt);
    const url = this.getGenerationUrl();
    const requestBody = this.buildRequestBody(cleanPrompt, targetAspectRatio);

    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (cancellationSignal?.aborted) throw new Error("Image generation aborted");

      try {
        const assetPath = await this.executeGenerationAttempt(url, requestBody, cancellationSignal);
        return { asset_path: assetPath, fallback_tier: 1, degraded: false };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(lastError, attempt);
          this.logger.warn(`Google Imagen attempt ${attempt} failed (${lastError.message}), retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError || new RepositoryError("Google Imagen generation failed", "IMAGE_GENERATION_FAILED");
  }

  private extractCleanVisualPrompt(rawPrompt: string): string {
    const anchorMatch = rawPrompt.match(/Anchor[- ]frame prompt\s*:\s*([^\n\r]+)/i);
    if (anchorMatch && anchorMatch[1].trim()) {
      return anchorMatch[1].replace(/[`"]/g, "").replace(/\s+/g, " ").trim().slice(0, 600);
    }
    if (rawPrompt.includes("Subject:") || rawPrompt.includes("Visual Style:") || rawPrompt.includes("Solo hero art contract:")) {
      const subjectMatch = rawPrompt.match(/Subject\s*:\s*([^\n\r]+)/i);
      const subject = subjectMatch ? subjectMatch[1].replace(/\.$/, "").trim() : "";
      const visualStyleMatch = rawPrompt.match(/Visual Style\s*:\s*([^\n\r]+)/i);
      const visualStyle = visualStyleMatch ? visualStyleMatch[1].replace(/\.$/, "").trim() : "";
      const artContractMatch = rawPrompt.match(
        /(?:Solo hero art contract|Every option in this set must share this exact art direction)\s*:\s*([^\n\r]+)/i,
      );
      const artContract = artContractMatch ? artContractMatch[1].replace(/\.$/, "").trim() : "";
      const lightingMatch = rawPrompt.match(/Lighting\s*:\s*([^\n\r]+)/i);
      const lighting = lightingMatch ? lightingMatch[1].replace(/\.$/, "").trim() : "";
      const backgroundMatch = rawPrompt.match(/Background\s*:\s*([^\n\r]+)/i);
      const background = backgroundMatch ? backgroundMatch[1].replace(/\.$/, "").trim() : "";

      const parts = [
        subject ? `Subject: ${subject}.` : "",
        visualStyle ? `Style: ${visualStyle}.` : "",
        artContract ? `Art Direction: ${artContract}.` : "",
        lighting ? `Lighting: ${lighting}.` : "",
        background ? `Background: ${background}.` : "",
        "High quality, vibrant colors, child-friendly, clear focal subject, no text, no letters, no unrelated logos, no watermark, no split screen; retain identifying marks explicitly required by the subject.",
      ].filter(Boolean);

      return parts.join(" ").slice(0, 1200);
    }
    return rawPrompt.replace(/\s+/g, " ").trim().slice(0, 600);
  }
}

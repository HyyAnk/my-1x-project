import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  callImgStudioApi,
  checkImgStudioConnectivity,
  DEFAULT_IMGSTUDIO_ASPECT_RATIO,
  DEFAULT_IMGSTUDIO_BASE_URL,
  generateImgStudioImageBytes,
  IMGSTUDIO_SUPPORTED_ASPECT_RATIOS,
  ImgStudioImageProvider,
  ImgStudioQuizImageProvider,
  resolveImgStudioAspectRatio,
  resolveImgStudioResolution,
} from "../src/providers/imgstudio/index.js";
import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";
import { RepositoryError, RepositoryService } from "../src/repository.js";

const roots: string[] = [];
const originalFetch = globalThis.fetch;
const originalApiKey = process.env.IMGSTUDIO_API_KEY;

// 1x1 transparent PNG base64 for testing
const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

afterEach(async () => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.IMGSTUDIO_API_KEY;
  } else {
    process.env.IMGSTUDIO_API_KEY = originalApiKey;
  }
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe("ImgStudio Dimensions & Resolution Resolvers", () => {
  it("resolves supported aspect ratios and falls back safely", () => {
    for (const ratio of IMGSTUDIO_SUPPORTED_ASPECT_RATIOS) {
      expect(resolveImgStudioAspectRatio(ratio)).toBe(ratio);
      expect(resolveImgStudioAspectRatio(`  ${ratio}  `)).toBe(ratio);
    }

    expect(resolveImgStudioAspectRatio(undefined)).toBe(DEFAULT_IMGSTUDIO_ASPECT_RATIO);
    expect(resolveImgStudioAspectRatio("")).toBe(DEFAULT_IMGSTUDIO_ASPECT_RATIO);
    expect(resolveImgStudioAspectRatio("invalid-ratio")).toBe(DEFAULT_IMGSTUDIO_ASPECT_RATIO);
    expect(resolveImgStudioAspectRatio("21:9", "16:9")).toBe("16:9");
  });

  it("resolves resolution respecting model capabilities", () => {
    const grokId = "618e7813-24e8-462c-a3d4-0a0a509be700"; // max_resolution: 1K
    const qwenId = "2d059365-a09a-4fd5-aa9e-b5335d09bbe9"; // max_resolution: 2K

    // Grok (1K max): defaults to 1K, caps higher requests to 1K
    expect(resolveImgStudioResolution(grokId)).toBe("1K");
    expect(resolveImgStudioResolution(grokId, "1K")).toBe("1K");
    expect(resolveImgStudioResolution(grokId, "1k")).toBe("1K");
    expect(resolveImgStudioResolution(grokId, "2K")).toBe("1K");
    expect(resolveImgStudioResolution(grokId, "4K")).toBe("1K");

    // Qwen (2K max): defaults to 2K, supports 1K, caps 4K to 2K
    expect(resolveImgStudioResolution(qwenId)).toBe("2K");
    expect(resolveImgStudioResolution(qwenId, "1K")).toBe("1K");
    expect(resolveImgStudioResolution(qwenId, "2K")).toBe("2K");
    expect(resolveImgStudioResolution(qwenId, "2k")).toBe("2K");
    expect(resolveImgStudioResolution(qwenId, "4K")).toBe("2K");

    // Unknown model defaults to 2K
    expect(resolveImgStudioResolution("unknown-model-id")).toBe("2K");
  });
});

describe("ImgStudio Client Transport (callImgStudioApi)", () => {
  it("sends generation request with correct endpoint, headers, and payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: {
            url: "https://imgstudio.site/images/generated-1.png",
            price_vnd: 150,
          },
        }),
    });
    globalThis.fetch = fetchMock;

    const response = await callImgStudioApi(
      {
        model: IMGSTUDIO_DEFAULT_MODEL_ID,
        prompt: "A majestic mountain landscape at dusk",
        aspect_ratio: "16:9",
        resolution: "2K",
        quality: "high",
        image: "https://example.com/reference.png",
      },
      {
        apiKey: "std-test-key",
        baseUrl: "https://custom.imgstudio.site",
        idempotencyKey: "test-idem-key-123",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://custom.imgstudio.site/api/v1/images/generate");
    expect(options.method).toBe("POST");
    expect(options.headers["Authorization"]).toBe("Bearer std-test-key");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["Idempotency-Key"]).toBe("test-idem-key-123");

    const parsedBody = JSON.parse(options.body as string);
    expect(parsedBody.model).toBe(IMGSTUDIO_DEFAULT_MODEL_ID);
    expect(parsedBody.prompt).toBe("A majestic mountain landscape at dusk");
    expect(parsedBody.aspect_ratio).toBe("16:9");
    expect(parsedBody.resolution).toBe("2K");
    expect(parsedBody.quality).toBe("high");
    expect(parsedBody.image).toBe("https://example.com/reference.png");

    expect(response.data).toBeDefined();
  });

  it("throws IMAGE_PROVIDER_NOT_CONFIGURED when apiKey is missing", async () => {
    await expect(
      callImgStudioApi(
        {
          model: IMGSTUDIO_DEFAULT_MODEL_ID,
          prompt: "test",
          aspect_ratio: "1:1",
          resolution: "2K",
          quality: "standard",
        },
        { apiKey: "" },
      ),
    ).rejects.toThrowError(expect.objectContaining({ code: "IMAGE_PROVIDER_NOT_CONFIGURED" }));
  });

  it("identifies 401 Unauthorized and throws IMAGE_PROVIDER_AUTH_ERROR", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: "Invalid API token provided" } }),
    });

    await expect(
      callImgStudioApi(
        {
          model: IMGSTUDIO_DEFAULT_MODEL_ID,
          prompt: "test",
          aspect_ratio: "1:1",
          resolution: "2K",
          quality: "standard",
        },
        { apiKey: "bad-key" },
      ),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "IMAGE_PROVIDER_AUTH_ERROR",
        message: expect.stringContaining("401"),
      }),
    );
  });

  it("identifies 400 content filter rejection and throws IMAGE_CONTENT_FILTER_REJECTED", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: "Prompt triggered content filter and safety policy" } }),
    });

    await expect(
      callImgStudioApi(
        {
          model: IMGSTUDIO_DEFAULT_MODEL_ID,
          prompt: "forbidden content",
          aspect_ratio: "1:1",
          resolution: "2K",
          quality: "standard",
        },
        { apiKey: "test-key" },
      ),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "IMAGE_CONTENT_FILTER_REJECTED",
        message: expect.stringContaining("content filter"),
      }),
    );
  });

  it("identifies 429 rate limit and throws RATE_LIMIT_EXCEEDED", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: "Too many requests. Quota exceeded." }),
    });

    await expect(
      callImgStudioApi(
        {
          model: IMGSTUDIO_DEFAULT_MODEL_ID,
          prompt: "test",
          aspect_ratio: "1:1",
          resolution: "2K",
          quality: "standard",
        },
        { apiKey: "test-key" },
      ),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "RATE_LIMIT_EXCEEDED",
      }),
    );
  });

  it("identifies 500 server error and throws IMAGE_PROVIDER_SERVER_ERROR", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error: model backend timed out",
    });

    await expect(
      callImgStudioApi(
        {
          model: IMGSTUDIO_DEFAULT_MODEL_ID,
          prompt: "test",
          aspect_ratio: "1:1",
          resolution: "2K",
          quality: "standard",
        },
        { apiKey: "test-key" },
      ),
    ).rejects.toThrowError(
      expect.objectContaining({
        code: "IMAGE_PROVIDER_SERVER_ERROR",
        message: expect.stringContaining("500"),
      }),
    );
  });

  it("handles cancellation signal gracefully", async () => {
    const controller = new AbortController();
    globalThis.fetch = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new Error("aborted"));
    });

    await expect(
      callImgStudioApi(
        {
          model: IMGSTUDIO_DEFAULT_MODEL_ID,
          prompt: "test",
          aspect_ratio: "1:1",
          resolution: "2K",
          quality: "standard",
        },
        { apiKey: "test-key", cancellationSignal: controller.signal },
      ),
    ).rejects.toThrowError("ImgStudio image generation was cancelled");
  });
});

describe("ImgStudio Connectivity Check (checkImgStudioConnectivity)", () => {
  it("verifies connectivity successfully against /api/v1/models", async () => {
    const mockModels = [
      { id: "model-1", name: "Model One" },
      { id: "model-2", name: "Model Two" },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: mockModels }),
    });
    globalThis.fetch = fetchMock;

    const result = await checkImgStudioConnectivity("valid-api-key", "https://imgstudio.site");

    expect(result.ok).toBe(true);
    expect(result.models).toEqual(mockModels);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://imgstudio.site/api/v1/models");
    expect(init.headers["Authorization"]).toBe("Bearer valid-api-key");
  });

  it("throws IMAGE_PROVIDER_NOT_CONFIGURED when apiKey is empty", async () => {
    await expect(checkImgStudioConnectivity("")).rejects.toThrowError(
      expect.objectContaining({ code: "IMAGE_PROVIDER_NOT_CONFIGURED" }),
    );
  });

  it("throws IMAGE_PROVIDER_AUTH_ERROR on 401 response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: "Unauthorized token" }),
    });

    await expect(checkImgStudioConnectivity("bad-key")).rejects.toThrowError(
      expect.objectContaining({ code: "IMAGE_PROVIDER_AUTH_ERROR" }),
    );
  });

  it("throws RATE_LIMIT_EXCEEDED on 429 response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: "Rate limit exceeded" }),
    });

    await expect(checkImgStudioConnectivity("limited-key")).rejects.toThrowError(
      expect.objectContaining({ code: "RATE_LIMIT_EXCEEDED" }),
    );
  });
});

describe("ImgStudio Generator (generateImgStudioImageBytes)", () => {
  it("decodes image bytes from b64_json response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: {
            b64_json: `data:image/png;base64,${TINY_PNG_BASE64}`,
            price_vnd: 200,
          },
        }),
    });

    const result = await generateImgStudioImageBytes("A cute robot playing guitar", {
      apiKey: "test-key",
      aspect_ratio: "16:9",
      resolution: "2K",
    });

    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(10);
    expect(result.aspect_ratio).toBe("16:9");
    expect(result.resolution).toBe("2K");
    expect(result.price_vnd).toBe(200);
  });

  it("downloads image bytes from url response", async () => {
    const rawPngBytes = Buffer.from(TINY_PNG_BASE64, "base64");
    const exactBuffer = rawPngBytes.buffer.slice(rawPngBytes.byteOffset, rawPngBytes.byteOffset + rawPngBytes.byteLength);
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/images/generate")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [
                {
                  url: "https://imgstudio.site/cdn/test-image.png",
                  price_vnd: 120,
                },
              ],
            }),
        });
      }
      if (url.includes("/cdn/test-image.png")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: async () => exactBuffer,
        });
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });
    globalThis.fetch = fetchMock;

    const result = await generateImgStudioImageBytes("Neon city street at night", {
      apiKey: "test-key",
      aspect_ratio: "9:16",
    });

    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBe(rawPngBytes.length);
    expect(result.aspect_ratio).toBe("9:16");
    expect(result.price_vnd).toBe(120);
    expect(result.url).toBe("https://imgstudio.site/cdn/test-image.png");
  });

  it("throws IMAGE_PROVIDER_EMPTY when response has neither b64_json nor url", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: {} }),
    });

    await expect(
      generateImgStudioImageBytes("empty test", {
        apiKey: "test-key",
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "IMAGE_PROVIDER_EMPTY" }));
  });

  it("throws IMAGE_PROVIDER_NOT_CONFIGURED when no apiKey is supplied or in environment", async () => {
    delete process.env.IMGSTUDIO_API_KEY;
    await expect(generateImgStudioImageBytes("test prompt", {})).rejects.toThrowError(
      expect.objectContaining({ code: "IMAGE_PROVIDER_NOT_CONFIGURED" }),
    );
  });
});

describe("ImgStudio Quiz & Image Providers Integration", () => {
  it("checks configuration correctly", () => {
    delete process.env.IMGSTUDIO_API_KEY;
    expect(ImgStudioQuizImageProvider.isConfigured()).toBe(false);
    expect(ImgStudioQuizImageProvider.isConfigured("   ")).toBe(false);
    expect(ImgStudioQuizImageProvider.isConfigured("my-key")).toBe(true);

    process.env.IMGSTUDIO_API_KEY = "env-key";
    expect(ImgStudioQuizImageProvider.isConfigured()).toBe(true);
    expect(ImgStudioImageProvider.isConfigured()).toBe(true);
  });

  it("generates quiz asset, writes asset to disk, and logs image usage", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "studio-imgstudio-test-"));
    roots.push(root);

    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "ImgStudio Test Channel",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 3 }, (_, i) => ({
      topic_id: `t${i + 1}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Topic ${i + 1}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High" as const,
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, "t1");
    await repository.readUsageLedger();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: {
            b64_json: TINY_PNG_BASE64,
            price_vnd: 150,
          },
        }),
    });

    const quizProvider = new ImgStudioQuizImageProvider(
      repository,
      { channelId: channel.channel_id, episodeId: episode.episode_id },
      { apiKey: "test-std-key", model: IMGSTUDIO_DEFAULT_MODEL_ID },
    );

    const result = await quizProvider.generateAsset({
      assetId: "question_1_illustration",
      fingerprint: "a".repeat(64),
      prompt: "Illustration of a space station orbiting Mars",
      aspect_ratio: "1:1",
    });

    expect(result.path).toBeDefined();
    expect(result.price_vnd).toBe(150);
    expect(result.aspect_ratio).toBe("1:1");
    expect(result.model).toBe(IMGSTUDIO_DEFAULT_MODEL_ID);

    // Verify image usage was recorded in repository for imgstudio
    const ledger = await repository.readUsageLedger();
    expect(ledger.image.by_provider["imgstudio"]).toBe(1);
    expect(ledger.image.estimated_cost_vnd).toBeGreaterThanOrEqual(150);
  });

  it("generates reference bundle image via ImgStudioImageProvider", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "studio-imgstudio-bundle-"));
    roots.push(root);

    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Bundle Test Channel",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 3 }, (_, i) => ({
      topic_id: `t${i + 1}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Topic ${i + 1}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High" as const,
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, "t1");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: {
            b64_json: TINY_PNG_BASE64,
            price_vnd: 250,
          },
        }),
    });

    const bundleProvider = new ImgStudioImageProvider(
      repository,
      {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        bundleNumber: 1,
        variant: 0,
      },
      {
        apiKey: "bundle-key",
        aspectRatio: "16:9",
      },
    );

    const result = await bundleProvider.generateReference("Serene ocean at sunset");
    expect(result.asset_path).toBeDefined();
    expect(result.price_vnd).toBe(250);
    expect(result.aspect_ratio).toBe("16:9");

    const images = await repository.listBundleImages(channel.channel_id, episode.episode_id);
    expect(images.length).toBe(1);
    expect(images[0].price_vnd).toBe(250);
    expect(images[0].aspect_ratio).toBe("16:9");
  });
});

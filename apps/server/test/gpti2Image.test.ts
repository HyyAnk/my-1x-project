import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateGpti2ImageBytes, Gpti2ImageProvider } from "../src/providers/gpti2Image.js";
import { RepositoryService } from "../src/repository.js";

const roots: string[] = [];
const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GPTI2_API_KEY;

afterEach(async () => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GPTI2_API_KEY;
  else process.env.GPTI2_API_KEY = originalApiKey;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

function toUrlString(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : "url" in input ? input.url : input.href;
}

describe("gpti2.store Image Provider", () => {
  it("generates image synchronously for gpt-image-2 with quality low", async () => {
    // 1x1 transparent PNG base64
    const fakeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: fakeBase64 }],
          price_vnd: 50,
          price_breakdown: { images_vnd: 50 },
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock;

    const result = await generateGpti2ImageBytes("A scenic mountain at sunrise", {
      apiKey: "sk-test-key",
      model: "gpt-image-2",
    });

    expect(result.price_vnd).toBe(50);
    expect(result.model).toBe("gpt-image-2");
    expect(result.bytes.length).toBeGreaterThan(10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://gpti2.store/v1/images/generations");
    const headers = init.headers as Record<string, string>;
    expect(headers["Prefer"]).toBe("respond-async");
    expect(headers["Idempotency-Key"]).toBeDefined();
    const body = JSON.parse(init.body as string) as { quality: string; model: string };
    expect(body.quality).toBe("low");
    expect(body.model).toBe("gpt-image-2");
  });

  it("handles 202 async response with job polling for gpt-image-2", async () => {
    const fakeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    let pollCount = 0;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = toUrlString(input);
      if (url.endsWith("/generations")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "job_123", price_vnd: 50 }), { status: 202 }),
        );
      }
      if (url.includes("/jobs/job_123")) {
        pollCount += 1;
        if (pollCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ status: "running" }), { status: 200 }),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: "succeeded",
              data: [{ b64_json: fakeBase64 }],
              price_vnd: 50,
              price_breakdown: { images_vnd: 50 },
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });
    globalThis.fetch = fetchMock;

    const result = await generateGpti2ImageBytes("A bustling retro market", {
      apiKey: "sk-test-key",
      model: "gpt-image-2",
      pollIntervalMs: 10,
    });

    expect(result.price_vnd).toBe(50);
    expect(pollCount).toBeGreaterThanOrEqual(2);
  });

  it("handles nano-banana-2 async polling generation", async () => {
    const fakePngBytes = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, -60, -119,
    ]);
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = toUrlString(input);
      if (url.endsWith("/nano/generations")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "nb_456", price_vnd: 100 }), { status: 202 }),
        );
      }
      if (url.includes("/nano/nb_456")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: "succeeded",
              data: [{ url: "https://gpti2.store/download/nb_456.png" }],
              price_vnd: 100,
            }),
            { status: 200 },
          ),
        );
      }
      if (url.includes("/download/nb_456.png")) {
        return Promise.resolve(
          new Response(fakePngBytes.buffer, { status: 200 }),
        );
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });
    globalThis.fetch = fetchMock;

    const result = await generateGpti2ImageBytes("A futuristic city at night", {
      apiKey: "sk-test-key",
      model: "nano-banana-2",
      pollIntervalMs: 10,
    });

    expect(result.price_vnd).toBe(100);
    expect(result.model).toBe("nano-banana-2");
  });

  it("Gpti2ImageProvider persists metadata JSON file alongside the image", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "gpti2-repo-test-"));
    roots.push(root);
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Gpti2 Channel",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, i) => ({
      topic_id: `t${i + 1}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `T${i + 1}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High" as const,
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, "t1");

    const fakeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: fakeBase64 }],
          price_vnd: 50,
          price_breakdown: { images_vnd: 50 },
        }),
        { status: 200 },
      ),
    );

    const provider = new Gpti2ImageProvider(
      repository,
      {
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        bundleNumber: 1,
      },
      {
        apiKey: "sk-test",
        model: "gpt-image-2",
      },
    );

    const output = await provider.generateReference("A tranquil forest path");
    expect(output.price_vnd).toBe(50);

    const images = await repository.listBundleImages(channel.channel_id, episode.episode_id);
    expect(images.length).toBe(1);
    expect(images[0].price_vnd).toBe(50);
    expect(images[0].model).toBe("gpt-image-2");
    expect(images[0].aspect_ratio).toBe("16:9");
  });

  it("maps aspect ratios correctly for gpt-image-2 (size) and nano-banana-2 (aspect_ratio)", async () => {
    const fakeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [{ b64_json: fakeBase64 }],
            price_vnd: 50,
          }),
          { status: 200 },
        ),
      ),
    );
    globalThis.fetch = fetchMock;

    const getRequestBody = (callIndex: number): { size?: string; aspect_ratio?: string } => {
      const call = fetchMock.mock.calls[callIndex];
      const init = call?.[1];
      return JSON.parse(init?.body as string) as { size?: string; aspect_ratio?: string };
    };

    // Test 1:1 square for gpt-image-2
    await generateGpti2ImageBytes("A red apple on white background", {
      apiKey: "sk-test",
      model: "gpt-image-2",
      aspect_ratio: "1:1",
    });
    let requestBody = getRequestBody(0);
    expect(requestBody.size).toBe("1024x1024");

    // Test 9:16 portrait for gpt-image-2
    await generateGpti2ImageBytes("A tall skyscraper", {
      apiKey: "sk-test",
      model: "gpt-image-2",
      aspect_ratio: "9:16",
    });
    requestBody = getRequestBody(1);
    expect(requestBody.size).toBe("720x1280");

    // Test 4:3 for gpt-image-2
    await generateGpti2ImageBytes("A vintage television", {
      apiKey: "sk-test",
      model: "gpt-image-2",
      aspect_ratio: "4:3",
    });
    requestBody = getRequestBody(2);
    expect(requestBody.size).toBe("1024x768");

    // Test 3:4 for gpt-image-2
    await generateGpti2ImageBytes("A portrait card hero", {
      apiKey: "sk-test",
      model: "gpt-image-2",
      aspect_ratio: "3:4",
    });
    requestBody = getRequestBody(3);
    expect(requestBody.size).toBe("768x1024");

    // Test 16:9 for gpt-image-2
    await generateGpti2ImageBytes("A widescreen panorama", {
      apiKey: "sk-test",
      model: "gpt-image-2",
      aspect_ratio: "16:9",
    });
    requestBody = getRequestBody(4);
    expect(requestBody.size).toBe("1280x720");

    // Test nano-banana-2 with direct aspect_ratio
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "nb_square", price_vnd: 100 }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "succeeded",
            data: [{ url: "https://gpti2.store/download/nb_square.png" }],
            price_vnd: 100,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([137, 80, 78, 71]).buffer, { status: 200 }),
      );

    const nanoResult = await generateGpti2ImageBytes("A square icon", {
      apiKey: "sk-test",
      model: "nano-banana-2",
      aspect_ratio: "1:1",
      pollIntervalMs: 10,
    });
    expect(nanoResult.aspect_ratio).toBe("1:1");
    expect(nanoResult.price_vnd).toBe(100);
    const nanoCallBody = getRequestBody(5);
    expect(nanoCallBody.aspect_ratio).toBe("1:1");
  });

  it("checks balance successfully via checkGpti2Balance", async () => {
    const { checkGpti2Balance } = await import("../src/providers/gpti2Image.js");
    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          balance_vnd: 50000,
          rpm: 10,
        }),
        { status: 200 },
      ),
    );

    const balance = await checkGpti2Balance("sk-valid-key");
    expect(balance.balance_vnd).toBe(50000);
    expect(balance.rpm).toBe(10);
  });

  it("attaches referenceImageBase64 to gpt-image-2 payload correctly", async () => {
    const fakeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: fakeBase64 }],
          price_vnd: 50,
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock;

    await generateGpti2ImageBytes("Character waving", {
      apiKey: "sk-test-key",
      model: "gpt-image-2",
      referenceImageBase64: fakeBase64,
      referenceStrength: 0.8,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/images/edits");
    expect(init.body).toBeInstanceOf(FormData);
    const formData = init.body as FormData;
    expect(formData.get("prompt")).toBe("Character waving");
  });

  it("attaches referenceImageBase64 to nano-banana-2 payload correctly", async () => {
    const fakeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = toUrlString(input);
      if (url.endsWith("/nano/generations")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "nb_ref_123", price_vnd: 100 }), { status: 202 }),
        );
      }
      if (url.includes("/nano/nb_ref_123")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: "succeeded",
              data: [{ url: "https://gpti2.store/download/nb_ref_123.png" }],
              price_vnd: 100,
            }),
            { status: 200 },
          ),
        );
      }
      if (url.includes("/download/nb_ref_123.png")) {
        return Promise.resolve(
          new Response(new Uint8Array([137, 80, 78, 71]).buffer, { status: 200 }),
        );
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });
    globalThis.fetch = fetchMock;

    await generateGpti2ImageBytes("Character celebrating", {
      apiKey: "sk-test-key",
      model: "nano-banana-2",
      referenceImageBase64: fakeBase64,
      pollIntervalMs: 10,
    });

    const init = fetchMock.mock.calls[0]?.[1];
    const firstCallBody = JSON.parse(init?.body as string) as { image_urls: string[]; ref_images: string[] };
    expect(firstCallBody.image_urls).toEqual([`data:image/png;base64,${fakeBase64}`]);
    expect(firstCallBody.ref_images).toEqual([`data:image/png;base64,${fakeBase64}`]);
  });
});

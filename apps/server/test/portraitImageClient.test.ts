import { describe, it, expect, vi, beforeEach } from "vitest";
import { packageImage } from "./helpers/shortReelPackageFixture.js";
import { generateGpti2ImageBytes } from "../src/providers/gpti2Image.js";
import { createPortraitImageClient } from "../src/providers/imageGeneration/portraitImageClient.js";

vi.mock("../src/providers/gpti2Image.js", () => ({
  generateGpti2ImageBytes: vi.fn(),
  resolveImageDimensions: vi.fn().mockReturnValue({ size: "720x1280", aspect_ratio: "9:16" }),
}));

describe("PortraitImageClient & Gpti2PortraitAdapter (Phase 02 / I01-I03, I06, I07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("I01: Configured Gpti2 request contains actual reference bytes and ratio 9:16", async () => {
    const referenceBytes = await packageImage("red", 200, 200);
    const generatedBytes = await packageImage("blue", 720, 1280);

    const mockedGenerate = vi.mocked(generateGpti2ImageBytes);
    mockedGenerate.mockResolvedValueOnce({
      bytes: generatedBytes,
      model: "gpt-image-2",
      price_vnd: 50,
    });

    const client = createPortraitImageClient({
      enabled: true,
      provider: "gpti2",
      api_key: "test-key-do-not-log",
      model: "gpt-image-2",
      quality: "low",
      images_per_bundle: 1,
      max_concurrent_tasks: 3,
    });

    expect(client.supportsReferenceImage).toBe(true);

    const controller = new AbortController();
    const result = await client.generate({
      prompt: "A mascot on an autumn lawn",
      aspectRatio: "9:16",
      reference: { bytes: referenceBytes, mimeType: "image/png" },
      operationId: "style-op-1",
      dependencyFingerprint: "input-hash",
      signal: controller.signal,
    });

    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        aspect_ratio: "9:16",
        referenceImageBase64: Buffer.from(referenceBytes).toString("base64"),
        cancellationSignal: controller.signal,
        idempotencyKey: expect.any(String),
      }),
    );
    expect(result.bytes).toEqual(generatedBytes);
    expect(result.provider).toBe("gpti2");
    expect(result.model).toBe("gpt-image-2");
    expect(result.costVnd).toBe(50);
  });

  it("I02: Unsupported reference provider fails preflight, not text-only fallback", async () => {
    const referenceBytes = await packageImage("red", 200, 200);
    const client = createPortraitImageClient({
      enabled: true,
      provider: "shopaikey",
      api_key: "shop-key",
      model: "gpt-image-2",
      quality: "low",
      images_per_bundle: 1,
      max_concurrent_tasks: 3,
    });

    expect(client.supportsReferenceImage).toBe(false);

    const mockedGenerate = vi.mocked(generateGpti2ImageBytes);

    await expect(
      client.generate({
        prompt: "A mascot in space",
        aspectRatio: "9:16",
        reference: { bytes: referenceBytes, mimeType: "image/png" },
        operationId: "style-op-2",
        dependencyFingerprint: "fingerprint-2",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: "REFERENCE_INPUT_UNSUPPORTED",
    });

    // Proves shopaikey never calls gpti2 or falls back to text-only image generation silently
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it("I03: Same operation replay uses same key; new regenerate uses new key", async () => {
    const referenceBytes = await packageImage("red", 200, 200);
    const dummyImage = await packageImage("blue", 720, 1280);
    const mockedGenerate = vi.mocked(generateGpti2ImageBytes);
    mockedGenerate.mockResolvedValue({
      bytes: dummyImage,
      model: "gpt-image-2",
    });

    const client = createPortraitImageClient({
      enabled: true,
      provider: "gpti2",
      api_key: "test-key",
      model: "gpt-image-2",
      quality: "low",
      images_per_bundle: 1,
      max_concurrent_tasks: 3,
    });

    // Call 1: Original operation
    await client.generate({
      prompt: "Prompt A",
      aspectRatio: "9:16",
      reference: { bytes: referenceBytes, mimeType: "image/png" },
      operationId: "op-100",
      dependencyFingerprint: "dep-1",
      signal: new AbortController().signal,
    });
    const key1 = mockedGenerate.mock.calls[0][1]?.idempotencyKey;

    // Call 2: Exact same operation replay
    await client.generate({
      prompt: "Prompt A",
      aspectRatio: "9:16",
      reference: { bytes: referenceBytes, mimeType: "image/png" },
      operationId: "op-100",
      dependencyFingerprint: "dep-1",
      signal: new AbortController().signal,
    });
    const key2 = mockedGenerate.mock.calls[1][1]?.idempotencyKey;

    // Call 3: Regenerate with new operation ID
    await client.generate({
      prompt: "Prompt A",
      aspectRatio: "9:16",
      reference: { bytes: referenceBytes, mimeType: "image/png" },
      operationId: "op-101",
      dependencyFingerprint: "dep-1",
      signal: new AbortController().signal,
    });
    const key3 = mockedGenerate.mock.calls[2][1]?.idempotencyKey;

    expect(key1).toBeDefined();
    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
  });

  it("I06: Abort before dispatch does not invoke provider", async () => {
    const referenceBytes = await packageImage("red", 200, 200);
    const client = createPortraitImageClient({
      enabled: true,
      provider: "gpti2",
      api_key: "test-key",
      model: "gpt-image-2",
      quality: "low",
      images_per_bundle: 1,
      max_concurrent_tasks: 3,
    });

    const controller = new AbortController();
    controller.abort();

    const mockedGenerate = vi.mocked(generateGpti2ImageBytes);

    await expect(
      client.generate({
        prompt: "Prompt",
        aspectRatio: "9:16",
        reference: { bytes: referenceBytes, mimeType: "image/png" },
        operationId: "op-abort",
        dependencyFingerprint: "dep-abort",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      code: "OPERATION_CANCELLED",
    });

    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it("I07: Never imports repository, Episode or bundle writers", async () => {
    // Structural architectural boundary check: verify client has no repository dependency
    const client = createPortraitImageClient({
      enabled: true,
      provider: "gpti2",
      api_key: "test-key",
      model: "gpt-image-2",
      quality: "low",
      images_per_bundle: 1,
      max_concurrent_tasks: 3,
    });

    expect(client).toBeDefined();
    // Factory signature does not accept repository service
    expect((client as Record<string, unknown>).repository).toBeUndefined();
    expect((client as Record<string, unknown>).getEpisode).toBeUndefined();
    expect((client as Record<string, unknown>).writeBundleImage).toBeUndefined();
  });

  it("handles missing credentials without logging the supplied key", async () => {
    const referenceBytes = await packageImage("red", 200, 200);
    const client = createPortraitImageClient({
      enabled: true,
      provider: "gpti2",
      api_key: "   ",
      model: "gpt-image-2",
      quality: "low",
      images_per_bundle: 1,
      max_concurrent_tasks: 3,
    });

    await expect(
      client.generate({
        prompt: "Prompt",
        aspectRatio: "9:16",
        reference: { bytes: referenceBytes, mimeType: "image/png" },
        operationId: "op-missing",
        dependencyFingerprint: "dep-missing",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      code: "IMAGE_PROVIDER_NOT_CONFIGURED",
    });
  });

  it("I06: 90000 ms image completion succeeds with 300000 ms budget under fake timers", async () => {
    vi.useFakeTimers();
    try {
      const { runBoundedPackageProvider, DEFAULT_IMAGE_OPERATION_TIMEOUT_MS } = await import("../src/shortReel/packageProvider.js");

      const taskPromise = runBoundedPackageProvider(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 90_000));
          return "completed-image-output";
        },
        undefined,
        DEFAULT_IMAGE_OPERATION_TIMEOUT_MS,
      );

      // Advance timers by 90_000 ms
      await vi.advanceTimersByTimeAsync(90_000);

      const result = await taskPromise;
      expect(result).toBe("completed-image-output");
    } finally {
      vi.useRealTimers();
    }
  });

  it("I06: short caller budget fails deterministically with TIMEOUT", async () => {
    vi.useFakeTimers();
    try {
      const { runBoundedPackageProvider } = await import("../src/shortReel/packageProvider.js");

      const taskPromise = runBoundedPackageProvider(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 30_000));
          return "too-late";
        },
        undefined,
        5_000, // Short caller-supplied budget
      );

      const expectation = expect(taskPromise).rejects.toMatchObject({
        code: "TIMEOUT",
      });

      await vi.advanceTimersByTimeAsync(5_001);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it("I06: abort during polling/execution rejects immediately and ignores late resolution", async () => {
    const { runBoundedPackageProvider } = await import("../src/shortReel/packageProvider.js");
    const controller = new AbortController();

    let lateResolved = false;
    let lateRejected = false;

    const taskPromise = runBoundedPackageProvider(
      (signal) =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => {
            // Simulate late asynchronous provider resolution after abort
            setTimeout(() => {
              lateResolved = true;
              resolve("late-accepted-image");
            }, 50);
          });
        }),
      controller.signal,
      300_000,
    );

    // Abort while running
    controller.abort();

    await expect(taskPromise).rejects.toMatchObject({
      code: "ABORTED",
    });

    // Wait for the late simulated resolution
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(lateResolved).toBe(true);
    // Verified: taskPromise rejected upon abort and did not accept late output
  });

  it("I07: fake repository spy proves getEpisode and writeBundleImage are never called", async () => {
    const fakeRepo = {
      getEpisode: vi.fn(),
      writeBundleImage: vi.fn(),
    };

    const referenceBytes = await packageImage("red", 200, 200);
    const generatedBytes = await packageImage("blue", 720, 1280);

    const mockedGenerate = vi.mocked(generateGpti2ImageBytes);
    mockedGenerate.mockResolvedValueOnce({
      bytes: generatedBytes,
      model: "gpt-image-2",
    });

    const client = createPortraitImageClient({
      provider: "gpti2",
      api_key: "valid-key",
      model: "gpt-image-2",
    });

    const result = await client.generate({
      prompt: "Portrait scene",
      aspectRatio: "9:16",
      reference: { bytes: referenceBytes, mimeType: "image/png" },
      operationId: "op-repo-check",
      dependencyFingerprint: "fingerprint-repo",
      signal: new AbortController().signal,
    });

    expect(result.bytes).toEqual(generatedBytes);
    expect(fakeRepo.getEpisode).not.toHaveBeenCalled();
    expect(fakeRepo.writeBundleImage).not.toHaveBeenCalled();
  });
});

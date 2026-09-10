import { describe, expect, it } from "vitest";
import { executeReelGeneration } from "../src/shortReel/generationWorkflow.js";
import { RepositoryError } from "../src/repository/errors.js";
import { createUpgradeFixture } from "./helpers/shortReelUpgradeFixture.js";
import { repairScript } from "./helpers/shortReelRepairFixture.js";
import type { PortraitImageClient, PortraitImageRequest } from "../src/providers/imageGeneration/imageGeneration.types.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { createTestImageBuffer } from "./shortReelRoutesTestUtils.js";
import type { ReelGenerationProgress } from "../src/shortReel/generation.types.js";

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Short-Reel Generation Workflow V2 (Concurrency & Ordering)", () => {
  it("W01: uses deferred promises to prove script -> style -> cover ordering and concurrent publishing", async () => {
    const f = await createUpgradeFixture();
    const order: string[] = [];
    const validImageBytes = await createTestImageBuffer(1080, 1920, { r: 10, g: 20, b: 30 });

    const styleDeferred = createDeferred<void>();

    const mockLlm: LLMClient = {
      connect: async () => {},
      generateContent: async (prompt: string) => {
        const p = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
        if (p.includes("copywriter") || p.includes("publishing")) {
          order.push("publishing");
          return {
            text: JSON.stringify({
              title: "Concurrent Publishing Title",
              description: "Publishing resolved concurrently while style was pending! #quiz #shorts",
            }),
          };
        }
        order.push("script");
        return {
          text: JSON.stringify(repairScript()),
        };
      },
    };

    const mockImageClient: PortraitImageClient = {
      supportsReferenceImage: true,
      generate: async (req: PortraitImageRequest) => {
        if (req.prompt.includes("portrait style")) {
          order.push("style_start");
          await styleDeferred.promise;
          order.push("style");
          return { bytes: validImageBytes, provider: "test", model: "m" };
        }
        order.push("cover");
        return { bytes: validImageBytes, provider: "test", model: "m" };
      },
    };

    const progressEvents: ReelGenerationProgress[] = [];
    const workflowPromise = executeReelGeneration(
      f.repo,
      f.key,
      {
        expected_revision: f.snapshot.revision,
        request_id: "order-test-req",
        target: "package",
        mode: "regenerate",
      },
      {
        imageClient: mockImageClient,
        llmClient: mockLlm,
        signal: new AbortController().signal,
        onProgress: async (p) => {
          progressEvents.push(p);
        },
      },
    );

    // Wait for script to complete, style to start, and publishing to resolve concurrently
    const start = Date.now();
    while ((!order.includes("style_start") || !order.includes("publishing")) && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 20));
    }

    expect(order).toContain("script");
    expect(order).toContain("style_start");
    expect(order).toContain("publishing");
    // Cover must NOT have started while style is pending
    expect(order).not.toContain("cover");

    // Now unblock style
    styleDeferred.resolve();

    const record = await workflowPromise;
    expect(record.units.script.state).toBe("ready");
    expect(record.units.references.state).toBe("ready");
    expect(record.units.cover.state).toBe("ready");
    expect(record.units.publishing.state).toBe("ready");

    // Assert strict ordering constraints
    expect(order.indexOf("script")).toBeLessThan(order.indexOf("style_start"));
    expect(order.indexOf("style")).toBeLessThan(order.indexOf("cover"));
  });

  it("W02: hold style pending, edit script: old style cannot overwrite references or trigger cover", async () => {
    const f = await createUpgradeFixture();
    const validImageBytes = await createTestImageBuffer(1080, 1920, { r: 50, g: 60, b: 70 });
    const styleDeferred = createDeferred<void>();

    const mockLlm: LLMClient = {
      connect: async () => {},
      generateContent: async (prompt: string) => {
        const p = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
        if (p.includes("publishing")) {
          return {
            text: JSON.stringify({
              title: "Publishing Title",
              description: "Description #tag",
            }),
          };
        }
        return { text: JSON.stringify(repairScript()) };
      },
    };

    let coverCalled = false;
    let styleStarted = false;
    const mockImageClient: PortraitImageClient = {
      supportsReferenceImage: true,
      generate: async (req: PortraitImageRequest) => {
        if (req.prompt.includes("portrait style")) {
          styleStarted = true;
          await styleDeferred.promise;
          return { bytes: validImageBytes, provider: "test", model: "m" };
        }
        coverCalled = true;
        return { bytes: validImageBytes, provider: "test", model: "m" };
      },
    };

    const workflowPromise = executeReelGeneration(
      f.repo,
      f.key,
      {
        expected_revision: f.snapshot.revision,
        request_id: "stale-script-edit-test",
        target: "package",
        mode: "regenerate",
      },
      {
        imageClient: mockImageClient,
        llmClient: mockLlm,
        signal: new AbortController().signal,
        onProgress: async () => {},
      },
    );

    // Allow script to complete and style to be held, and wait for publishing to settle
    const start = Date.now();
    while ((!styleStarted || (await f.repo.getShortReel(f.key)).units.publishing.state === "pending") && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 20));
    }

    // Now externally edit the script (retry on CAS conflict in case concurrent publishing just landed)
    const editedScript = repairScript();
    editedScript.segments[0].narrative = "Edited externally during style generation.";
    let scriptUpdated = false;
    for (let attempt = 0; attempt < 10 && !scriptUpdated; attempt++) {
      try {
        const current = await f.repo.getShortReel(f.key);
        await f.repo.updateShortReel(
          f.key,
          {
            expected_revision: current.revision,
            request_id: `external-script-edit-${attempt}`,
          },
          { kind: "update_script", script: editedScript },
        );
        scriptUpdated = true;
      } catch (err) {
        if (err instanceof RepositoryError && err.code === "REVISION_CONFLICT") {
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }
        throw err;
      }
    }

    // Unblock the stale style attempt
    styleDeferred.resolve();

    // The workflow should fail due to attempt rejection
    await expect(workflowPromise).rejects.toThrow();

    // Verify the edited script was preserved and cover was never generated from the old script
    const after = await f.repo.getShortReel(f.key);
    expect(after.script?.segments[0].narrative).toBe("Edited externally during style generation.");
    expect(coverCalled).toBe(false);
  });

  it("W03: completing publishing while style is pending does not invalidate sibling fingerprints", async () => {
    const f = await createUpgradeFixture();
    const validImageBytes = await createTestImageBuffer(1080, 1920, { r: 80, g: 90, b: 100 });
    const styleDeferred = createDeferred<void>();

    const mockLlm: LLMClient = {
      connect: async () => {},
      generateContent: async () => ({
        text: JSON.stringify({
          title: "Independent Publishing Title",
          description: "Publishing finished first! #tag",
        }),
      }),
    };

    const mockImageClient: PortraitImageClient = {
      supportsReferenceImage: true,
      generate: async (req: PortraitImageRequest) => {
        if (req.prompt.includes("portrait style")) {
          await styleDeferred.promise;
          return { bytes: validImageBytes, provider: "test", model: "m" };
        }
        return { bytes: validImageBytes, provider: "test", model: "m" };
      },
    };

    const workflowPromise = executeReelGeneration(
      f.repo,
      f.key,
      {
        expected_revision: f.snapshot.revision,
        request_id: "sibling-invalidation-test",
        target: "package",
        mode: "repair",
      },
      {
        imageClient: mockImageClient,
        llmClient: mockLlm,
        signal: new AbortController().signal,
        onProgress: async () => {},
      },
    );

    // Wait for publishing to complete and accept while style is held
    const pollStart = Date.now();
    let during = await f.repo.getShortReel(f.key);
    while (during.units.publishing.state !== "ready" && Date.now() - pollStart < 3000) {
      await new Promise((r) => setTimeout(r, 20));
      during = await f.repo.getShortReel(f.key);
    }

    expect(during.units.publishing.state).toBe("ready");

    // Unblock style
    styleDeferred.resolve();
    const finalRecord = await workflowPromise;

    expect(finalRecord.units.publishing.state).toBe("ready");
    expect(finalRecord.units.references.state).toBe("ready");
    expect(finalRecord.units.cover.state).toBe("ready");
  });

  it("W04: cancel while both branches are pending ensures neither payload is accepted", async () => {
    const f = await createUpgradeFixture();
    const validImageBytes = await createTestImageBuffer(1080, 1920, { r: 110, g: 120, b: 130 });
    const styleDeferred = createDeferred<void>();
    const pubDeferred = createDeferred<void>();
    const abortCtrl = new AbortController();

    const mockLlm: LLMClient = {
      connect: async () => {},
      generateContent: async () => {
        await pubDeferred.promise;
        return {
          text: JSON.stringify({
            title: "Late Cancel Title",
            description: "Late cancel description #tag",
          }),
        };
      },
    };

    const mockImageClient: PortraitImageClient = {
      supportsReferenceImage: true,
      generate: async () => {
        await styleDeferred.promise;
        return { bytes: validImageBytes, provider: "test", model: "m" };
      },
    };

    const workflowPromise = executeReelGeneration(
      f.repo,
      f.key,
      {
        expected_revision: f.snapshot.revision,
        request_id: "cancel-concurrency-test",
        target: "package",
        mode: "repair",
      },
      {
        imageClient: mockImageClient,
        llmClient: mockLlm,
        signal: abortCtrl.signal,
        onProgress: async () => {},
      },
    );

    // Wait for branches to be in flight
    await new Promise((r) => setTimeout(r, 60));

    // Abort the workflow
    abortCtrl.abort();

    // Now resolve late
    styleDeferred.resolve();
    pubDeferred.resolve();

    await expect(workflowPromise).rejects.toThrow();

    const record = await f.repo.getShortReel(f.key);
    expect(record.units.references.state).not.toBe("ready");
    expect(record.units.publishing.state).not.toBe("ready");
  });

  it("W05: when cover fails but publishing passes, repair again only generates cover", async () => {
    const f = await createUpgradeFixture();
    const validImageBytes = await createTestImageBuffer(1080, 1920, { r: 140, g: 150, b: 160 });

    let coverShouldFail = true;
    let coverGenerationCount = 0;
    let publishingGenerationCount = 0;
    let styleGenerationCount = 0;

    const mockLlm: LLMClient = {
      connect: async () => {},
      generateContent: async () => {
        publishingGenerationCount++;
        return {
          text: JSON.stringify({
            title: "Successful Publishing Copy",
            description: "Publishing succeeds while cover fails. #tag",
          }),
        };
      },
    };

    const mockImageClient: PortraitImageClient = {
      supportsReferenceImage: true,
      generate: async (req: PortraitImageRequest) => {
        if (req.prompt.includes("portrait style")) {
          styleGenerationCount++;
          return { bytes: validImageBytes, provider: "test", model: "m" };
        }
        coverGenerationCount++;
        if (coverShouldFail) {
          throw new Error("Cover render timeout simulation");
        }
        return { bytes: validImageBytes, provider: "test", model: "m" };
      },
    };

    // Run 1: cover fails
    await expect(
      executeReelGeneration(
        f.repo,
        f.key,
        {
          expected_revision: f.snapshot.revision,
          request_id: "repair-cover-test-1",
          target: "package",
          mode: "repair",
        },
        {
          imageClient: mockImageClient,
          llmClient: mockLlm,
          signal: new AbortController().signal,
          onProgress: async () => {},
        },
      ),
    ).rejects.toThrow();

    const afterFail = await f.repo.getShortReel(f.key);
    expect(afterFail.units.script.state).toBe("ready");
    expect(afterFail.units.references.state).toBe("ready");
    expect(afterFail.units.publishing.state).toBe("ready");
    expect(afterFail.units.cover.state).toBe("failed");

    expect(styleGenerationCount).toBe(1);
    expect(publishingGenerationCount).toBe(1);
    expect(coverGenerationCount).toBe(1);

    // Run 2: repair with cover allowed to succeed
    coverShouldFail = false;
    const repaired = await executeReelGeneration(
      f.repo,
      f.key,
      {
        expected_revision: afterFail.revision,
        request_id: "repair-cover-test-2",
        target: "package",
        mode: "repair",
      },
      {
        imageClient: mockImageClient,
        llmClient: mockLlm,
        signal: new AbortController().signal,
        onProgress: async () => {},
      },
    );

    expect(repaired.units.cover.state).toBe("ready");
    expect(repaired.units.publishing.state).toBe("ready");
    expect(repaired.units.references.state).toBe("ready");

    // Proves only cover was regenerated; style and publishing were reused!
    expect(styleGenerationCount).toBe(1);
    expect(publishingGenerationCount).toBe(1);
    expect(coverGenerationCount).toBe(2);
  });

  it("W06: fail style after script success: repair reuses script, retries style, and cover follows new style", async () => {
    const f = await createUpgradeFixture();
    const validImageBytes = await createTestImageBuffer(1080, 1920, { r: 170, g: 180, b: 190 });

    let styleShouldFail = true;
    let styleGenerationCount = 0;
    let coverGenerationCount = 0;

    const mockLlm: LLMClient = {
      connect: async () => {},
      generateContent: async () => ({
        text: JSON.stringify({
          title: "Publishing Passed",
          description: "Publishing passed on run 1. #tag",
        }),
      }),
    };

    const mockImageClient: PortraitImageClient = {
      supportsReferenceImage: true,
      generate: async (req: PortraitImageRequest) => {
        if (req.prompt.includes("portrait style")) {
          styleGenerationCount++;
          if (styleShouldFail) {
            throw new Error("Simulated style generation provider failure");
          }
          return { bytes: validImageBytes, provider: "test", model: "m" };
        }
        coverGenerationCount++;
        return { bytes: validImageBytes, provider: "test", model: "m" };
      },
    };

    // Run 1: style fails
    await expect(
      executeReelGeneration(
        f.repo,
        f.key,
        {
          expected_revision: f.snapshot.revision,
          request_id: "fail-style-run-1",
          target: "package",
          mode: "repair",
        },
        {
          imageClient: mockImageClient,
          llmClient: mockLlm,
          signal: new AbortController().signal,
          onProgress: async () => {},
        },
      ),
    ).rejects.toThrow();

    const afterFail = await f.repo.getShortReel(f.key);
    expect(afterFail.units.script.state).toBe("ready");
    expect(afterFail.units.references.state).toBe("failed");
    // Cover was not generated because style failed
    expect(coverGenerationCount).toBe(0);

    // Run 2: repair
    styleShouldFail = false;
    const repaired = await executeReelGeneration(
      f.repo,
      f.key,
      {
        expected_revision: afterFail.revision,
        request_id: "repair-style-run-2",
        target: "package",
        mode: "repair",
      },
      {
        imageClient: mockImageClient,
        llmClient: mockLlm,
        signal: new AbortController().signal,
        onProgress: async () => {},
      },
    );

    expect(repaired.units.references.state).toBe("ready");
    expect(repaired.units.cover.state).toBe("ready");
    expect(styleGenerationCount).toBe(2);
    expect(coverGenerationCount).toBe(1);
  });
});

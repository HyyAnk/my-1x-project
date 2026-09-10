import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { generateReelStyleReferences } from "../src/shortReel/styleImageService.js";
import { buildReelStylePrompt } from "../src/shortReel/stylePrompt.js";
import { packageImage } from "./helpers/shortReelPackageFixture.js";
import { createUpgradeFixture, fakePortraitClient } from "./helpers/shortReelUpgradeFixture.js";

describe("ShortReel style image generation", () => {
  it("generates a portrait scene without a global style anchor", async () => {
    const f = await createUpgradeFixture();
    try {
      const imageBytes = await packageImage("green", 720, 1280);
      const generateSpy = vi.fn(async () => ({
        bytes: imageBytes,
        provider: "test",
        model: "fixture-model",
      }));
      const client = { supportsReferenceImage: true, generate: generateSpy };
      const payload = await generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "style-test-op", f.signal);

      expect(payload.references.map((item) => item.role)).toEqual(["mascot", "style"]);
      expect(payload.references[1]).toMatchObject({ width: 1080, height: 1920 });
      expect(generateSpy).toHaveBeenCalledTimes(1);
      const firstCall = generateSpy.mock.calls[0][0];
      expect(firstCall.aspectRatio).toBe("9:16");
      expect(firstCall.reference?.bytes).toBeInstanceOf(Uint8Array);
      expect((await f.repo.getMascot(f.mascot.id)).styles[0].anchor_image_url).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("buildReelStylePrompt compiles pure prompt with 9:16 portrait constraints and no forbidden artifacts", async () => {
    const f = await createUpgradeFixture();
    try {
      const prompt = buildReelStylePrompt(f.snapshot);

      expect(prompt).toContain("9:16");
      expect(prompt).toContain(f.snapshot.visual_context!.mascot_name);
      expect(prompt).toContain(f.snapshot.visual_context!.art_direction);
      expect(prompt).toContain(f.snapshot.script!.segments[0].start_state.environment);
      expect(prompt).toContain("DO NOT create a collage");
      expect(prompt).toContain("DO NOT include thumbnail text");
      expect(prompt).toContain("DO NOT include watermarks");
      expect(prompt).toContain("DO NOT isolate the character on a plain white");
    } finally {
      await f.cleanup();
    }
  });

  it("rejects style generation when script is missing or stale without mutating record", async () => {
    const f = await createUpgradeFixture();
    try {
      const client = fakePortraitClient(await packageImage("green", 720, 1280));
      const staleSnapshot = {
        ...f.snapshot,
        units: {
          ...f.snapshot.units,
          script: {
            ...f.snapshot.units.script,
            state: "stale" as const,
          },
        },
      };

      await expect(generateReelStyleReferences(f.repo, f.key, staleSnapshot, client, "stale-script-op", f.signal)).rejects.toMatchObject({
        name: "GenerationError",
        code: "STALE_DEPENDENCY",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.references.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects style generation when visual context is missing without mutating record", async () => {
    const f = await createUpgradeFixture();
    try {
      const client = fakePortraitClient(await packageImage("green", 720, 1280));
      const noContextSnapshot = {
        ...f.snapshot,
        visual_context: null,
      };

      await expect(generateReelStyleReferences(f.repo, f.key, noContextSnapshot, client, "no-ctx-op", f.signal)).rejects.toMatchObject({
        name: "GenerationError",
        code: "MISSING_REFERENCE",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.references.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects style generation when signal is cancelled", async () => {
    const f = await createUpgradeFixture();
    try {
      const client = fakePortraitClient(await packageImage("green", 720, 1280));
      const controller = new AbortController();
      controller.abort();

      await expect(generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "cancelled-op", controller.signal)).rejects.toMatchObject(
        {
          name: "GenerationError",
          code: "OPERATION_CANCELLED",
        },
      );

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.references.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects style generation on provider error without mutating record", async () => {
    const f = await createUpgradeFixture();
    try {
      const client = {
        supportsReferenceImage: true,
        generate: vi.fn(() => Promise.reject(new Error("Provider internal outage"))),
      };

      await expect(generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "provider-err-op", f.signal)).rejects.toMatchObject({
        name: "GenerationError",
        code: "PROVIDER_ERROR",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.references.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects non-portrait output with INVALID_DIMENSIONS", async () => {
    const f = await createUpgradeFixture();
    try {
      // Landscape 1280x720 instead of portrait 720x1280
      const client = fakePortraitClient(await packageImage("green", 1280, 720));

      await expect(generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "bad-ratio-op", f.signal)).rejects.toMatchObject({
        name: "GenerationError",
        code: "INVALID_DIMENSIONS",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.references.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects style generation when mascot is modified during generation", async () => {
    const f = await createUpgradeFixture();
    try {
      const client = {
        supportsReferenceImage: true,
        generate: vi.fn(async () => {
          // Mutate mascot while generation is supposedly running
          const mascot = await f.repo.getMascot(f.mascot.id);
          const newMaster = await f.repo.saveMascotAsset(f.mascot.id, "new-master.png", await packageImage("yellow", 200, 200));
          await f.repo.saveMascot({
            ...mascot,
            master_image_url: newMaster,
          });
          return {
            bytes: await packageImage("green", 720, 1280),
            provider: "test",
            model: "fixture-model",
          };
        }),
      };

      await expect(generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "mascot-changed-op", f.signal)).rejects.toMatchObject({
        name: "GenerationError",
        code: "STALE_DEPENDENCY",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.references.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("preserves original mascot master bytes and checksum intact", async () => {
    const f = await createUpgradeFixture();
    try {
      const originalMasterFile = await f.repo.getMascotAssetFile(f.mascot.id, "master.png");
      const originalBytes = await readFile(originalMasterFile.absolutePath);

      const client = fakePortraitClient(await packageImage("green", 720, 1280));
      const payload = await generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "checksum-op", f.signal);

      const afterMasterFile = await f.repo.getMascotAssetFile(f.mascot.id, "master.png");
      const afterBytes = await readFile(afterMasterFile.absolutePath);

      expect(Buffer.compare(originalBytes, afterBytes)).toBe(0);
      expect(payload.references[0].checksum).toBe(f.snapshot.visual_context!.mascot_checksum);
    } finally {
      await f.cleanup();
    }
  });

  it.todo("successful references acceptance does not invalidate the accepted script after Phase 05 integration");
});

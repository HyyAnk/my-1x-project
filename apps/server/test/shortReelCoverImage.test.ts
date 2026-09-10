import { describe, expect, it, vi } from "vitest";
import { generateReelCoverPayload } from "../src/shortReel/coverImageService.js";
import { buildReelCoverPrompt } from "../src/shortReel/coverPrompt.js";
import { GenerationError } from "../src/shortReel/generationErrors.js";
import { generateReelStyleReferences } from "../src/shortReel/styleImageService.js";
import { packageImage } from "./helpers/shortReelPackageFixture.js";
import { createUpgradeFixture, fakePortraitClient } from "./helpers/shortReelUpgradeFixture.js";

async function createFixtureWithReadyReferences() {
  const f = await createUpgradeFixture();
  const styleClient = fakePortraitClient(await packageImage("green", 720, 1280));
  const stylePayload = await generateReelStyleReferences(f.repo, f.key, f.snapshot, styleClient, "setup-style-op", f.signal);

  const snapshotWithReadyReferences = await f.repo.updateShortReel(
    f.key,
    {
      expected_revision: (await f.repo.getShortReel(f.key)).revision,
      request_id: "accept-style-refs",
    },
    { kind: "update_references", references: stylePayload },
  );

  return { ...f, snapshotWithReadyReferences };
}

describe("ShortReel cover image generation", () => {
  it("generates a 1080x1920 portrait cover without calling Episode lookup or bundle writer", async () => {
    const f = await createFixtureWithReadyReferences();
    try {
      const getEpisode = vi.spyOn(f.repo, "getEpisode").mockRejectedValue(new Error("Episode lookup is forbidden"));
      const writeBundle = vi.spyOn(f.repo, "writeBundleImage").mockRejectedValue(new Error("Episode writer is forbidden"));
      const client = fakePortraitClient(await packageImage("blue", 720, 1280));

      const cover = await generateReelCoverPayload(f.repo, f.key, f.snapshotWithReadyReferences, client, "cover-test-op", f.signal);

      expect(cover).toMatchObject({ width: 1080, height: 1920, mime_type: "image/png" });
      expect(cover.path).toContain(`/short_reels/${f.key.reel_id}/assets/`);
      expect(getEpisode).not.toHaveBeenCalled();
      expect(writeBundle).not.toHaveBeenCalled();
    } finally {
      await f.cleanup();
    }
  });

  it("buildReelCoverPrompt includes narrative, mascot, art direction, portrait safe area, and excludes answer spoiler", async () => {
    const f = await createFixtureWithReadyReferences();
    try {
      const prompt = buildReelCoverPrompt(f.snapshotWithReadyReferences);

      expect(prompt).toContain(f.snapshotWithReadyReferences.visual_context!.mascot_name);
      expect(prompt).toContain(f.snapshotWithReadyReferences.visual_context!.art_direction);
      expect(prompt).toContain("9:16");
      expect(prompt).toContain("safe");
      expect(prompt).toContain("DO NOT reveal");
      expect(prompt).not.toContain("multi-question grid");
    } finally {
      await f.cleanup();
    }
  });

  it("rejects cover generation when references are missing or stale without mutating record", async () => {
    const f = await createFixtureWithReadyReferences();
    try {
      const client = fakePortraitClient(await packageImage("blue", 720, 1280));
      const staleSnapshot = {
        ...f.snapshotWithReadyReferences,
        units: {
          ...f.snapshotWithReadyReferences.units,
          references: {
            ...f.snapshotWithReadyReferences.units.references,
            state: "stale" as const,
          },
        },
      };

      await expect(generateReelCoverPayload(f.repo, f.key, staleSnapshot, client, "stale-refs-op", f.signal)).rejects.toMatchObject({
        name: "GenerationError",
        code: "STALE_DEPENDENCY",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.cover.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects cover generation when references changed during generation", async () => {
    const f = await createFixtureWithReadyReferences();
    try {
      const client = {
        supportsReferenceImage: true,
        generate: vi.fn(async () => {
          // Mutate references while cover generation is in-flight
          const otherPayload = {
            references: [
              f.snapshotWithReadyReferences.units.references.last_accepted_payload!.references[0],
              {
                ...f.snapshotWithReadyReferences.units.references.last_accepted_payload!.references[1],
                checksum: "tampered-checksum-during-flight",
              },
            ],
          };
          await f.repo.updateShortReel(
            f.key,
            {
              expected_revision: (await f.repo.getShortReel(f.key)).revision,
              request_id: "concurrent-refs-update",
            },
            { kind: "update_references", references: otherPayload },
          );
          return {
            bytes: await packageImage("blue", 720, 1280),
            provider: "test",
            model: "fixture-model",
          };
        }),
      };

      await expect(
        generateReelCoverPayload(f.repo, f.key, f.snapshotWithReadyReferences, client, "concurrent-op", f.signal),
      ).rejects.toMatchObject({
        name: "GenerationError",
        code: "STALE_DEPENDENCY",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.cover.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects cover generation on cancelled signal", async () => {
    const f = await createFixtureWithReadyReferences();
    try {
      const client = fakePortraitClient(await packageImage("blue", 720, 1280));
      const controller = new AbortController();
      controller.abort();

      await expect(
        generateReelCoverPayload(f.repo, f.key, f.snapshotWithReadyReferences, client, "cancelled-cover-op", controller.signal),
      ).rejects.toMatchObject({
        name: "GenerationError",
        code: "OPERATION_CANCELLED",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.cover.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects cover generation on provider error without mutating record", async () => {
    const f = await createFixtureWithReadyReferences();
    try {
      const client = {
        supportsReferenceImage: true,
        generate: vi.fn(async () => {
          throw new Error("Provider rate limit or crash");
        }),
      };

      await expect(
        generateReelCoverPayload(f.repo, f.key, f.snapshotWithReadyReferences, client, "provider-err-cover-op", f.signal),
      ).rejects.toMatchObject({
        name: "GenerationError",
        code: "PROVIDER_ERROR",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.cover.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("rejects non-portrait cover output with INVALID_DIMENSIONS", async () => {
    const f = await createFixtureWithReadyReferences();
    try {
      const client = fakePortraitClient(await packageImage("blue", 1280, 720));

      await expect(
        generateReelCoverPayload(f.repo, f.key, f.snapshotWithReadyReferences, client, "bad-ratio-cover-op", f.signal),
      ).rejects.toMatchObject({
        name: "GenerationError",
        code: "INVALID_DIMENSIONS",
      });

      const currentReel = await f.repo.getShortReel(f.key);
      expect(currentReel.units.cover.last_accepted_payload).toBeNull();
    } finally {
      await f.cleanup();
    }
  });
});

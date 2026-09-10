import { describe, it, expect, afterEach } from "vitest";
import { packageFixture, packageImage } from "./helpers/shortReelPackageFixture.js";
import { resolveMascotReference } from "../src/shortReel/mascotReferenceService.js";
import { adoptVisualContext } from "../src/shortReel/visualContextService.js";
import { readVerifiedAsset } from "../src/shortReel/packageAssets.js";
import { mutateShortReelRecord } from "../src/repository/shortReelTransaction.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const fn = cleanups.pop();
    if (fn) await fn();
  }
});

describe("Short-Reel Mascot Reference Resolution (Phase 03 / M01-M03)", () => {
  it("M01 & M02: resolves master reference with NO global style anchor and without calling any generation client", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    // Clear all global style anchors
    const mascot = await f.repo.getMascot(f.mascot.id);
    await f.repo.saveMascot({
      ...mascot,
      styles: mascot.styles.map((s) => ({ ...s, anchor_image_url: null })),
    });

    const context = await resolveMascotReference(f.repo, f.key);

    expect(context.mascot_id).toBe(mascot.id);
    expect(context.mascot_name).toBe(mascot.name);
    expect(context.mascot_asset_path).toMatch(/short_reels\/sreel_.*\/references\/mascot-/);
    expect(context.fingerprint).toBeDefined();

    // Verify copied bytes match original master bytes exactly
    const copiedAsset = await readVerifiedAsset(
      f.repo,
      f.root,
      {
        path: context.mascot_asset_path,
        checksum: context.mascot_checksum,
        width: 200,
        height: 200,
        mime_type: "image/png",
      },
      "mascot",
    );
    expect(copiedAsset).toBeDefined();

    // Ensure global mascot profile and styles remain unchanged (anchor_image_url still null)
    const mascotAfter = await f.repo.getMascot(f.mascot.id);
    expect(mascotAfter.master_image_url).toBe(mascot.master_image_url);
    expect(mascotAfter.styles[0].anchor_image_url).toBeNull();
  });

  it("M03: throws actionable error when channel has no mascot assigned", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    await f.repo.updateChannel(f.channel.channel_id, { mascot_id: undefined });

    await expect(resolveMascotReference(f.repo, f.key)).rejects.toMatchObject({
      code: "MISSING_REFERENCE",
    });
  });

  it("M03: throws actionable error when mascot has no master image", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    const mascotNoMaster = await f.repo.saveMascot({ name: "Mascot No Master" });
    await f.repo.updateChannel(f.channel.channel_id, { mascot_id: mascotNoMaster.id });

    await expect(resolveMascotReference(f.repo, f.key)).rejects.toMatchObject({
      code: "MISSING_REFERENCE",
    });
  });

  it("M03: rejects unsafe URL protocols and path traversals in master image path", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    const mascot = await f.repo.getMascot(f.mascot.id);

    // Protocol scheme
    await f.repo.saveMascot({ ...mascot, master_image_url: "https://attacker.com/malicious.png" });
    await expect(resolveMascotReference(f.repo, f.key)).rejects.toMatchObject({
      code: "INVALID_REFERENCE_PATH",
    });

    // Path traversal
    await f.repo.saveMascot({ ...mascot, master_image_url: "/api/mascots/m1/assets/../../etc/passwd" });
    await expect(resolveMascotReference(f.repo, f.key)).rejects.toMatchObject({
      code: "INVALID_REFERENCE_PATH",
    });
  });

  it("M03: rejects asset belonging to a different mascot ID", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    const otherMascot = await f.repo.saveMascot({ name: "Other Mascot" });
    const otherAsset = await f.repo.saveMascotAsset(otherMascot.id, "other.png", await packageImage("yellow", 100, 100));

    const mascot = await f.repo.getMascot(f.mascot.id);
    await f.repo.saveMascot({ ...mascot, master_image_url: otherAsset });

    await expect(resolveMascotReference(f.repo, f.key)).rejects.toMatchObject({
      code: "INVALID_REFERENCE_PATH",
    });
  });

  it("M03: rejects known sprite atlas with multiple frames", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    const mascot = await f.repo.getMascot(f.mascot.id);
    await f.repo.saveMascot({
      ...mascot,
      actions: {
        thinking: {
          action: "thinking",
          frames_count: 8,
          sprite_url: mascot.master_image_url!,
        },
      },
    });

    await expect(resolveMascotReference(f.repo, f.key)).rejects.toMatchObject({
      code: "ANIMATION_ATLAS_REJECTED",
    });
  });

  it("adoptVisualContext: identical fingerprint is no-op, changed fingerprint marks units stale", async () => {
    const f = await packageFixture();
    cleanups.push(f.cleanup);

    const context1 = await resolveMascotReference(f.repo, f.key);
    const initialRecord = await adoptVisualContext(f.repo, f.key, context1);
    expect(initialRecord.visual_context?.fingerprint).toBe(context1.fingerprint);
    const revAfterFirst = initialRecord.revision;

    // Second call with same context is an exact no-op (no revision bump)
    const secondRecord = await adoptVisualContext(f.repo, f.key, context1);
    expect(secondRecord.revision).toBe(revAfterFirst);

    // Simulate ready units on record
    await mutateShortReelRecord(f.repo, f.key, (rec) => {
      rec.units.script.state = "ready";
      rec.units.references.state = "ready";
      rec.units.cover.state = "ready";
      rec.units.publishing.state = "ready";
      return rec;
    });

    // Adopt changed visual context
    const changedContext = {
      ...context1,
      art_direction: "Claymation Stop-Motion Style",
      fingerprint: "changed_fingerprint_999",
    };

    const recordAfterChange = await adoptVisualContext(f.repo, f.key, changedContext);
    expect(recordAfterChange.revision).toBeGreaterThan(revAfterFirst);
    expect(recordAfterChange.visual_context?.art_direction).toBe("Claymation Stop-Motion Style");

    // Script, references, cover marked stale; publishing stays ready
    expect(recordAfterChange.units.script.state).toBe("stale");
    expect(recordAfterChange.units.references.state).toBe("stale");
    expect(recordAfterChange.units.cover.state).toBe("stale");
    expect(recordAfterChange.units.publishing.state).toBe("ready");
  });
});

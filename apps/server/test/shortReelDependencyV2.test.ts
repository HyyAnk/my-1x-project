import { describe, expect, it } from "vitest";
import { affectedReelUnits, computeDependencyFingerprint, invalidatedDownstreamSegments } from "../src/shortReel/dependencyPolicy.js";
import { generateReelStyleReferences } from "../src/shortReel/styleImageService.js";
import { packageImage } from "./helpers/shortReelPackageFixture.js";
import { repairScript } from "./helpers/shortReelRepairFixture.js";
import { createUpgradeFixture, fakePortraitClient } from "./helpers/shortReelUpgradeFixture.js";

describe("ShortReel Dependency Matrix & Invalidation Policy (Phase 05)", () => {
  it("D01: references acceptance does not mark script stale and refreshes compiled prompts", async () => {
    const f = await createUpgradeFixture();
    try {
      const client = fakePortraitClient(await packageImage("green", 720, 1280));
      const generatedReferences = await generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "style-op-d01", f.signal);

      const before = await f.repo.getShortReel(f.key);
      const after = await f.repo.updateShortReel(
        f.key,
        {
          expected_revision: before.revision,
          request_id: "accept-style",
        },
        { kind: "update_references", references: generatedReferences },
      );

      expect(after.units.script.state).toBe("ready");
      expect(after.script).toEqual(before.script);
      expect(after.units.script.last_accepted_payload?.compiled_prompts).toHaveLength(3);
      expect(after.units.references.state).toBe("ready");
      expect(after.units.references.accepted_dependency_fingerprint).not.toBeNull();
    } finally {
      await f.cleanup();
    }
  });

  it("D02: script edit marks references, cover, and publishing stale while preserving payloads", async () => {
    const f = await createUpgradeFixture();
    try {
      // 1. Accept references
      const styleClient = fakePortraitClient(await packageImage("green", 720, 1280));
      const stylePayload = await generateReelStyleReferences(f.repo, f.key, f.snapshot, styleClient, "style-op", f.signal);
      const withRefs = await f.repo.updateShortReel(
        f.key,
        { expected_revision: (await f.repo.getShortReel(f.key)).revision, request_id: "refs-setup" },
        { kind: "update_references", references: stylePayload },
      );

      // 2. Accept publishing
      const withPub = await f.repo.updateShortReel(
        f.key,
        { expected_revision: withRefs.revision, request_id: "pub-setup" },
        {
          kind: "update_publishing",
          publishing: { title: "Title 1", description: "Desc 1 #Shorts" },
        },
      );

      // 3. Edit script
      const editedScript = repairScript();
      editedScript.segments[0].narrative = "Completely altered opening narrative.";
      const afterScriptEdit = await f.repo.updateShortReel(
        f.key,
        { expected_revision: withPub.revision, request_id: "script-edit" },
        { kind: "update_script", script: editedScript },
      );

      // Matrix verification: script is ready, downstream units become stale
      expect(afterScriptEdit.units.script.state).toBe("ready");
      expect(afterScriptEdit.units.references.state).toBe("stale");
      expect(afterScriptEdit.units.publishing.state).toBe("stale");
      expect(afterScriptEdit.units.cover.state).toBe("missing"); // Had no prior accepted payload

      // Preserves existing payloads for visual continuity/fallback
      expect(afterScriptEdit.units.references.last_accepted_payload).toEqual(stylePayload);
      expect(afterScriptEdit.units.publishing.last_accepted_payload).toEqual({
        title: "Title 1",
        description: "Desc 1 #Shorts",
      });
    } finally {
      await f.cleanup();
    }
  });

  it("D03: cover and publishing sibling completions do not invalidate each other", async () => {
    const f = await createUpgradeFixture();
    try {
      const client = fakePortraitClient(await packageImage("green", 720, 1280));
      const stylePayload = await generateReelStyleReferences(f.repo, f.key, f.snapshot, client, "style-op", f.signal);
      const withRefs = await f.repo.updateShortReel(
        f.key,
        { expected_revision: (await f.repo.getShortReel(f.key)).revision, request_id: "refs-setup" },
        { kind: "update_references", references: stylePayload },
      );

      // 1. Accept publishing
      const withPub = await f.repo.updateShortReel(
        f.key,
        { expected_revision: withRefs.revision, request_id: "pub-first" },
        {
          kind: "update_publishing",
          publishing: { title: "Sibling Test", description: "Desc #Shorts" },
        },
      );
      expect(withPub.units.publishing.state).toBe("ready");

      // 2. Accept cover
      const withCover = await f.repo.updateShortReel(
        f.key,
        { expected_revision: withPub.revision, request_id: "cover-second" },
        {
          kind: "update_cover",
          cover: {
            asset_id: "cover-sibling-test",
            path: "channels/test/short_reels/test/assets/cover.png",
            mime_type: "image/png",
            width: 1080,
            height: 1920,
            checksum: "mock-checksum",
          },
        },
      );

      // Sibling publishing MUST remain ready!
      expect(withCover.units.cover.state).toBe("ready");
      expect(withCover.units.publishing.state).toBe("ready");
    } finally {
      await f.cleanup();
    }
  });

  it("D04: model note edit updates model_note and refreshes compiled prompts without invalidating deliverables", async () => {
    const f = await createUpgradeFixture();
    try {
      const before = await f.repo.getShortReel(f.key);
      const after = await f.repo.updateShortReel(
        f.key,
        { expected_revision: before.revision, request_id: "note-edit" },
        { kind: "update_model_note", model_note: "Emphasize dramatic shadows" },
      );

      expect(after.model_note).toBe("Emphasize dramatic shadows");
      expect(after.units.script.state).toBe("ready");
      expect(after.units.script.last_accepted_payload?.compiled_prompts).toHaveLength(3);
      expect(after.units.script.last_accepted_payload?.compiled_prompts![0]).toContain("Emphasize dramatic shadows");
    } finally {
      await f.cleanup();
    }
  });

  it("D05: segment continuity invalidation propagates downstream segments 1->2,3 and 2->3", () => {
    expect(invalidatedDownstreamSegments(1)).toEqual([2, 3]);
    expect(invalidatedDownstreamSegments(2)).toEqual([3]);
    expect(invalidatedDownstreamSegments(3)).toEqual([]);
  });

  it("D06: affectedReelUnits adheres to the matrix table", () => {
    expect(affectedReelUnits({ kind: "update_model_note", model_note: "note" })).toEqual([]);
    expect(affectedReelUnits({ kind: "update_cover", cover: {} as any })).toEqual(["cover"]);
    expect(affectedReelUnits({ kind: "update_publishing", publishing: {} as any })).toEqual(["publishing"]);
    expect(affectedReelUnits({ kind: "update_references", references: {} as any })).toEqual(["references", "cover"]);
    expect(affectedReelUnits({ kind: "update_script", script: {} as any })).toEqual(["script", "references", "cover", "publishing"]);
    expect(affectedReelUnits({ kind: "replace_source_question", source: {} as any })).toEqual([
      "references",
      "script",
      "cover",
      "publishing",
    ]);
  });
});

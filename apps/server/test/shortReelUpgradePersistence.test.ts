import { describe, it, expect } from "vitest";
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { packageFixture } from "./helpers/shortReelPackageFixture.js";
import { resolveShortReelFile } from "../src/repository/shortReelStorage.js";
import { mutateShortReelRecord } from "../src/repository/shortReelTransaction.js";
import { RepositoryError } from "../src/repository/errors.js";

function makeLegacyV1Json(record: any) {
  const legacy = structuredClone(record);
  legacy.schema_version = 1;
  delete legacy.visual_context;
  for (const unit of Object.values(legacy.units as Record<string, any>)) {
    delete unit.accepted_dependency_fingerprint;
  }
  legacy.units.publishing = {
    state: "ready",
    last_accepted_payload: {
      hook: "Old Hook 101",
      description: "Old description text.",
      cta: "Click here to see more!",
      hashtags: ["#quiz", "#trivia"],
    },
    current_attempt: null,
  };
  return JSON.stringify(legacy, null, 2);
}

describe("Short-Reel V1 Upgrade and Persistence Safety", () => {
  it("C01: loads legacy v1 record as canonical v2 without writing to disk or creating backup", async () => {
    const f = await packageFixture();
    try {
      const reelFile = resolveShortReelFile(f.repo.roots, f.channel.slug, f.key.reel_id);
      const originalRecord = await f.repo.getShortReel(f.key);
      const v1Json = makeLegacyV1Json(originalRecord);
      await writeFile(reelFile, v1Json, "utf8");

      const statsBefore = await stat(reelFile);
      const loaded = await f.repo.getShortReel(f.key);

      expect(loaded.schema_version).toBe(2);
      expect(loaded.units.publishing.last_accepted_payload).toEqual({
        title: "Old Hook 101",
        description: "Old description text.\n\nClick here to see more!\n\n#quiz #trivia",
      });
      expect(loaded.units.publishing.state).toBe("stale");

      // Verify NO disk writes happened on GET
      const statsAfter = await stat(reelFile);
      expect(statsAfter.mtimeMs).toBe(statsBefore.mtimeMs);

      const backupPath = path.join(path.dirname(reelFile), "reel.v1.backup.json");
      await expect(stat(backupPath)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await f.cleanup();
    }
  });

  it("C03: produces byte-exact backup on first mutation of v1 record and safely rejects mismatched existing backup", async () => {
    const f = await packageFixture();
    try {
      const reelFile = resolveShortReelFile(f.repo.roots, f.channel.slug, f.key.reel_id);
      const originalRecord = await f.repo.getShortReel(f.key);
      const v1Json = makeLegacyV1Json(originalRecord);
      await writeFile(reelFile, v1Json, "utf8");

      const backupPath = path.join(path.dirname(reelFile), "reel.v1.backup.json");

      // First mutation via updateShortReel
      const current = await f.repo.getShortReel(f.key);
      const updated = await f.repo.updateShortReel(
        f.key,
        { expected_revision: current.revision, request_id: "req_upg_1" },
        { kind: "update_model_note", model_note: "Upgraded note" },
      );

      expect(updated.schema_version).toBe(2);
      expect(updated.model_note).toBe("Upgraded note");

      // Backup must exist and match original v1 content exactly
      const backupContent = await readFile(backupPath, "utf8");
      expect(backupContent).toBe(v1Json);

      // Second mutation should NOT fail and should not change backup
      const updated2 = await f.repo.updateShortReel(
        f.key,
        { expected_revision: updated.revision, request_id: "req_upg_2" },
        { kind: "update_model_note", model_note: "Second note" },
      );
      expect(updated2.model_note).toBe("Second note");
      const backupContentAfter = await readFile(backupPath, "utf8");
      expect(backupContentAfter).toBe(v1Json);

      // Sibling backup mismatch test
      // If we tamper with backupPath so it doesn't match a new v1 file
      const reelFile2 = resolveShortReelFile(f.repo.roots, f.channel.slug, f.key.reel_id);
      await writeFile(reelFile2, makeLegacyV1Json({ ...originalRecord, revision: 10 }), "utf8");
      // Backup has v1Json (which has revision originalRecord.revision), not revision 10
      const currentMismatch = await f.repo.getShortReel(f.key);
      await expect(
        f.repo.updateShortReel(
          f.key,
          { expected_revision: currentMismatch.revision, request_id: "req_mismatch" },
          { kind: "update_model_note", model_note: "Mismatch test" },
        ),
      ).rejects.toThrow(RepositoryError);
    } finally {
      await f.cleanup();
    }
  });

  it("backs up on mutateShortReelRecord transaction as well", async () => {
    const f = await packageFixture();
    try {
      const reelFile = resolveShortReelFile(f.repo.roots, f.channel.slug, f.key.reel_id);
      const originalRecord = await f.repo.getShortReel(f.key);
      const v1Json = makeLegacyV1Json(originalRecord);
      await writeFile(reelFile, v1Json, "utf8");

      const backupPath = path.join(path.dirname(reelFile), "reel.v1.backup.json");

      await mutateShortReelRecord(f.repo, f.key, (rec) => {
        rec.model_note = "Transaction upgraded note";
        return rec;
      });

      const backupContent = await readFile(backupPath, "utf8");
      expect(backupContent).toBe(v1Json);
    } finally {
      await f.cleanup();
    }
  });

  it("creates new Short-Reels as canonical v2 without producing any v1 backup", async () => {
    const f = await packageFixture();
    try {
      const reelFile = resolveShortReelFile(f.repo.roots, f.channel.slug, f.key.reel_id);
      const record = await f.repo.getShortReel(f.key);
      expect(record.schema_version).toBe(2);
      const backupPath = path.join(path.dirname(reelFile), "reel.v1.backup.json");
      await expect(stat(backupPath)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await f.cleanup();
    }
  });

  it("normalizes legacy update_publishing request input at route boundary", async () => {
    const { buildTestApp, createTestRoot, createTestReel } = await import("./shortReelRoutesTestUtils.js");
    const root = await createTestRoot();
    const app = await buildTestApp(root);
    try {
      const { channel, reel } = await createTestReel(app);

      const legacyPublishingBody = {
        expected_revision: reel.revision,
        request_id: "req_route_legacy_pub",
        command: {
          kind: "update_publishing",
          publishing: {
            hook: "Legacy Route Hook",
            description: "Legacy route desc.",
            cta: "Subscribe!",
            hashtags: ["#test", "#route"],
          },
        },
      };

      const res = await app.server.inject({
        method: "PATCH",
        url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}`,
        payload: legacyPublishingBody,
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.short_reel.units.publishing.last_accepted_payload).toEqual({
        title: "Legacy Route Hook",
        description: "Legacy route desc.\n\nSubscribe!\n\n#test #route",
      });

      // Idempotency replay
      const replayRes = await app.server.inject({
        method: "PATCH",
        url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}`,
        payload: legacyPublishingBody,
      });
      expect(replayRes.statusCode).toBe(200);
      const replayJson = JSON.parse(replayRes.payload);
      expect(replayJson.short_reel.units.publishing.last_accepted_payload).toEqual({
        title: "Legacy Route Hook",
        description: "Legacy route desc.\n\nSubscribe!\n\n#test #route",
      });
    } finally {
      await app.server.close();
    }
  });
});

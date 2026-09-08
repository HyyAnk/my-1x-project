import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ShortReelEditCommandSchema, createInitialShortReel } from "@studio/shared";
import { incompleteSource, repairFixture, repairScript, repairSource } from "./helpers/shortReelRepairFixture.js";

describe("complete-source mutation boundary", () => {
  it("rejects incomplete source in new record constructor and replacement contract", () => {
    expect(ShortReelEditCommandSchema.safeParse({ kind: "replace_source_question", source: incompleteSource() }).success).toBe(false);
    expect(() =>
      createInitialShortReel({
        channel_id: "c",
        topic: { channel_id: "c", topic_id: "t", title: "T", premise: "P", hook: "H", origin: "discovery" },
        source: incompleteSource(),
      }),
    ).toThrow();
  });

  it("rejects newly invented incomplete records without creating another reel", async () => {
    const f = await repairFixture();
    try {
      await expect(
        f.repo.createShortReel(f.channel.channel_id, { ...f.topic, topic_id: "new" }, incompleteSource(), "new-create"),
      ).rejects.toMatchObject({ code: "INCOMPLETE_SOURCE" });
      expect(await f.repo.listShortReels(f.channel.channel_id)).toHaveLength(1);
    } finally {
      await f.cleanup();
    }
  });

  it("rejects an incomplete replacement and keeps the prior bytes and revision", async () => {
    const f = await repairFixture();
    try {
      const before = await readFile(f.file, "utf8");
      const request = { kind: "replace_source_question" as const, source: incompleteSource() };
      // @ts-expect-error Deliberately exercise an untrusted incomplete replacement at runtime.
      await expect(f.repo.updateShortReel(f.key, { expected_revision: 1, request_id: "replace" }, request)).rejects.toMatchObject({
        code: "INCOMPLETE_SOURCE",
      });
      expect(await readFile(f.file, "utf8")).toBe(before);
    } finally {
      await f.cleanup();
    }
  });

  it("retains readable legacy records but blocks creative writes until explicit complete-source repair", async () => {
    const f = await repairFixture();
    try {
      await f.writeLegacy();
      const before = await readFile(f.file, "utf8");
      expect((await f.repo.getShortReel(f.key)).source.fidelity).toBe("incomplete");
      expect(await f.repo.listShortReels(f.channel.channel_id)).toHaveLength(1);
      const replay = await f.repo.createShortReel(f.channel.channel_id, f.topic, repairSource, "different-create");
      expect(replay.reel_id).toBe(f.reel.reel_id);
      await expect(
        f.repo.updateShortReel(
          f.key,
          { expected_revision: 1, request_id: "segment" },
          {
            kind: "update_segment",
            segment_index: 1,
            segment: repairScript().segments[0],
          },
        ),
      ).rejects.toMatchObject({ code: "INCOMPLETE_SOURCE" });
      await expect(
        f.repo.updateShortReel(f.key, { expected_revision: 1, request_id: "script" }, { kind: "update_script", script: repairScript() }),
      ).rejects.toMatchObject({ code: "INCOMPLETE_SOURCE" });
      await expect(
        f.repo.updateShortReel(
          f.key,
          { expected_revision: 1, request_id: "publishing" },
          { kind: "update_publishing", publishing: { hook: "H", description: "D", cta: null, hashtags: [] } },
        ),
      ).rejects.toMatchObject({ code: "INCOMPLETE_SOURCE" });
      expect(await readFile(f.file, "utf8")).toBe(before);
      await f.repo.updateShortReel(
        f.key,
        { expected_revision: 1, request_id: "repair" },
        { kind: "replace_source_question", source: repairSource },
      );
      const ready = await f.repo.updateShortReel(
        f.key,
        { expected_revision: 2, request_id: "script" },
        { kind: "update_script", script: repairScript() },
      );
      expect(ready.source.fidelity).toBe("complete");
      expect(ready.units.script.state).toBe("ready");
    } finally {
      await f.cleanup();
    }
  });
});

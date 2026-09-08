import { afterEach, describe, expect, it } from "vitest";
import {
  acceptReelUnitResult,
  beginReelUnitAttempt,
  affectedReelUnits,
  computeDependencyFingerprint,
} from "../src/shortReel/revisionPolicy.js";
import { repairFixture, repairScript, repairSource } from "./helpers/shortReelRepairFixture.js";
import type { CompleteShortReelSourceSnapshot } from "../src/shortReel/scriptPrompt.js";
const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});
async function fixture() {
  const result = await repairFixture();
  cleanups.push(result.cleanup);
  return result;
}

describe("Short-Reel Revision and Invalidation Policy (Phase 04)", () => {
  it("SG-04: affectedReelUnits returns exact units adhering to the Invalidation Table", () => {
    expect(
      affectedReelUnits({
        kind: "replace_source_question",
        source: repairSource as CompleteShortReelSourceSnapshot,
      }),
    ).toEqual(["references", "script", "cover", "publishing"]);

    expect(
      affectedReelUnits({
        kind: "update_references",
        references: { references: [] },
      }),
    ).toEqual(["script", "cover"]);

    expect(
      affectedReelUnits({
        kind: "update_script",
        script: repairScript(),
      }),
    ).toEqual(["script"]);

    expect(
      affectedReelUnits({
        kind: "update_segment",
        segment_index: 1,
        segment: repairScript().segments[0],
      }),
    ).toEqual(["script"]);

    expect(
      affectedReelUnits({
        kind: "update_cover",
        cover: {
          asset_id: "cov-1",
          path: "covers/c1.png",
          mime_type: "image/png",
          width: 1080,
          height: 1920,
          checksum: "hash123",
        },
      }),
    ).toEqual(["cover"]);

    expect(
      affectedReelUnits({
        kind: "update_publishing",
        publishing: { hook: "H", description: "D", cta: null, hashtags: [] },
      }),
    ).toEqual(["publishing"]);

    expect(
      affectedReelUnits({
        kind: "update_model_note",
        model_note: "Omni 1.1 Flash",
      }),
    ).toEqual([]);
  });

  it("SG-05: discards older in-flight result when upstream input is edited before resolution", async () => {
    const { repo, key, reel } = await fixture();

    // 1. Generation starts based on initial record snapshot
    const initialFingerprint = computeDependencyFingerprint("script", reel);
    const operationId = "op-script-1";

    // 2. Before operation completes, user edits topic premise (which changes dependencies)
    // We update the record with replacement or edit
    const modifiedRecord = structuredClone(reel);
    modifiedRecord.units.script.state = "pending";
    modifiedRecord.units.script.current_attempt = {
      operation_id: operationId,
      dependency_fingerprint: initialFingerprint,
      started_at: new Date().toISOString(),
      completed_at: null,
      error: null,
    };
    modifiedRecord.topic.premise = "Completely changed premise during generation";
    await repo.writeJsonAtomic(
      repo.resolvePath("channels", (await repo.getChannel(key.channel_id)).slug, "short_reels", key.reel_id, "reel.json"),
      modifiedRecord,
    );

    // 3. Older generation attempt resolves with valid script
    const validScript = repairScript();
    const result = await acceptReelUnitResult(
      repo,
      key,
      "script",
      { operationId, dependencyFingerprint: initialFingerprint },
      { script: validScript },
    );

    // Assert: older result is discarded because upstream input changed
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("STALE_DEPENDENCY");

    // The newer premise remains intact in storage
    const reloaded = await repo.getShortReel(key);
    expect(reloaded.topic.premise).toBe("Completely changed premise during generation");
    expect(reloaded.units.script.state).toBe("pending");
  });

  it("SG-06: linearized honest state prevents cancelled work from becoming ready, and preserves accepted work", async () => {
    const { repo, key, reel } = await fixture();
    const fingerprint = computeDependencyFingerprint("script", reel);
    const operationId = "op-script-cancel";

    // Case A: Mark unit state as cancelled
    const cancelledRecord = structuredClone(reel);
    cancelledRecord.units.script.state = "cancelled";
    await repo.writeJsonAtomic(
      repo.resolvePath("channels", (await repo.getChannel(key.channel_id)).slug, "short_reels", key.reel_id, "reel.json"),
      cancelledRecord,
    );

    // Resolve deferred result
    const cancelResult = await acceptReelUnitResult(
      repo,
      key,
      "script",
      { operationId, dependencyFingerprint: fingerprint },
      { script: repairScript() },
    );

    expect(cancelResult.accepted).toBe(false);
    expect(cancelResult.reason).toBe("CANCELLED");

    // Case B: Resolve successfully first, then verify an attempt with old operation ID cannot supersede
    const validScript = repairScript();
    // Accept valid script under fresh record
    cancelledRecord.units.script.state = "pending";
    cancelledRecord.units.script.current_attempt = {
      operation_id: "op-fresh",
      dependency_fingerprint: fingerprint,
      started_at: new Date().toISOString(),
      completed_at: null,
      error: null,
    };
    await repo.writeJsonAtomic(
      repo.resolvePath("channels", (await repo.getChannel(key.channel_id)).slug, "short_reels", key.reel_id, "reel.json"),
      cancelledRecord,
    );

    const acceptResult = await acceptReelUnitResult(
      repo,
      key,
      "script",
      { operationId: "op-fresh", dependencyFingerprint: fingerprint },
      { script: validScript },
    );
    expect(acceptResult.accepted).toBe(true);
    expect(acceptResult.record.units.script.state).toBe("ready");

    // A stale attempt with the old cancelled operationId cannot overwrite the accepted work
    const staleResult = await acceptReelUnitResult(
      repo,
      key,
      "script",
      { operationId: "op-script-cancel", dependencyFingerprint: fingerprint },
      { script: validScript },
    );
    expect(staleResult.accepted).toBe(false);
  });

  it("SG-07: accepts two sibling component completions from same snapshot without false invalidation", async () => {
    const { repo, key, reel } = await fixture();

    // Both script and publishing operations start from the same initial record snapshot
    const scriptFingerprint = computeDependencyFingerprint("script", reel);
    const publishingFingerprint = computeDependencyFingerprint("publishing", reel);

    const scriptOp = "op-script-sibling";
    const pubOp = "op-pub-sibling";
    await beginReelUnitAttempt(repo, key, "script", scriptOp);
    await beginReelUnitAttempt(repo, key, "publishing", pubOp);

    const scriptPayload = { script: repairScript() };
    const pubPayload = {
      hook: "Amazing Hook",
      description: "Exciting explanation",
      cta: "Watch next",
      hashtags: ["#science", "#trivia"],
    };

    // 1. Script resolves and is accepted -> updates record revision
    const scriptResult = await acceptReelUnitResult(
      repo,
      key,
      "script",
      { operationId: scriptOp, dependencyFingerprint: scriptFingerprint },
      scriptPayload,
    );
    expect(scriptResult.accepted).toBe(true);
    expect(scriptResult.record.revision).toBe(4);

    // 2. Publishing resolves afterward: its dependency fingerprint has NOT changed
    // even though the record's revision bumped due to the sibling script unit!
    const pubResult = await acceptReelUnitResult(
      repo,
      key,
      "publishing",
      { operationId: pubOp, dependencyFingerprint: publishingFingerprint },
      pubPayload,
    );
    expect(pubResult.accepted).toBe(true);
    expect(pubResult.record.revision).toBe(5);

    // 3. Verify final persisted record contains both accepted units
    const finalRecord = await repo.getShortReel(key);
    expect(finalRecord.units.script.state).toBe("ready");
    expect(finalRecord.units.publishing.state).toBe("ready");
  });

  it("SG-07-CONCURRENT: merges two concurrent sibling completions dispatched via Promise.all using CAS retry", async () => {
    const { repo, key, reel } = await fixture();
    await beginReelUnitAttempt(repo, key, "script", "op-concurrent-script");
    await beginReelUnitAttempt(repo, key, "publishing", "op-concurrent-pub");

    const scriptFingerprint = computeDependencyFingerprint("script", reel);
    const pubFingerprint = computeDependencyFingerprint("publishing", reel);

    const scriptPayload = { script: repairScript() };
    const pubPayload = {
      hook: "Concurrent Hook",
      description: "Concurrent description",
      cta: "Watch now",
      hashtags: ["#fast", "#concurrency"],
    };

    // Dispatched in true parallel concurrency
    const [resScript, resPub] = await Promise.all([
      acceptReelUnitResult(
        repo,
        key,
        "script",
        { operationId: "op-concurrent-script", dependencyFingerprint: scriptFingerprint },
        scriptPayload,
      ),
      acceptReelUnitResult(
        repo,
        key,
        "publishing",
        { operationId: "op-concurrent-pub", dependencyFingerprint: pubFingerprint },
        pubPayload,
      ),
    ]);

    // Both must be accepted successfully through CAS retry
    expect(resScript.accepted).toBe(true);
    expect(resPub.accepted).toBe(true);

    const finalRecord = await repo.getShortReel(key);
    expect(finalRecord.units.script.state).toBe("ready");
    expect(finalRecord.units.publishing.state).toBe("ready");
    expect(finalRecord.revision).toBe(5);
  });

  it("invalidatedDownstreamSegments correctly marks segments 2 and 3 stale on segment 1 change, and segment 3 on segment 2 change", async () => {
    const { invalidatedDownstreamSegments } = await import("../src/shortReel/revisionPolicy.js");

    expect(invalidatedDownstreamSegments(1)).toEqual([2, 3]);
    expect(invalidatedDownstreamSegments(2)).toEqual([3]);
    expect(invalidatedDownstreamSegments(3)).toEqual([]);
  });
});

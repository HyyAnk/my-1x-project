import { afterEach, describe, expect, it } from "vitest";
import { deferred, repairFixture, repairScript } from "./helpers/shortReelRepairFixture.js";
import {
  acceptReelUnitResult,
  beginReelUnitAttempt,
  cancelReelUnitAttempt,
  failReelUnitAttempt,
  computeDependencyFingerprint,
} from "../src/shortReel/revisionPolicy.js";
import { compileFlowPrompts } from "../src/shortReel/flowPromptCompiler.js";
import { setShortReelWriteHookForTesting } from "../src/repository/shortReelStorage.js";
import { generateReelScript } from "../src/shortReel/scriptService.js";
import { CompleteShortReelSourceSnapshotSchema } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

describe("Phase 04 persisted lifecycle", () => {
  it("retains the accepted script and prompts when a retry times out", async () => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    const pending = await beginReelUnitAttempt(f.repo, f.key, "script", "first");
    const accepted = await acceptReelUnitResult(
      f.repo,
      f.key,
      "script",
      { operationId: "first", dependencyFingerprint: pending.units.script.current_attempt!.dependency_fingerprint },
      { script: repairScript() },
    );
    await beginReelUnitAttempt(f.repo, f.key, "script", "retry");
    const failed = await failReelUnitAttempt(f.repo, f.key, "script", "retry", "TIMEOUT");
    expect(failed.units.script.state).toBe("failed");
    expect(failed.units.script.last_accepted_payload).toEqual(accepted.record.units.script.last_accepted_payload);
    expect(failed.units.script.current_attempt?.error).toBe("TIMEOUT");
  });

  it("rejects malformed provider payload without leaking it or changing storage", async () => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    const pending = await beginReelUnitAttempt(f.repo, f.key, "script", "invalid");
    const result = await acceptReelUnitResult(
      f.repo,
      f.key,
      "script",
      { operationId: "invalid", dependencyFingerprint: pending.units.script.current_attempt!.dependency_fingerprint },
      { script: "private-provider-data" },
    );
    expect(result).toMatchObject({ accepted: false, reason: "VALIDATION_FAILED" });
    expect(JSON.stringify(result)).not.toContain("private-provider-data");
    expect(result.record.revision).toBe(2);
  });
  it("persists stale state and preserves downstream text on an upstream boundary edit", async () => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    const saved = await f.repo.updateShortReel(
      f.key,
      { expected_revision: 1, request_id: "script" },
      { kind: "update_script", script: repairScript() },
    );
    const segment = structuredClone(saved.script!.segments[0]);
    segment.end_state.environment = "Finish line";
    const result = await f.repo.updateShortReel(
      f.key,
      { expected_revision: saved.revision, request_id: "segment" },
      { kind: "update_segment", segment_index: 1, segment },
    );
    expect(result.units.script.state).toBe("stale");
    expect(result).toHaveProperty("stale_segments", [2, 3]);
    expect(result.script?.segments[1]).toEqual(saved.script?.segments[1]);
    expect((await f.repo.getShortReel(f.key)).units.script.state).toBe("stale");
  });

  it("stores all three prompt projections from the accepted structured script", async () => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    const script = await generateReelScript(
      { topic: f.reel.topic, source: CompleteShortReelSourceSnapshotSchema.parse(f.reel.source) },
      {
        async connect() {},
        generateContent() {
          return Promise.resolve({ text: JSON.stringify(repairScript()) });
        },
      },
    );
    await beginReelUnitAttempt(f.repo, f.key, "script", "one");
    const accepted = await acceptReelUnitResult(
      f.repo,
      f.key,
      "script",
      { operationId: "one", dependencyFingerprint: computeDependencyFingerprint("script", f.reel) },
      { script },
    );
    expect(accepted.accepted).toBe(true);
    const reloaded = await f.repo.getShortReel(f.key);
    expect(reloaded.units.script.last_accepted_payload?.compiled_prompts).toEqual(
      compileFlowPrompts(script, undefined, reloaded.model_note),
    );
    await f.repo.close();
    const reopened = new RepositoryService(f.root);
    cleanups.push(() => reopened.close());
    const restored = await reopened.getShortReel(f.key);
    expect(restored.script).toEqual(script);
    expect(restored.units.script.last_accepted_payload?.compiled_prompts).toHaveLength(3);
  });

  it("rejects completion with no registered operation", async () => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    const result = await acceptReelUnitResult(
      f.repo,
      f.key,
      "script",
      { operationId: "unknown", dependencyFingerprint: computeDependencyFingerprint("script", f.reel) },
      { script: repairScript() },
    );
    expect(result.accepted).toBe(false);
    expect((await f.repo.getShortReel(f.key)).revision).toBe(1);
  });

  it.each([true, false])("linearizes cancellation versus completion with cancelFirst=%s", async (cancelFirst) => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    const pending = await beginReelUnitAttempt(f.repo, f.key, "script", "race");
    const attempt = { operationId: "race", dependencyFingerprint: pending.units.script.current_attempt!.dependency_fingerprint };
    const entered = deferred();
    const release = deferred();
    let writes = 0;
    setShortReelWriteHookForTesting(async (_source, destination) => {
      if (destination === f.file && ++writes === 1) {
        entered.resolve();
        await release.promise;
      }
    });
    const accept = () => acceptReelUnitResult(f.repo, f.key, "script", attempt, { script: repairScript() });
    const cancel = () => cancelReelUnitAttempt(f.repo, f.key, "script", "race");
    try {
      const first = cancelFirst ? cancel() : accept();
      await entered.promise;
      const second = cancelFirst ? accept() : cancel();
      release.resolve();
      await Promise.all([first, second]);
      const final = await f.repo.getShortReel(f.key);
      expect(final.units.script.state).toBe(cancelFirst ? "cancelled" : "ready");
      expect(final.revision).toBe(3);
    } finally {
      release.resolve();
      setShortReelWriteHookForTesting(null);
    }
  });

  it("discards older operation after a newer same-target attempt starts", async () => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    const first = await beginReelUnitAttempt(f.repo, f.key, "script", "first");
    await beginReelUnitAttempt(f.repo, f.key, "script", "second");
    const result = await acceptReelUnitResult(
      f.repo,
      f.key,
      "script",
      { operationId: "first", dependencyFingerprint: first.units.script.current_attempt!.dependency_fingerprint },
      { script: repairScript() },
    );
    expect(result).toMatchObject({ accepted: false, reason: "SUPERSEDED_OPERATION" });
  });

  it("replays an accepted operation without another write after reopening", async () => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    const pending = await beginReelUnitAttempt(f.repo, f.key, "script", "replay");
    const attempt = { operationId: "replay", dependencyFingerprint: pending.units.script.current_attempt!.dependency_fingerprint };
    await acceptReelUnitResult(f.repo, f.key, "script", attempt, { script: repairScript() });
    await f.repo.close();
    const reopened = new RepositoryService(f.root);
    cleanups.push(() => reopened.close());
    const again = await acceptReelUnitResult(reopened, f.key, "script", attempt, { script: repairScript() });
    expect(again.accepted).toBe(true);
    expect(again.record.revision).toBe(3);
  });

  it("merges sibling completion queued while another is inside the atomic writer", async () => {
    const f = await repairFixture();
    cleanups.push(f.cleanup);
    await f.repo.updateShortReel(
      f.key,
      { expected_revision: (await f.repo.getShortReel(f.key)).revision, request_id: "seed-script" },
      { kind: "update_script", script: repairScript() },
    );
    const refPending = await beginReelUnitAttempt(f.repo, f.key, "references", "references");
    const publishingPending = await beginReelUnitAttempt(f.repo, f.key, "publishing", "publishing");
    const entered = deferred();
    const release = deferred();
    let writes = 0;
    setShortReelWriteHookForTesting(async (_source, destination) => {
      if (destination === f.file && ++writes === 1) {
        entered.resolve();
        await release.promise;
      }
    });
    try {
      const ref = acceptReelUnitResult(
        f.repo,
        f.key,
        "references",
        { operationId: "references", dependencyFingerprint: refPending.units.references.current_attempt!.dependency_fingerprint },
        { references: [] },
      );
      await entered.promise;
      const publishing = acceptReelUnitResult(
        f.repo,
        f.key,
        "publishing",
        { operationId: "publishing", dependencyFingerprint: publishingPending.units.publishing.current_attempt!.dependency_fingerprint },
        { title: "Speed", description: "Compare the speeds #tag" },
      );
      release.resolve();
      expect((await Promise.all([ref, publishing])).map((result) => result.accepted)).toEqual([true, true]);
      const final = await f.repo.getShortReel(f.key);
      expect(final.units.references.state).toBe("ready");
      expect(final.units.publishing.state).toBe("ready");
      expect(final.revision).toBe(6);
    } finally {
      release.resolve();
      setShortReelWriteHookForTesting(null);
    }
  });
});

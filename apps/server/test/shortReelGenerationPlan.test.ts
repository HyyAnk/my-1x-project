import { describe, expect, it } from "vitest";
import { planReelGeneration } from "../src/shortReel/generationPlan.js";
import { computeDependencyFingerprint } from "../src/shortReel/dependencyPolicy.js";
import { PackageServiceError } from "../src/shortReel/packageAttempt.js";
import { createUpgradeFixture } from "./helpers/shortReelUpgradeFixture.js";
import { acceptReelUnitResult, beginReelUnitAttempt } from "../src/shortReel/revisionPolicy.js";
import type { ShortReelRecord } from "@studio/shared";

describe("Short-Reel Generation Planner (Pure planReelGeneration)", () => {
  it("plans all stages as 'run' for a new reel without accepted payloads", async () => {
    const f = await createUpgradeFixture();
    const rawRecord = await f.repo.getShortReel(f.key);

    // Reset units to draft / no payload
    const draftRecord: ShortReelRecord = structuredClone(rawRecord);
    draftRecord.script = null;
    draftRecord.units.script.state = "draft";
    draftRecord.units.script.last_accepted_payload = null;
    draftRecord.units.script.accepted_dependency_fingerprint = null;
    draftRecord.units.references.state = "draft";
    draftRecord.units.references.last_accepted_payload = null;
    draftRecord.units.references.accepted_dependency_fingerprint = null;
    draftRecord.units.cover.state = "draft";
    draftRecord.units.cover.last_accepted_payload = null;
    draftRecord.units.cover.accepted_dependency_fingerprint = null;
    draftRecord.units.publishing.state = "draft";
    draftRecord.units.publishing.last_accepted_payload = null;
    draftRecord.units.publishing.accepted_dependency_fingerprint = null;

    const plan = planReelGeneration(draftRecord, {
      expected_revision: draftRecord.revision,
      request_id: "test-new-reel",
      target: "package",
      mode: "repair",
    });

    expect(plan).toEqual([
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "script", action: "run", dependsOn: ["preflight"] },
      { stage: "style", action: "run", dependsOn: ["script"] },
      { stage: "cover", action: "run", dependsOn: ["style"] },
      { stage: "publishing", action: "run", dependsOn: ["script"] },
      { stage: "finalize", action: "run", dependsOn: ["cover", "publishing"] },
    ]);
  });

  it("plans all stages as 'reuse' for a fully ready reel in repair mode (0 paid calls)", async () => {
    const f = await createUpgradeFixture();
    let record = await f.repo.getShortReel(f.key);

    // Accept references
    const refPayload = {
      references: [
        {
          role: "mascot" as const,
          asset_id: "mascot-1",
          path: "channels/test/reels/test/references/mascot.png",
          checksum: "mascot-sha256",
          mime_type: "image/png",
          width: 1080,
          height: 1920,
        },
        {
          role: "style" as const,
          asset_id: "style-1",
          path: "channels/test/reels/test/references/style.png",
          checksum: "style-sha256",
          mime_type: "image/png",
          width: 1080,
          height: 1920,
        },
      ],
    };
    await beginReelUnitAttempt(f.repo, f.key, "references", "op-ref");
    let accepted = await acceptReelUnitResult(
      f.repo,
      f.key,
      "references",
      { operationId: "op-ref", dependencyFingerprint: computeDependencyFingerprint("references", record) },
      refPayload,
    );
    expect(accepted.accepted).toBe(true);

    record = await f.repo.getShortReel(f.key);

    // Accept cover
    const coverPayload = {
      path: "channels/test/reels/test/cover.png",
      asset_id: "cover-1",
      mime_type: "image/png",
      width: 1080 as const,
      height: 1920 as const,
      checksum: "cover-sha256",
    };
    await beginReelUnitAttempt(f.repo, f.key, "cover", "op-cover");
    accepted = await acceptReelUnitResult(
      f.repo,
      f.key,
      "cover",
      { operationId: "op-cover", dependencyFingerprint: computeDependencyFingerprint("cover", record) },
      coverPayload,
    );
    expect(accepted.accepted).toBe(true);

    record = await f.repo.getShortReel(f.key);

    // Accept publishing
    const pubPayload = {
      title: "Valid Portrait Reel Title",
      description: "Valid description text for publishing. #quiz #trivia",
    };
    await beginReelUnitAttempt(f.repo, f.key, "publishing", "op-pub");
    accepted = await acceptReelUnitResult(
      f.repo,
      f.key,
      "publishing",
      { operationId: "op-pub", dependencyFingerprint: computeDependencyFingerprint("publishing", record) },
      pubPayload,
    );
    expect(accepted.accepted).toBe(true);

    const fullyReadyRecord = await f.repo.getShortReel(f.key);

    const plan = planReelGeneration(fullyReadyRecord, {
      expected_revision: fullyReadyRecord.revision,
      request_id: "test-fully-ready",
      target: "package",
      mode: "repair",
    });

    expect(plan).toEqual([
      { stage: "preflight", action: "reuse", dependsOn: [] },
      { stage: "script", action: "reuse", dependsOn: ["preflight"] },
      { stage: "style", action: "reuse", dependsOn: ["script"] },
      { stage: "cover", action: "reuse", dependsOn: ["style"] },
      { stage: "publishing", action: "reuse", dependsOn: ["script"] },
      { stage: "finalize", action: "reuse", dependsOn: ["cover", "publishing"] },
    ]);
  });

  it("plans style and downstream cover to run when style has failed, reusing script and publishing", async () => {
    const f = await createUpgradeFixture();
    const readyRecord = await f.repo.getShortReel(f.key);

    // Create a record where script and publishing are ready, but references is failed
    const record: ShortReelRecord = structuredClone(readyRecord);
    record.units.references.state = "failed";
    record.units.references.current_attempt = null;

    // Publishing is ready
    record.units.publishing.state = "ready";
    record.units.publishing.last_accepted_payload = { title: "Title", description: "Description #tag" };
    record.units.publishing.accepted_dependency_fingerprint = computeDependencyFingerprint("publishing", record);

    const plan = planReelGeneration(record, {
      expected_revision: record.revision,
      request_id: "test-failed-style",
      target: "package",
      mode: "repair",
    });

    expect(plan).toEqual([
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "script", action: "reuse", dependsOn: ["preflight"] },
      { stage: "style", action: "run", dependsOn: ["script"] },
      { stage: "cover", action: "run", dependsOn: ["style"] },
      { stage: "publishing", action: "reuse", dependsOn: ["script"] },
      { stage: "finalize", action: "run", dependsOn: ["cover", "publishing"] },
    ]);
  });

  it("plans only publishing to run when only publishing is failed, reusing script, style, and cover", async () => {
    const f = await createUpgradeFixture();
    const readyRecord = await f.repo.getShortReel(f.key);

    const record: ShortReelRecord = structuredClone(readyRecord);
    // References ready
    record.units.references.state = "ready";
    record.units.references.last_accepted_payload = {
      references: [
        {
          role: "mascot",
          asset_id: "m1",
          path: "p1",
          checksum: "c1",
          mime_type: "image/png",
          width: 1080,
          height: 1920,
        },
        {
          role: "style",
          asset_id: "s1",
          path: "p2",
          checksum: "c2",
          mime_type: "image/png",
          width: 1080,
          height: 1920,
        },
      ],
    };
    record.units.references.accepted_dependency_fingerprint = computeDependencyFingerprint("references", record);

    // Cover ready
    record.units.cover.state = "ready";
    record.units.cover.last_accepted_payload = {
      path: "cover.png",
      asset_id: "cov-1",
      mime_type: "image/png",
      width: 1080,
      height: 1920,
      checksum: "cov-c",
    };
    record.units.cover.accepted_dependency_fingerprint = computeDependencyFingerprint("cover", record);

    // Publishing failed
    record.units.publishing.state = "failed";
    record.units.publishing.last_accepted_payload = null;
    record.units.publishing.last_accepted_payload = null;

    const plan = planReelGeneration(record, {
      expected_revision: record.revision,
      request_id: "test-failed-pub-only",
      target: "package",
      mode: "repair",
    });

    expect(plan).toEqual([
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "script", action: "reuse", dependsOn: ["preflight"] },
      { stage: "style", action: "reuse", dependsOn: ["script"] },
      { stage: "cover", action: "reuse", dependsOn: ["style"] },
      { stage: "publishing", action: "run", dependsOn: ["script"] },
      { stage: "finalize", action: "run", dependsOn: ["cover", "publishing"] },
    ]);
  });

  it("plans all stages to run when script is changed/stale", async () => {
    const f = await createUpgradeFixture();
    const readyRecord = await f.repo.getShortReel(f.key);

    const record: ShortReelRecord = structuredClone(readyRecord);
    // Mark script stale
    record.units.script.state = "stale";
    record.stale_segments = [2, 3];

    const plan = planReelGeneration(record, {
      expected_revision: record.revision,
      request_id: "test-changed-script",
      target: "package",
      mode: "repair",
    });

    expect(plan).toEqual([
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "script", action: "run", dependsOn: ["preflight"] },
      { stage: "style", action: "run", dependsOn: ["script"] },
      { stage: "cover", action: "run", dependsOn: ["style"] },
      { stage: "publishing", action: "run", dependsOn: ["script"] },
      { stage: "finalize", action: "run", dependsOn: ["cover", "publishing"] },
    ]);
  });

  it("plans all stages as 'run' for explicit Regenerate All regardless of existing readiness", async () => {
    const f = await createUpgradeFixture();
    const readyRecord = await f.repo.getShortReel(f.key);

    const plan = planReelGeneration(readyRecord, {
      expected_revision: readyRecord.revision,
      request_id: "test-regenerate-all",
      target: "package",
      mode: "regenerate",
    });

    expect(plan).toEqual([
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "script", action: "run", dependsOn: ["preflight"] },
      { stage: "style", action: "run", dependsOn: ["script"] },
      { stage: "cover", action: "run", dependsOn: ["style"] },
      { stage: "publishing", action: "run", dependsOn: ["script"] },
      { stage: "finalize", action: "run", dependsOn: ["cover", "publishing"] },
    ]);
  });

  it("validates prerequisites for individual targets correctly", async () => {
    const f = await createUpgradeFixture();
    const record = await f.repo.getShortReel(f.key);

    // Target "script" plans preflight and script
    const scriptPlan = planReelGeneration(record, {
      expected_revision: record.revision,
      request_id: "test-script-target",
      target: "script",
    });
    expect(scriptPlan).toEqual([
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "script", action: "run", dependsOn: ["preflight"] },
    ]);

    // Target "segment_1" succeeds when script is present
    const segPlan = planReelGeneration(record, {
      expected_revision: record.revision,
      request_id: "test-seg-target",
      target: "segment_1",
    });
    expect(segPlan).toEqual([
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "script", action: "run", dependsOn: ["preflight"] },
    ]);

    // Target "segment_1" fails when script is missing
    const noScriptRecord = structuredClone(record);
    noScriptRecord.script = null;
    expect(() =>
      planReelGeneration(noScriptRecord, {
        expected_revision: record.revision,
        request_id: "test-seg-fail",
        target: "segment_1",
      }),
    ).toThrow(PackageServiceError);

    // Target "cover" fails when references are missing
    expect(() =>
      planReelGeneration(record, {
        expected_revision: record.revision,
        request_id: "test-cover-fail",
        target: "cover",
      }),
    ).toThrow(PackageServiceError);

    // Target "references" succeeds when script is ready
    const refPlan = planReelGeneration(record, {
      expected_revision: record.revision,
      request_id: "test-ref-target",
      target: "references",
    });
    expect(refPlan).toEqual([
      { stage: "preflight", action: "run", dependsOn: [] },
      { stage: "style", action: "run", dependsOn: ["preflight"] },
    ]);
  });
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MascotAnimationAssetV1, MascotAnimationJob, MascotProfile } from "@studio/shared";
import { DefaultAnimationRepository, ImmutableRecordError, StaleAttemptError } from "../src/quiz/mascot/animation/index.js";

describe("Animation Repository (Stage 07 Persistence)", () => {
  let tempStorageRoot: string;
  let repo: DefaultAnimationRepository;

  beforeEach(async () => {
    tempStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anim-repo-test-"));
    repo = new DefaultAnimationRepository({ storageRoot: tempStorageRoot });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempStorageRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  const mockAsset: MascotAnimationAssetV1 = {
    version: 1,
    state: "thinking",
    atlas_url: "/mascot/assets/animations/mascot_1/core/thinking/1/atlas.png",
    manifest_url: "/mascot/assets/animations/mascot_1/core/thinking/1/manifest.json",
    frame_count: 12,
    fps: 8,
    loop: true,
    frames: Array.from({ length: 12 }, (_, i) => ({
      index: i,
      x: (i % 4) * 128,
      y: Math.floor(i / 4) * 128,
      width: 128,
      height: 128,
      duration_ms: 125,
    })),
    registration: {
      source_width: 512,
      source_height: 512,
      content_bounds: { x: 50, y: 50, width: 400, height: 400 },
      pivot: { x: 256, y: 512 },
      offset_x: 0,
      offset_y: 0,
    },
    content_fingerprint: "content_hash_12345",
    source_fingerprint: "source_hash_67890",
    qa_report_url: "/mascot/assets/animations/mascot_1/core/thinking/1/qa_report.json",
    published_at: null,
    slot_index: 1,
    recipe_id: "thinking-01-head-tilt-left",
  };

  async function seedMascotProfile(mascotId: string): Promise<MascotProfile> {
    const mascotDir = path.join(tempStorageRoot, "mascots", mascotId);
    await fs.mkdir(mascotDir, { recursive: true });

    const profile: MascotProfile = {
      id: mascotId,
      name: "Smart Bunny",
      description: "A fast and clever rabbit",
      visual_style: "pixar_3d",
      master_prompt: "Cute bunny in blue vest",
      master_image_url: "/mascots/bunny/master.png",
      color_theme: "#3b82f6",
      actions: {
        thinking: {
          action: "thinking",
          sprite_url: "/mascots/bunny/legacy_thinking.png",
          preview_url: "/mascots/bunny/legacy_thinking.png",
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
        },
        celebrate: {
          action: "celebrate",
          sprite_url: "/mascots/bunny/legacy_celebrate.png",
          preview_url: "/mascots/bunny/legacy_celebrate.png",
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
        },
      },
      styles: [
        {
          id: "core",
          name: "Core Style",
          keyword: "standard",
          is_default: true,
          anchor_image_url: "/mascots/bunny/master.png",
          states: {
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: "/mascots/bunny/legacy_thinking.png",
              },
            ],
            celebrate: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: "/mascots/bunny/legacy_celebrate.png",
              },
            ],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await fs.writeFile(path.join(mascotDir, "mascot.json"), JSON.stringify(profile, null, 2), "utf8");
    return profile;
  }

  it("persists jobs atomically and retrieves them accurately", async () => {
    const job: MascotAnimationJob = {
      id: "job_test_001",
      mascot_id: "mascot_rabbit",
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      recipe_id: "thinking-01-head-tilt-left",
      status: "queued",
      fingerprint: "fp_test_abc",
      attempts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await repo.saveJob(job);

    const retrieved = await repo.getJob("mascot_rabbit", "job_test_001");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("job_test_001");
    expect(retrieved?.status).toBe("queued");
    expect(retrieved?.fingerprint).toBe("fp_test_abc");

    // Verify atomic file existence on disk
    const targetFile = path.join(tempStorageRoot, "mascots", "mascot_rabbit", "animation_jobs", "job_test_001.json");
    const fileContent = JSON.parse(await fs.readFile(targetFile, "utf8"));
    expect(fileContent.id).toBe("job_test_001");
  });

  it("increments attempt numbers cleanly on recordAttemptStart", async () => {
    const job: MascotAnimationJob = {
      id: "job_test_attempts",
      mascot_id: "mascot_rabbit",
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      recipe_id: "thinking-01-head-tilt-left",
      status: "queued",
      fingerprint: "fp_attempt_1",
      attempts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await repo.saveJob(job);

    const first = await repo.recordAttemptStart("mascot_rabbit", "job_test_attempts", "fp_attempt_1");
    expect(first.attempt.attempt_number).toBe(1);
    expect(first.job.current_attempt).toBe(1);
    expect(first.job.status).toBe("generating");

    const second = await repo.recordAttemptStart("mascot_rabbit", "job_test_attempts", "fp_attempt_2");
    expect(second.attempt.attempt_number).toBe(2);
    expect(second.job.current_attempt).toBe(2);
    expect(second.job.attempts).toHaveLength(2);
  });

  it("rejects updates from stale attempts when a newer attempt is in progress", async () => {
    const job: MascotAnimationJob = {
      id: "job_test_stale",
      mascot_id: "mascot_rabbit",
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      recipe_id: "thinking-01-head-tilt-left",
      status: "queued",
      fingerprint: "fp_base",
      attempts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await repo.saveJob(job);

    await repo.recordAttemptStart("mascot_rabbit", "job_test_stale", "fp_attempt_1");
    await repo.recordAttemptStart("mascot_rabbit", "job_test_stale", "fp_attempt_2");

    // Attempt 1 update should be rejected because Attempt 2 is the active attempt
    await expect(
      repo.updateAttempt("mascot_rabbit", "job_test_stale", 1, {
        status: "ready",
        completed_at: new Date().toISOString(),
      }),
    ).rejects.toThrowError(StaleAttemptError);

    // Attempt 2 update should succeed
    const updated = await repo.updateAttempt("mascot_rabbit", "job_test_stale", 2, {
      status: "ready",
      completed_at: new Date().toISOString(),
    });
    expect(updated.status).toBe("ready");
    expect(updated.attempts[1].status).toBe("ready");
  });

  it("enforces immutable publish store records and prevents overwriting same version", async () => {
    await seedMascotProfile("mascot_pub_test");

    const result = await repo.publishSlotAnimation("mascot_pub_test", "core", "thinking", 1, mockAsset);

    expect(result.variant.status).toBe("ready");
    expect(result.variant.generation_revision).toBe(1);
    expect(result.record.revision).toBe(1);

    // Direct attempt to overwrite revision 1 in publish store must be rejected
    await expect(
      repo.savePublishedRecord({
        ...result.record,
        published_at: new Date().toISOString(),
      }),
    ).rejects.toThrowError(ImmutableRecordError);

    // Publishing again increments revision to 2
    const secondResult = await repo.publishSlotAnimation("mascot_pub_test", "core", "thinking", 1, mockAsset);
    expect(secondResult.variant.generation_revision).toBe(2);
    expect(secondResult.record.revision).toBe(2);

    // Verify both immutable records exist on disk
    const list = await repo.listPublishedRecords("mascot_pub_test", "core", "thinking", 1);
    expect(list).toHaveLength(2);
    expect(list[0].revision).toBe(1);
    expect(list[1].revision).toBe(2);
  });

  it("handles backward compatibility for unmigrated styles preserving legacy images", async () => {
    await seedMascotProfile("mascot_legacy");

    const slots = await repo.getStyleSlots("mascot_legacy", "core");

    expect(slots.thinking).toHaveLength(10);
    expect(slots.celebrate).toHaveLength(10);

    // Slot 1 had a legacy still image, should be preserved with status not_started
    const slot1 = slots.thinking[0];
    expect(slot1.slot_index).toBe(1);
    expect(slot1.image_url).toBe("/mascots/bunny/legacy_thinking.png");
    expect(slot1.status).toBe("not_started");
    expect(slot1.animation).toBeUndefined();

    // Slots 2-10 are unmigrated, should start with status not_started and empty image_url
    for (let i = 1; i < 10; i += 1) {
      expect(slots.thinking[i].slot_index).toBe(i + 1);
      expect(slots.thinking[i].status).toBe("not_started");
      expect(slots.thinking[i].image_url).toBe("");
    }
  });
});

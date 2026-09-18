import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type MascotAnimationAssetV1, type MascotFrameRect, type MascotProfile } from "@studio/shared";
import {
  AnimationPublishService,
  AnimationQaService,
  createAnimationPublishService,
  createAnimationQaService,
  DefaultAnimationRepository,
  PublishGateError,
} from "../src/quiz/mascot/animation/index.js";

describe("Animation QA and Publish Gate (Stage 09)", () => {
  let tempStorageRoot: string;
  let repo: DefaultAnimationRepository;
  let publishService: AnimationPublishService;
  let qaService: AnimationQaService;

  beforeEach(async () => {
    tempStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anim-qa-gate-test-"));
    repo = new DefaultAnimationRepository({ storageRoot: tempStorageRoot });
    publishService = createAnimationPublishService({ repository: repo });
    qaService = createAnimationQaService();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempStorageRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  const baseFrames: MascotFrameRect[] = Array.from({ length: 12 }, (_, i) => ({
    index: i,
    x: (i % 4) * 64,
    y: Math.floor(i / 4) * 64,
    width: 64,
    height: 64,
    duration_ms: 125,
  }));

  async function createSyntheticAtlas(options?: {
    blankFrameIndex?: number;
    identicalFrames?: boolean;
    brokenSeam?: boolean;
  }): Promise<Buffer> {
    const cols = 4;
    const rows = 3;
    const frameW = 64;
    const frameH = 64;
    const atlasW = cols * frameW;
    const atlasH = rows * frameH;

    let svgElements = "";
    for (let i = 0; i < 12; i += 1) {
      if (options?.blankFrameIndex === i) {
        continue;
      }
      const x = (i % cols) * frameW;
      const y = Math.floor(i / cols) * frameH;
      const poseOffset = options?.identicalFrames ? 0 : (i * 3) % 20;
      const fill = options?.brokenSeam && i === 11 ? "#ff0000" : "#00aa55";
      svgElements += `<rect x="${x + 10 + poseOffset}" y="${y + 10}" width="30" height="40" fill="${fill}" rx="8"/>`;
      svgElements += `<circle cx="${x + 25 + poseOffset}" cy="${y + 20}" r="6" fill="#ffffff"/>`;
    }

    const svg = `<svg width="${atlasW}" height="${atlasH}" xmlns="http://www.w3.org/2000/svg" style="background: transparent;">${svgElements}</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  describe("Automated QA Checks (AnimationQaService)", () => {
    it("passes a valid 12-frame animation row with correct metrics", async () => {
      const atlasBuffer = await createSyntheticAtlas();
      const report = await qaService.validateAnimationRow({
        jobId: "job_test_qa_1",
        state: "thinking",
        recipeId: "thinking-01-head-tilt-left",
        frames: baseFrames,
        atlas: { width: 256, height: 192, buffer: atlasBuffer },
        expectedContentFingerprint: "fp_test_123",
        declaredFingerprint: "fp_test_123",
      });

      expect(report.passed).toBe(true);
      expect(report.score).toBeGreaterThan(0.8);
      expect(report.checks.frame_count.passed).toBe(true);
      expect(report.checks.bounds.passed).toBe(true);
      expect(report.checks.alpha_coverage.passed).toBe(true);
      expect(report.checks.duplicate_pose.passed).toBe(true);
      expect(report.checks.motion_difference.passed).toBe(true);
      expect(report.checks.seam.passed).toBe(true);
      expect(report.checks.fingerprint_consistency.passed).toBe(true);
      expect(report.summary?.frame_count).toBe(12);
    });

    it("rejects when frame count is not exactly 12", async () => {
      const report = await qaService.validateAnimationRow({
        state: "thinking",
        recipeId: "thinking-01",
        frames: baseFrames.slice(0, 10),
        atlas: { width: 256, height: 192 },
      });

      expect(report.passed).toBe(false);
      expect(report.checks.frame_count.passed).toBe(false);
      expect(report.checks.frame_count.message).toContain("10 does not match required 12");
    });

    it("rejects when frame bounds are negative or exceed atlas dimensions", async () => {
      const outOfBoundsFrames: MascotFrameRect[] = baseFrames.map((f, idx) => (idx === 11 ? { ...f, x: 220, width: 64 } : f));

      const report = await qaService.validateAnimationRow({
        state: "thinking",
        recipeId: "thinking-01",
        frames: outOfBoundsFrames,
        atlas: { width: 256, height: 192 },
      });

      expect(report.passed).toBe(false);
      expect(report.checks.bounds.passed).toBe(false);
      expect(report.checks.bounds.message).toContain("exceeds atlas bounds");
    });

    it("rejects when a frame has zero or insufficient alpha coverage (empty frame)", async () => {
      const atlasBuffer = await createSyntheticAtlas({ blankFrameIndex: 3 });
      const report = await qaService.validateAnimationRow({
        state: "thinking",
        recipeId: "thinking-01",
        frames: baseFrames,
        atlas: { width: 256, height: 192, buffer: atlasBuffer },
      });

      expect(report.passed).toBe(false);
      expect(report.checks.alpha_coverage.passed).toBe(false);
      expect(report.checks.alpha_coverage.message).toContain("below threshold");
    });

    it("rejects when duplicate pose ratio exceeds threshold (all identical frames)", async () => {
      const atlasBuffer = await createSyntheticAtlas({ identicalFrames: true });
      const report = await qaService.validateAnimationRow({
        state: "celebrate",
        recipeId: "celebrate-01",
        frames: baseFrames,
        atlas: { width: 256, height: 192, buffer: atlasBuffer },
      });

      expect(report.passed).toBe(false);
      expect(report.checks.duplicate_pose.passed).toBe(false);
      expect(report.checks.duplicate_pose.message).toContain("exceeds threshold");
    });

    it("rejects when content fingerprint does not match declared fingerprint", async () => {
      const atlasBuffer = await createSyntheticAtlas();
      const report = await qaService.validateAnimationRow({
        state: "thinking",
        recipeId: "thinking-01",
        frames: baseFrames,
        atlas: { width: 256, height: 192, buffer: atlasBuffer },
        expectedContentFingerprint: "fp_expected_hash",
        declaredFingerprint: "fp_different_hash",
      });

      expect(report.passed).toBe(false);
      expect(report.checks.fingerprint_consistency.passed).toBe(false);
      expect(report.checks.fingerprint_consistency.message).toContain("Fingerprint mismatch");
    });

    it("saves qa_report.json atomically to disk", async () => {
      const atlasBuffer = await createSyntheticAtlas();
      const report = await qaService.validateAnimationRow({
        state: "thinking",
        recipeId: "thinking-01",
        frames: baseFrames,
        atlas: { width: 256, height: 192, buffer: atlasBuffer },
      });

      const reportPath = await qaService.saveQaReport(tempStorageRoot, report);
      expect(reportPath).toContain("qa_report.json");
      const readRaw = await fs.readFile(reportPath, "utf8");
      const parsed = JSON.parse(readRaw);
      expect(parsed.passed).toBe(true);
      expect(parsed.version).toBe(1);
    });
  });

  describe("Publish Gate & Eligibility (AnimationPublishService)", () => {
    function makeSampleAsset(state: "thinking" | "celebrate", slot: number): MascotAnimationAssetV1 {
      return {
        version: 1,
        state,
        atlas_url: `/mascot/assets/animations/test_mascot/core/${state}/${slot}/atlas.png`,
        manifest_url: `/mascot/assets/animations/test_mascot/core/${state}/${slot}/manifest.json`,
        frame_count: 12,
        fps: 8,
        loop: true,
        frames: baseFrames,
        registration: {
          source_width: 256,
          source_height: 192,
          content_bounds: { x: 10, y: 10, width: 200, height: 150 },
          pivot: { x: 128, y: 192 },
          offset_x: 0,
          offset_y: 0,
        },
        content_fingerprint: `cnt_${state}_${slot}`,
        source_fingerprint: `src_${state}_${slot}`,
        qa_report_url: `/mascot/assets/animations/test_mascot/core/${state}/${slot}/qa_report.json`,
        slot_index: slot,
        recipe_id: `${state}-0${slot}`,
      };
    }

    async function seedMascotWithSlots(
      mascotId: string,
      styleId: string,
      thinkingReadyCount: number,
      celebrateReadyCount: number,
    ): Promise<MascotProfile> {
      const thinkingVariants = Array.from({ length: 10 }, (_, i) => {
        const slot = i + 1;
        const isReady = slot <= thinkingReadyCount;
        return {
          id: `slot_th_${slot}`,
          slot_index: slot,
          image_url: `/img/th_${slot}.png`,
          status: isReady ? ("ready" as const) : ("not_started" as const),
          animation: isReady ? makeSampleAsset("thinking", slot) : undefined,
        };
      });

      const celebrateVariants = Array.from({ length: 10 }, (_, i) => {
        const slot = i + 1;
        const isReady = slot <= celebrateReadyCount;
        return {
          id: `slot_cel_${slot}`,
          slot_index: slot,
          image_url: `/img/cel_${slot}.png`,
          status: isReady ? ("ready" as const) : ("not_started" as const),
          animation: isReady ? makeSampleAsset("celebrate", slot) : undefined,
        };
      });

      const profile: MascotProfile = {
        id: mascotId,
        name: "Test Mascot",
        description: "Test description",
        visual_style: "pixar_3d",
        master_prompt: "Test master",
        color_theme: "#22c55e",
        styles: [
          {
            id: styleId,
            name: "Core Style",
            keyword: "scholarly",
            is_default: true,
            anchor_image_url: "/mascots/test/anchor.png",
            states: {
              thinking: thinkingVariants,
              celebrate: celebrateVariants,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mascotDir = path.join(tempStorageRoot, "mascots", mascotId);
      await fs.mkdir(mascotDir, { recursive: true });
      await fs.writeFile(path.join(mascotDir, "mascot.json"), JSON.stringify(profile, null, 2), "utf8");
      return profile;
    }

    it("strictly rejects publish when fewer than 20 slots are ready", async () => {
      // 10 thinking ready, but only 9 celebrate ready (19/20 slots)
      await seedMascotWithSlots("mascot_gate_1", "core", 10, 9);

      let error: PublishGateError | null = null;
      try {
        await publishService.publishStyleAnimations("mascot_gate_1", "core");
      } catch (err) {
        error = err as PublishGateError;
      }

      expect(error).not.toBeNull();
      expect(error).toBeInstanceOf(PublishGateError);
      expect(error?.code).toBe("PUBLISH_GATE_REJECTED");
      expect(error?.readyCount).toBe(19);
      expect(error?.totalRequired).toBe(20);
      expect(error?.missingSlots).toHaveLength(1);
      expect(error?.missingSlots[0]).toEqual({ state: "celebrate", slot_index: 10 });
    });

    it("strictly rejects publish when slots have qa_failed or missing animation asset", async () => {
      await seedMascotWithSlots("mascot_gate_2", "core", 10, 10);

      // Tamper slot 5 to qa_failed
      const mascotPath = path.join(tempStorageRoot, "mascots", "mascot_gate_2", "mascot.json");
      const raw = await fs.readFile(mascotPath, "utf8");
      const profile = JSON.parse(raw);
      profile.styles[0].states.thinking[4].status = "qa_failed";
      await fs.writeFile(mascotPath, JSON.stringify(profile, null, 2), "utf8");

      await expect(publishService.publishStyleAnimations("mascot_gate_2", "core")).rejects.toThrow(PublishGateError);
    });

    it("publishes successfully and updates all 20 records when all 20 slots pass", async () => {
      await seedMascotWithSlots("mascot_gate_3", "core", 10, 10);

      const result = await publishService.publishStyleAnimations("mascot_gate_3", "core");

      expect(result.ok).toBe(true);
      expect(result.publishedSlotsCount).toBe(20);
      expect(result.records).toHaveLength(20);
      expect(result.thinking).toHaveLength(10);
      expect(result.celebrate).toHaveLength(10);

      // Verify immutable published records on disk
      const thinkingPublished = await repo.listPublishedRecords("mascot_gate_3", "core", "thinking", 1);
      expect(thinkingPublished).toHaveLength(1);
      expect(thinkingPublished[0].revision).toBe(1);
      expect(thinkingPublished[0].asset.state).toBe("thinking");

      const celebratePublished = await repo.listPublishedRecords("mascot_gate_3", "core", "celebrate", 10);
      expect(celebratePublished).toHaveLength(1);
      expect(celebratePublished[0].revision).toBe(1);

      // Verify mascot profile was updated with published_at and bumped revision
      const slots = await repo.getStyleSlots("mascot_gate_3", "core");
      expect(slots.thinking[0].generation_revision).toBe(1);
      expect(slots.thinking[0].animation?.published_at).toBeDefined();
      expect(slots.celebrate[9].generation_revision).toBe(1);
      expect(slots.celebrate[9].animation?.published_at).toBeDefined();

      // Second publish bumps revision to 2
      const secondResult = await publishService.publishStyleAnimations("mascot_gate_3", "core");
      expect(secondResult.ok).toBe(true);
      const thinkingPublishedRev2 = await repo.listPublishedRecords("mascot_gate_3", "core", "thinking", 1);
      expect(thinkingPublishedRev2).toHaveLength(2);
      expect(thinkingPublishedRev2[1].revision).toBe(2);
    });
  });
});

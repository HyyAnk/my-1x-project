import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MascotPublishedAnimationAssetSchema,
  MASCOT_RECOMMENDED_PLACEMENT,
  resolveMascotAnimationFrameGeometry,
  resolveMascotAnimationRegistration,
  resolveMascotRenderGeometry,
  type MascotPublishedAnimationAsset,
  type MascotRenderSpecV2,
} from "../src/index.js";

function animation(width: number, height: number, x: number, state: "thinking" | "celebrate" = "thinking"): MascotPublishedAnimationAsset {
  return {
    version: 1,
    state,
    fps: 24,
    frame_count: 1,
    loop: true,
    manifest_url: "/manifest.json",
    transparent_video_url: "/video.webm",
    content_fingerprint: "content",
    source_fingerprint: "source",
    frames: [{ index: 0, x: 0, y: 0, width, height, duration_ms: 1000 / 24 }],
    registration: {
      source_width: width,
      source_height: height,
      content_bounds: { x: 0, y: 0, width, height },
      pivot: { x: width / 2, y: height - 1 },
      offset_x: x,
      offset_y: 720 - height,
    },
    video_registration: {
      source_width: 1280,
      source_height: 720,
      content_bounds: { x, y: 720 - height, width, height },
      pivot: { x: x + width / 2, y: 719 },
      offset_x: 0,
      offset_y: 0,
    },
  };
}

function spec(asset: MascotPublishedAnimationAsset, flip = false): MascotRenderSpecV2 {
  return {
    version: 2,
    canvas: { width: 1920, height: 1080 },
    phase: "thinking",
    reveal_outcome: null,
    visible: true,
    playing: false,
    timeline_time_seconds: 0,
    placement: { ...MASCOT_RECOMMENDED_PLACEMENT, flip_x: flip },
    motion: { preset: "none", speed: 1, intensity: "normal" },
    asset: {
      version: 2,
      action: asset.state,
      image_url: "/fallback.png",
      animation: asset,
      registration: asset.registration,
      motion: { preset: "none", speed: 1, intensity: "normal" },
    },
  };
}

describe("Full-canvas mascot video geometry", () => {
  for (const flip of [false, true])
    it(`keeps equal frame bounds across crop, state and pivot changes (flip=${flip})`, () => {
      const assets = [animation(1166, 688, 100), animation(698, 598, 288, "celebrate")];
      const frames = assets.map(resolveMascotAnimationFrameGeometry);
      assert.deepEqual(frames[0], frames[1]);
      assert.equal(frames[0].image_scale, 220 / 1280);
      assert.equal(frames[0].pivot_compensation_x, 0);
      assert.equal(frames[0].pivot_compensation_y, 0);
      const geometries = assets.map((asset) => resolveMascotRenderGeometry(spec(asset, flip)));
      assert.equal(geometries[0].box_x, geometries[1].box_x);
      assert.equal(geometries[0].box_y, geometries[1].box_y);
      assert.equal(geometries[0].box_width, geometries[1].box_width);
      assert.equal(geometries[0].box_height, geometries[1].box_height);
      assert.equal(geometries[0].pivot_x, geometries[1].pivot_x);
      assert.equal(geometries[0].pivot_y, geometries[1].pivot_y);
      assert.equal(geometries[0].registration_offset_x, 0);
      assert.equal(geometries[0].registration_offset_y, 0);
      // Actual subject bounds remain asset-specific; do not recenter the artwork.
      assert.notDeepEqual(geometries[0].visible_content, geometries[1].visible_content);
    });

  it("does not require atlas frames and reads legacy full-canvas registration", () => {
    const asset = animation(698, 598, 288);
    const legacy = { ...asset, registration: asset.video_registration!, video_registration: undefined, frames: undefined };
    assert.deepEqual(resolveMascotAnimationFrameGeometry(legacy), resolveMascotAnimationFrameGeometry(asset));
    assert.deepEqual(asset.video_registration?.pivot, { x: 637, y: 719 });
  });

  it("retains cropped registration for atlas-only fallback", () => {
    const asset = { ...animation(698, 598, 288), transparent_video_url: undefined, atlas_url: "/atlas.png" };
    assert.deepEqual(resolveMascotAnimationRegistration(asset), asset.registration);
    assert.equal(resolveMascotAnimationFrameGeometry(asset).image_scale, 220 / 698);
  });

  it("preserves and validates separate video registration through asset serialization", () => {
    const asset = animation(698, 598, 288);
    assert.deepEqual(MascotPublishedAnimationAssetSchema.parse(asset).video_registration, asset.video_registration);
    assert.equal(
      MascotPublishedAnimationAssetSchema.safeParse({ ...asset, video_registration: { ...asset.video_registration, source_width: 0 } })
        .success,
      false,
    );
  });
});

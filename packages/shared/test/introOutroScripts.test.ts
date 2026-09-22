import assert from "node:assert/strict";
import test from "node:test";
import { IntroOutroScriptJobSchema, MascotStyleIdentityProfileSchema, IntroOutroStyleSchema } from "../src/index.js";

test("MascotStyleIdentityProfile supports non-humanoid anatomy and tri-state capabilities", () => {
  const now = "2026-09-22T00:00:00.000Z";
  const profile = MascotStyleIdentityProfileSchema.parse({
    schema_version: 1,
    profile_id: "identity_1",
    mascot_id: "mascot_1",
    mascot_style_id: "flat_style",
    style_preset_id: "preset_arcade_classic",
    style_revision: 1,
    reference_asset_url: "/api/mascots/mascot_1/assets/anchor.png",
    reference_sha256: "a".repeat(64),
    reference_mime_type: "image/png",
    summary: "A limbless asymmetric flat shape",
    morphology: ["No visible limbs", "One rigid side marker"],
    features: [
      {
        id: "side_marker",
        description: "Rigid marker on the left edge",
        body_anchor: "left edge",
        material: "flat graphic",
        rigidity: "rigid",
        importance: "signature",
        visibility_rule: "Preserve in hero framing",
      },
    ],
    capabilities: {
      locomotion: "unknown",
      grasping: "unsupported",
      pointing: "unsupported",
      waving: "unsupported",
      flight: "unknown",
      facial_expression: "unknown",
      speech: "unknown",
      ride_vehicle: "unsupported",
      hold_props: "unsupported",
    },
    motion_constraints: ["Do not bend the side marker"],
    status: "reviewed",
    source: "manual",
    analysis_model: null,
    analysis_version: "manual-v1",
    created_at: now,
    updated_at: now,
    reviewed_at: now,
  });
  assert.equal(profile.capabilities.grasping, "unsupported");
  assert.equal(profile.features[0].rigidity, "rigid");
});

test("script jobs default new compatibility fields for persisted legacy jobs", () => {
  const job = IntroOutroScriptJobSchema.parse({
    schema_version: 1,
    job_id: "job_1",
    channel_id: "channel_1",
    project_id: null,
    type: "identity_analysis",
    requested_clip_kinds: [],
    status: "queued",
    step: "Queued",
    error_code: null,
    error_message: null,
    result_revision_ids: [],
    failed_clip_kinds: [],
    submitted_project_version: null,
    idempotency_key: "key_1",
    created_at: "2026-09-22T00:00:00.000Z",
    started_at: null,
    completed_at: null,
  });
  assert.deepEqual(job.clip_errors, []);
  assert.equal(job.request_fingerprint, null);
});

test("uploaded pair provenance is optional and remains backward compatible", () => {
  const style = IntroOutroStyleSchema.parse({
    style_id: "pair_1",
    channel_id: "channel_1",
    name: "Pair",
    intro: {
      filename: "intro.mp4",
      duration_seconds: 2,
      width: 1920,
      height: 1080,
      fps: 30,
      has_audio: true,
      script_provenance: {
        project_id: "project_1",
        revision_id: "revision_1",
        style_preset_id: "preset_arcade_classic",
        context_fingerprint: "b".repeat(64),
        linked_at: "2026-09-22T00:00:00.000Z",
      },
    },
    outro: { filename: "outro.mp4", duration_seconds: 2, width: 1920, height: 1080, fps: 30, has_audio: true },
    created_at: "2026-09-22T00:00:00.000Z",
    updated_at: "2026-09-22T00:00:00.000Z",
  });
  assert.equal(style.intro.script_provenance?.revision_id, "revision_1");
  assert.equal(style.outro.script_provenance, undefined);
});

import { describe, expect, it } from "vitest";
import {
  IntroOutroScriptContentSchema,
  IntroOutroScriptRevisionSchema,
  type IntroOutroScriptContent,
  type MascotStyleIdentityProfile,
} from "@studio/shared";
import { BUILT_IN_INTRO_OUTRO_SEEDS } from "../src/introOutroScripts/seedCatalog.js";
import { resolveSeedSelection } from "../src/introOutroScripts/seedSelection.js";
import { validateScriptContent } from "../src/introOutroScripts/validation.js";
import { resolveIntroOutroScriptModel } from "../src/introOutroScripts/model.js";
import { compileProductionPrompt } from "../src/introOutroScripts/productionPrompt.js";
import { reviewScriptQuality } from "../src/introOutroScripts/qualityReview.js";

const identity: MascotStyleIdentityProfile = {
  schema_version: 1,
  profile_id: "identity_1",
  mascot_id: "mascot_1",
  mascot_style_id: "style_1",
  style_preset_id: "preset_arcade_classic",
  style_revision: 1,
  reference_asset_url: "/reference.png",
  reference_sha256: "a".repeat(64),
  reference_mime_type: "image/png",
  summary: "A rigid limbless mascot",
  morphology: ["No visible limbs"],
  features: [
    {
      id: "rigid_marker",
      description: "Rigid side marker",
      body_anchor: "left edge",
      material: "plastic",
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
    flight: "unsupported",
    facial_expression: "unknown",
    speech: "unknown",
    ride_vehicle: "unsupported",
    hold_props: "unsupported",
  },
  motion_constraints: ["Keep rigid_marker rigid"],
  palette: [],
  style_description: "Flat graphic",
  allowed_accessories: [],
  status: "reviewed",
  source: "manual",
  analysis_model: null,
  analysis_version: "manual-v1",
  created_at: "2026-09-22T00:00:00.000Z",
  updated_at: "2026-09-22T00:00:00.000Z",
  reviewed_at: "2026-09-22T00:00:00.000Z",
};

function productionContent(): IntroOutroScriptContent {
  return IntroOutroScriptContentSchema.parse({
    production: { clip_kind: "intro", language: "English", aspect_ratio: "16:9", target_duration_seconds: 8 },
    production_directions: {
      reference_mode: "character_reference",
      logo_mode: "none",
      voice_source: "narrator",
      logo_placement: "No logo",
      opening_state: "Centered mascot",
      closing_state: "Settled mascot",
      end_hold_seconds: 0.75,
    },
    identity: {
      profile_id: identity.profile_id,
      mascot_id: identity.mascot_id,
      mascot_style_id: identity.mascot_style_id,
      required_feature_ids: ["rigid_marker"],
    },
    style: { description: "Flat", palette: [], staging: "Center", motion_language: "Restrained" },
    timeline: [
      {
        beat: 1,
        role: "entrance",
        start_seconds: 0,
        end_seconds: 2,
        action: "Hold a calm opening pose",
        capability_ids: [],
        props: [],
        visible_feature_ids: ["rigid_marker"],
      },
      {
        beat: 2,
        role: "brand_interaction",
        start_seconds: 2,
        end_seconds: 5,
        action: "Settle",
        capability_ids: [],
        props: [],
        visible_feature_ids: ["rigid_marker"],
      },
      {
        beat: 3,
        role: "handoff",
        start_seconds: 5,
        end_seconds: 8,
        action: "Hold",
        capability_ids: [],
        props: [],
        visible_feature_ids: ["rigid_marker"],
      },
    ],
    voiceover: {
      enabled: true,
      lines: [{ start_seconds: 0.5, end_seconds: 4.5, text: "Let the game begin now", delivery: "Warm narrator" }],
    },
    audio: { music_direction: "Light cue", events: [{ at_seconds: 5, direction: "Soft chime" }] },
    camera: [{ start_seconds: 0, end_seconds: 8, framing: "Wide", movement: "Static" }],
    consistency: { preserve_feature_ids: ["rigid_marker"], allowed_visible_text: [], restrictions: [] },
  });
}

describe("Intro/Outro script domain", () => {
  it("bounds verbose reviewer messages without discarding a valid quality review", async () => {
    const verboseMessage = `${"Character-relative direction conflicts with the reserved logo area. ".repeat(9)}Use the opposite gauntlet.`;
    const review = await reviewScriptQuality({
      client: {
        connect: () => Promise.resolve(),
        generateContent: () =>
          Promise.resolve(
            JSON.stringify({
              findings: [
                {
                  code: "IDENTITY_DRIFT",
                  severity: "error",
                  path: "timeline.1.action",
                  message: verboseMessage,
                },
              ],
            }),
          ),
      },
      model: "gemini-3.7-flash-high",
      content: productionContent(),
      identity,
      seeds: [],
      imageAttachments: [],
      signal: new AbortController().signal,
    });

    expect(verboseMessage.length).toBeGreaterThan(500);
    expect(review.findings[0].message.length).toBeLessThanOrEqual(500);
    expect(review.findings[0].message).toContain("Use the opposite gauntlet.");
  });

  it("keeps a configured Gemini Flash model and rejects non-Flash or image models", () => {
    expect(resolveIntroOutroScriptModel("gemini-3.6-flash-high")).toBe("gemini-3.6-flash-high");
    expect(resolveIntroOutroScriptModel("gemini-pro-agent")).toBe("gemini-3.7-flash-high");
    expect(resolveIntroOutroScriptModel("gemini-3.1-flash-image")).toBe("gemini-3.7-flash-high");
  });

  it("selects compatible seeds deterministically and excludes unsupported anatomy", () => {
    const first = resolveSeedSelection({
      clipKind: "intro",
      catalog: BUILT_IN_INTRO_OUTRO_SEEDS,
      identity,
      randomizationSeed: "stable-seed",
    });
    const second = resolveSeedSelection({
      clipKind: "intro",
      catalog: BUILT_IN_INTRO_OUTRO_SEEDS,
      identity,
      randomizationSeed: "stable-seed",
    });
    expect(second.selection.selected_seed_ids).toEqual(first.selection.selected_seed_ids);
    expect(first.seeds.some((seed) => seed.required_capabilities.includes("grasping"))).toBe(false);
    expect(first.seeds.some((seed) => seed.required_capabilities.includes("ride_vehicle"))).toBe(false);
  });

  it("rejects invented capabilities and unknown feature IDs", () => {
    const content: IntroOutroScriptContent = {
      production: { clip_kind: "intro", language: "English", aspect_ratio: "16:9", target_duration_seconds: 8 },
      identity: {
        profile_id: identity.profile_id,
        mascot_id: identity.mascot_id,
        mascot_style_id: identity.mascot_style_id,
        required_feature_ids: ["rigid_marker"],
      },
      style: { description: "Flat", palette: [], staging: "Center", motion_language: "Restrained" },
      timeline: [
        {
          beat: 1,
          role: "entrance",
          start_seconds: 0,
          end_seconds: 2.4,
          action: "Wave",
          capability_ids: ["waving"],
          props: [],
          visible_feature_ids: ["invented_hand"],
        },
        {
          beat: 2,
          role: "brand_interaction",
          start_seconds: 2.4,
          end_seconds: 6,
          action: "Pause",
          capability_ids: [],
          props: [],
          visible_feature_ids: ["rigid_marker"],
        },
        {
          beat: 3,
          role: "handoff",
          start_seconds: 6,
          end_seconds: 8,
          action: "Settle",
          capability_ids: [],
          props: [],
          visible_feature_ids: ["rigid_marker"],
        },
      ],
      voiceover: { enabled: false, lines: [] },
      audio: { music_direction: "", events: [] },
      camera: [{ start_seconds: 0, end_seconds: 8, framing: "Wide", movement: "Static" }],
      consistency: { preserve_feature_ids: ["rigid_marker"], allowed_visible_text: [], restrictions: [] },
    };
    const issues = validateScriptContent(content, identity, []);
    expect(issues.map((issue) => issue.code)).toContain("CAPABILITY_REFERENCE_UNSUPPORTED");
    expect(issues.map((issue) => issue.code)).toContain("FEATURE_REFERENCE_UNKNOWN");
  });

  it("reports missing action capabilities deterministically for locomotion, waving, and pointing", () => {
    const content = productionContent();
    content.timeline[0].action = "Walks into a settled pose";
    content.timeline[1].action = "Waves gently toward camera";
    content.timeline[2].action = "Points to the empty logo zone";

    const validateMissingCapabilities = () =>
      validateScriptContent(content, identity, []).filter((issue) => issue.code === "ACTION_CAPABILITY_MISSING");
    const expectedIssues = [
      {
        code: "ACTION_CAPABILITY_MISSING",
        severity: "error",
        path: "timeline.0.capability_ids",
        message: "The described action requires the locomotion capability. Add it or simplify the action.",
      },
      {
        code: "ACTION_CAPABILITY_MISSING",
        severity: "error",
        path: "timeline.1.capability_ids",
        message: "The described action requires the waving capability. Add it or simplify the action.",
      },
      {
        code: "ACTION_CAPABILITY_MISSING",
        severity: "error",
        path: "timeline.2.capability_ids",
        message: "The described action requires the pointing capability. Add it or simplify the action.",
      },
    ];

    expect(validateMissingCapabilities()).toEqual(expectedIssues);
    expect(validateMissingCapabilities()).toEqual(expectedIssues);
  });

  it("accepts a timed narrator script with a settled ending", () => {
    expect(validateScriptContent(productionContent(), identity, [])).toEqual([]);
  });

  it("flags overlapping or incomplete camera coverage and misplaced sound", () => {
    const content = productionContent();
    content.camera = [
      { start_seconds: 0, end_seconds: 2, framing: "Wide", movement: "Static" },
      { start_seconds: 2.5, end_seconds: 7.5, framing: "Medium", movement: "Static" },
    ];
    content.audio.events[0].at_seconds = 8;
    expect(validateScriptContent(content, identity, []).map((item) => item.code)).toEqual(
      expect.arrayContaining(["CAMERA_TIMING_INVALID", "CAMERA_COVERAGE", "AUDIO_OUT_OF_RANGE"]),
    );
  });

  it("rejects rushed narration, final-hold overlap and unsupported mascot speech", () => {
    const content = productionContent();
    content.voiceover.lines[0] = {
      start_seconds: 5,
      end_seconds: 7.75,
      text: "Welcome to our show and find out what happens when this round begins right here",
      delivery: "Fast",
    };
    content.production_directions!.voice_source = "mascot";
    const codes = validateScriptContent(content, identity, []).map((item) => item.code);
    expect(codes).toEqual(expect.arrayContaining(["VOICE_BUDGET_EXCEEDED", "VOICE_OVERLAP_OR_HOLD", "SPEECH_UNCONFIRMED"]));
  });

  it("reads a legacy revision without v3 fields and makes its export limitations explicit", () => {
    const content = productionContent();
    delete content.production_directions;
    const revision = IntroOutroScriptRevisionSchema.parse({
      schema_version: 1,
      revision_id: "script_intro_legacy",
      project_id: "project_1",
      channel_id: "channel_1",
      style_preset_id: "preset_arcade_classic",
      clip_kind: "intro",
      revision_number: 1,
      origin: "generated",
      content,
      seed_selection: { randomization_seed: "old", selected_seed_ids: [], locked_dimensions: [], algorithm_version: "1" },
      seed_snapshot: [],
      references: [{ role: "mascot_subject", asset_id: "asset_1", url: "/reference.png", sha256: "a".repeat(64), mime_type: "image/png" }],
      context_fingerprint: "b".repeat(64),
      template_version: "intro-outro-script-v2",
      requested_model: "gemini-3.7-flash-high",
      effective_model: null,
      validation_issues: [],
      warning_acknowledgements: [],
      created_at: "2026-09-22T00:00:00.000Z",
    });
    expect(revision.quality_review).toBeUndefined();
    expect(revision.identity_snapshot).toBeUndefined();
    const prompt = compileProductionPrompt(revision);
    expect(prompt).toContain("legacy revision has no identity snapshot");
    expect(prompt).toContain("Confirm opening pose, final hold and logo handling");
  });
});

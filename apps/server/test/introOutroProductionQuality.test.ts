import { describe, expect, it } from "vitest";
import { IntroOutroScriptRevisionSchema, type CreativeSeed } from "@studio/shared";
import { identity, productionContent } from "./fixtures/introOutroDomainFixture.js";
import { validateChoreography } from "../src/introOutroScripts/choreographyValidation.js";
import { assembleChoreography } from "../src/introOutroScripts/generatedChoreography.js";
import { finalActionText } from "../src/introOutroScripts/choreographyPolicy.js";
import { compileProductionPrompt } from "../src/introOutroScripts/productionPrompt.js";
import { resolveSeedSelection } from "../src/introOutroScripts/seedSelection.js";
import { BUILT_IN_INTRO_OUTRO_SEEDS } from "../src/introOutroScripts/seedCatalog.js";

function contentV6() {
  const content = productionContent();
  content.production_policy = "single-action-hero-hold-v1";
  content.production_directions!.end_hold_seconds = 1;
  content.timeline.forEach((beat) => {
    beat.choreography = { primary_action: "hold", expression: "Warm", secondary_motion: "none", end_pose: "front_facing" };
  });
  content.timeline[2].action = finalActionText(content.timeline[2].choreography!, 7);
  content.camera = [
    { start_seconds: 0, end_seconds: 7, framing: "Wide", movement: "Static" },
    { start_seconds: 7, end_seconds: 8, framing: "Wide", movement: "Static locked camera" },
  ];
  return content;
}

describe("single-action production policy", () => {
  it("accepts a single stationary ending and keeps legacy revisions outside the new policy", () => {
    expect(validateChoreography(contentV6(), identity)).toEqual([]);
    expect(validateChoreography(productionContent(), identity)).toEqual([]);
  });
  it.each(["Walk three strides, pivot and hold", "Wave, then bring paws together and bow"])(
    "does not let a provider closing chain reach production: %s",
    (action) => {
      const content = contentV6();
      content.timeline[2].action = action;
      expect(validateChoreography(content, identity).length).toBeGreaterThan(0);
      const assembled = assembleChoreography(content.timeline, 8);
      expect(assembled[2].action).toBe("Hold the settled pose; settle by 7s and remain still through the end.");
    },
  );
  it("rejects unsupported gestures and action injection through expression or closing state", () => {
    const content = contentV6();
    content.timeline[2].choreography!.primary_action = "wave";
    content.timeline[2].choreography!.expression = "Wave then bow";
    content.production_directions!.closing_state = "Walk toward the stage exit";
    expect(validateChoreography(content, identity).length).toBeGreaterThanOrEqual(3);
  });
  it("rejects moving final camera, excessive dialogue, sound during the hold and changed pose", () => {
    const content = contentV6();
    content.camera[1].movement = "Push in";
    content.timeline[2].choreography!.end_pose = "three_quarter";
    content.voiceover.lines.push({ ...content.voiceover.lines[0] });
    content.audio.events[0].at_seconds = 7.5;
    expect(validateChoreography(content, identity).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["camera", "voiceover", "audio.events", "timeline.2.choreography.end_pose"]),
    );
  });
  it("compiles a compact prompt without dropping reference or motion constraints", () => {
    const content = contentV6();
    const revision = IntroOutroScriptRevisionSchema.parse({
      schema_version: 1,
      revision_id: "r",
      project_id: "p",
      channel_id: "c",
      style_preset_id: "s",
      clip_kind: "intro",
      revision_number: 1,
      origin: "generated",
      content,
      identity_snapshot: identity,
      seed_selection: { randomization_seed: "seed", selected_seed_ids: [], locked_dimensions: [], algorithm_version: "1" },
      seed_snapshot: [],
      references: [{ role: "mascot_subject", asset_id: "asset", url: "/asset.png", sha256: "a".repeat(64), mime_type: "image/png" }],
      context_fingerprint: "a".repeat(64),
      template_version: "intro-outro-script-v6",
      requested_model: "test",
      effective_model: null,
      validation_issues: [],
      created_at: identity.created_at,
    });
    const prompt = compileProductionPrompt(revision);
    for (const kind of ["intro", "outro"] as const) {
      for (const policy of [content.production_policy, undefined]) {
        const candidate = {
          ...revision,
          clip_kind: kind,
          content: { ...content, production_policy: policy, production: { ...content.production, clip_kind: kind } },
        };
        expect(compileProductionPrompt(candidate).split("\n")[0]).toBe(`Create one continuous ${kind}`);
      }
    }
    expect(prompt.split(/\s+/).length).toBeLessThan(500);
    expect(prompt).toContain("Rigid side marker");
    expect(prompt).toContain("Keep rigid_marker rigid");
    expect(prompt).toContain("Static locked camera");
    expect(prompt).not.toContain("capability_ids");
    expect(prompt).not.toContain("visibility:");
    expect(prompt).not.toContain("material:");
  });
});

describe("production seed matrix", () => {
  const supported = {
    ...identity,
    capabilities: { ...identity.capabilities, locomotion: "supported" as const, flight: "supported" as const },
  };
  const select = (catalog: CreativeSeed[], selectedSeedIds?: string[], durationSeconds = 8) =>
    resolveSeedSelection({
      clipKind: "outro",
      catalog,
      identity: supported,
      randomizationSeed: "stable",
      selectedSeedIds,
      durationSeconds,
    });
  it("excludes departure seeds even for mascots that can travel", () => {
    for (let index = 0; index < 100; index++) {
      const result = resolveSeedSelection({
        clipKind: "outro",
        catalog: BUILT_IN_INTRO_OUTRO_SEEDS,
        identity: supported,
        randomizationSeed: String(index),
      });
      expect(result.seeds.find((seed) => seed.dimension === "outro_farewell")?.id).toMatch(/^G0[146]$/);
    }
    expect(() => select(BUILT_IN_INTRO_OUTRO_SEEDS, ["G05"])).toThrow();
  });
  it("searches compatible combinations deterministically and rejects conflicting explicit selections", () => {
    const catalog = BUILT_IN_INTRO_OUTRO_SEEDS.map((seed) => (seed.id === "E01" ? { ...seed, forbidden_seed_ids: ["F01"] } : seed));
    expect(() => select(catalog, ["E01", "F01"])).toThrow();
    const first = select(catalog, ["E01"]);
    expect(select(catalog, ["E01"]).selection).toEqual(first.selection);
    expect(first.selection.selected_seed_ids).not.toContain("F01");
  });
  it("limits medium complexity at short duration and rejects unknown explicit IDs", () => {
    const catalog = BUILT_IN_INTRO_OUTRO_SEEDS.map((seed) => (seed.id === "E01" ? { ...seed, complexity: "medium" as const } : seed));
    expect(() => select(catalog, ["E01"], 6)).toThrow();
    expect(() => select(catalog, ["missing"])).toThrow();
  });
});

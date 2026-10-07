import { describe, expect, it } from "vitest";
import { IntroOutroScriptContentSchema, type IntroOutroScriptContent } from "@studio/shared";
import { identity, productionContent } from "./fixtures/introOutroDomainFixture.js";
import { CREATIVE_PRODUCTION_POLICY } from "../src/introOutroScripts/creativePolicy.js";
import { assembleCreativeTimeline } from "../src/introOutroScripts/creativeTimeline.js";
import { normalizeGeneratedContent } from "../src/introOutroScripts/generatedNormalization.js";
import { hasBlockingIssues, validateScriptContent } from "../src/introOutroScripts/validation.js";
import { mergeGeneratedContent } from "../src/introOutroScripts/promptCompiler.js";
import { compatibleSeeds } from "../src/introOutroScripts/seedProductionPolicy.js";
import { BUILT_IN_INTRO_OUTRO_SEEDS } from "../src/introOutroScripts/seedCatalog.js";
import { buildCreativeGenerationPrompt } from "../src/introOutroScripts/creativeGenerationPrompt.js";
import { compileCreativeProductionPrompt } from "../src/introOutroScripts/creativeProductionPrompt.js";
import { resolveSeedSelection } from "../src/introOutroScripts/seedSelection.js";

function creativeContent(): IntroOutroScriptContent {
  const c = productionContent();
  c.production_policy = CREATIVE_PRODUCTION_POLICY;
  c.dialogue_policy = "mascot-direct-speech-v1";
  c.production_directions!.voice_source = "mascot";
  c.production_directions!.end_hold_seconds = 0;
  c.timeline[0].action = "The spotlight moves, then pauses, then returns to the mascot";
  c.timeline[2].action = "Two matching silhouettes exchange a delighted reaction as the last sparkle fades";
  c.voiceover.lines = [
    { start_seconds: 1.8, end_seconds: 2.3, text: "Again?", delivery: "First mascot, curious" },
    { start_seconds: 7.1, end_seconds: 7.8, text: "Again?", delivery: "Second mascot, knowingly repeats the question" },
  ];
  c.audio.events = Array.from({ length: 9 }, (_, index) => ({
    at_seconds: index === 8 ? 7.9 : index * 0.8,
    direction: `Reaction accent ${index + 1}`,
  }));
  return c;
}

describe("creative production policy", () => {
  it("keeps intentional repetition, late speech/SFX, multiple micro-actions and custom endings", () => {
    const c = creativeContent();
    c.timeline[1].action = 'The second silhouette echoes "Again?" during the scheduled reply';
    c.timeline[1].props = ["light", "ribbon"];
    const issues = validateScriptContent(IntroOutroScriptContentSchema.parse(c), identity, []);
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(issues.some((issue) => issue.code === "ACTION_CAPABILITY_MISSING" && issue.severity === "warning")).toBe(true);
    expect(normalizeGeneratedContent(c, identity)).toEqual(c);
  });

  it("preserves long authored text, custom group timing and all identity restrictions", () => {
    const c = creativeContent();
    c.timeline[0].action = "The light changes color while the mascot watches with curiosity. ".repeat(12).trim();
    c.timeline[0].end_seconds = 1.4;
    c.timeline[1].start_seconds = 1.4;
    c.consistency.restrictions = Array.from({ length: 8 }, (_, i) => `Preserve reference detail ${i}`);
    expect(assembleCreativeTimeline(c.timeline, 8, "intro")).toEqual(c.timeline);
    const merged = mergeGeneratedContent({ raw: c, clipKind: "intro", durationSeconds: 8, identity });
    expect(IntroOutroScriptContentSchema.parse(merged).consistency.restrictions).toEqual(c.consistency.restrictions);
    expect(normalizeGeneratedContent(c, identity).timeline[0].action.length).toBeGreaterThan(500);
  });

  it("supplies omitted grouping timestamps but does not hide invalid supplied timestamps", () => {
    const c = creativeContent();
    const groups = c.timeline.map(({ action }) => ({ action }));
    expect(assembleCreativeTimeline(groups, 8, "intro")[2].end_seconds).toBe(8);
    expect(() => assembleCreativeTimeline([{ ...groups[0], start_seconds: -1 }, ...groups.slice(1)], 8, "intro")).toThrow();
  });

  it.each([
    [
      "speech overlap",
      (c: IntroOutroScriptContent) => {
        c.voiceover.lines[1].start_seconds = 2;
      },
    ],
    [
      "out-of-range audio",
      (c: IntroOutroScriptContent) => {
        c.audio.events[0].at_seconds = 8;
      },
    ],
    [
      "timeline gap",
      (c: IntroOutroScriptContent) => {
        c.timeline[1].start_seconds = 2.2;
      },
    ],
    [
      "identity mismatch",
      (c: IntroOutroScriptContent) => {
        c.identity.profile_id = "other";
      },
    ],
    [
      "unsupported capability",
      (c: IntroOutroScriptContent) => {
        c.timeline[0].capability_ids = ["waving"];
      },
    ],
    [
      "unknown feature",
      (c: IntroOutroScriptContent) => {
        c.timeline[0].visible_feature_ids = ["invented"];
      },
    ],
  ] as const)("keeps %s advisory except cross-project identity mismatch", (label, mutate) => {
    const c = creativeContent();
    mutate(c);
    expect(hasBlockingIssues(validateScriptContent(c, identity, []))).toBe(label === "identity mismatch");
  });

  it("warns about pace or uncertain motion without rewriting or rejecting the performance", () => {
    const c = creativeContent();
    c.timeline[0].capability_ids = ["locomotion"];
    c.voiceover.lines[0].text = "Wait what just happened over there?";
    const issues = validateScriptContent(c, identity, []);
    expect(issues.some((issue) => issue.code === "VOICE_PACING_FAST")).toBe(true);
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(normalizeGeneratedContent(c, identity).voiceover).toEqual(c.voiceover);
  });

  it("accepts an authored silent performance", () => {
    const c = creativeContent();
    c.voiceover = { enabled: false, lines: [] };
    c.production_directions!.voice_source = "none";
    expect(hasBlockingIssues(validateScriptContent(c, identity, []))).toBe(false);
  });

  it("allows complex seed combinations but preserves explicit exclusions", () => {
    const seeds = BUILT_IN_INTRO_OUTRO_SEEDS.slice(0, 4).map((seed) => ({ ...seed, complexity: "high" as const, forbidden_seed_ids: [] }));
    expect(compatibleSeeds(seeds.slice(0, 3), seeds[3])).toBe(true);
    expect(compatibleSeeds(seeds.slice(0, 3), { ...seeds[3], forbidden_seed_ids: [seeds[0].id] })).toBe(false);
  });

  it("enforces in-media-res zero static openings in generated creative prompts", () => {
    const prompt = buildCreativeGenerationPrompt(
      {
        context: {
          channel: { id: "ch1", display_name: "Quizzy Channel", target_audience: "kids" },
          style: { id: "st1", name: "Playful 3D" },
          mascotReference: { absolutePath: "/tmp/mascot.png", mimeType: "image/png" },
        },
        identity,
        clips: [{ clipKind: "intro", durationSeconds: 8, seeds: [] }],
      },
      "intro",
    );
    expect(prompt).toContain("ZERO STATIC OPENINGS (IN-MEDIA-RES MOTION)");
    expect(prompt).toContain("Frame 0.0s must NEVER show the mascot standing still");
    expect(prompt).toContain("production_directions.opening_state must describe the mascot ALREADY in active kinetic motion at 0.0s");
  });

  it("enforces cinematic action detail mandate and 6-beat kinetic structure for two-part outros", () => {
    const prompt = buildCreativeGenerationPrompt(
      {
        context: {
          channel: { id: "ch1", display_name: "Quizzy Channel", target_audience: "kids" },
          style: { id: "st1", name: "Playful 3D" },
          mascotReference: { absolutePath: "/tmp/mascot.png", mimeType: "image/png" },
        },
        identity,
        clips: [{ clipKind: "outro", durationSeconds: 16, seeds: [] }],
      },
      "outro",
    );
    expect(prompt).toContain("CINEMATIC ACTION DETAIL & KINETIC DENSITY MANDATE");
    expect(prompt).toContain("p1_kinetic_entrance");
    expect(prompt).toContain("p1_transition_stunt");
    expect(prompt).toContain("p2_momentum_recovery");
    expect(prompt).toContain("CRITICAL TRANSITION MANDATE");
    expect(prompt).toContain("STRICTLY FORBIDDEN: Static shock faces");
  });

  it("enforces comic springboard wipe and forbids shock pose when comic_freeze is selected", () => {
    const prompt = buildCreativeGenerationPrompt(
      {
        context: {
          channel: { id: "ch1", display_name: "Quizzy Channel", target_audience: "kids" },
          style: { id: "st1", name: "Playful 3D" },
          mascotReference: { absolutePath: "/tmp/mascot.png", mimeType: "image/png" },
        },
        identity,
        clips: [{ clipKind: "outro", durationSeconds: 16, seeds: [], transitionStyle: "comic_freeze" }],
      },
      "outro",
    );
    expect(prompt).toContain("NEVER freeze in a static shock pose");
    expect(prompt).toContain("Comic Springboard & Starburst Wipe");
    expect(prompt).toContain("ENTRANCE SEED LOCOMOTION FIDELITY");
  });

  it("catalogs diverse in-motion outro entrance seeds (dino, kart, plane, surf, broom, vines, car)", () => {
    const outroEntrance = BUILT_IN_INTRO_OUTRO_SEEDS.filter((s) => s.dimension === "outro_entrance");
    const ids = outroEntrance.map((s) => s.id);
    expect(ids).toContain("J01"); // Dino & Creature Mount
    expect(ids).toContain("J02"); // Plane & Aerial Glider
    expect(ids).toContain("J03"); // Bicycle & Kart Dash
    expect(ids).toContain("J04"); // Surfboard & Skate Slide
    expect(ids).toContain("J05"); // Magic Broom & Flight
    expect(ids).toContain("J06"); // Canopy Vine Swing
    expect(ids).toContain("J07"); // Racecar & Cruiser Drive
    expect(ids).toContain("J08"); // Skydiving & Jetpack Soar
    expect(ids).toContain("J09"); // Parkour Sprint & Vault
    expect(ids).toContain("J10"); // Roller Skate Cruise

    const outroRecognition = BUILT_IN_INTRO_OUTRO_SEEDS.filter((s) => s.dimension === "outro_recognition");
    const recIds = outroRecognition.map((s) => s.id);
    expect(recIds).toContain("E01"); // Delighted Response
    expect(recIds).toContain("E02"); // Reward Reveal
    expect(recIds).toContain("E08"); // Comic Playful Silliness
    expect(recIds).toContain("E09"); // Proud Hero Fist Pump

    const h10 = BUILT_IN_INTRO_OUTRO_SEEDS.find((s) => s.id === "H10");
    expect(h10?.name).toBe("Comic Springboard & Starburst Wipe");
    expect(h10?.narrative_intent).not.toContain("shock pose that freezes solid");
  });

  it("catalogs diverse in-motion intro entrance seeds including mounts, vehicles and stunts", () => {
    const introEntrance = BUILT_IN_INTRO_OUTRO_SEEDS.filter((s) => s.dimension === "intro_entrance");
    const ids = introEntrance.map((s) => s.id);
    expect(ids).toContain("A18"); // Dino & Creature Mount
    expect(ids).toContain("A19"); // Plane & Aerial Glider
    expect(ids).toContain("A20"); // Racecar & Cruiser Drive
    expect(ids).toContain("A21"); // Parkour Sprint & Vault
    expect(ids).toContain("A22"); // Roller Skate Cruise
    expect(ids).toContain("A23"); // Springboard & Trampoline Bounce
  });

  it("catalogs diverse cinematic intro environment seeds", () => {
    const introEnv = BUILT_IN_INTRO_OUTRO_SEEDS.filter((s) => s.dimension === "intro_environment");
    const ids = introEnv.map((s) => s.id);
    expect(ids).toContain("I01"); // Neon Cyber Arcade
    expect(ids).toContain("I02"); // Grand Trivia Arena
    expect(ids).toContain("I03"); // Playful Candy Toyland
    expect(ids).toContain("I04"); // Cosmic Galaxy Planetarium
    expect(ids).toContain("I05"); // Enchanted Magic Forest
    expect(ids).toContain("I06"); // Pop-Art Comic Studio
    expect(ids).toContain("I07"); // High-Tech Futuristic Lab
    expect(ids).toContain("I08"); // Golden Sunset Amphitheater
  });

  it("enforces single continuous take and omits transitions for 10s single-clip outros", () => {
    const prompt = buildCreativeGenerationPrompt(
      {
        context: {
          channel: { id: "ch1", display_name: "Quizzy Channel", target_audience: "kids" },
          style: { id: "st1", name: "Playful 3D" },
          mascotReference: { absolutePath: "/tmp/mascot.png", mimeType: "image/png" },
        },
        identity,
        clips: [{ clipKind: "outro", durationSeconds: 10, seeds: [] }],
      },
      "outro",
    );

    expect(prompt).toContain("NO TRANSITION CUTS OR SCENE BREAKS");
    expect(prompt).toContain("SINGLE CONTINUOUS TAKE MANDATE");
    expect(prompt).toContain("Kinematic Entrance");
    expect(prompt).toContain("Channel Subscription & Brand Core");
    expect(prompt).toContain("Friendly Farewell Sign-off");
    expect(prompt).toContain("Hit subscribe for more daily brain challenges!");
    expect(prompt).toContain("See ya next time! Bye-bye!");
    expect(prompt).not.toContain("CRITICAL TRANSITION MANDATE");
    expect(prompt).not.toContain("p1_transition_stunt");

    const resolved = resolveSeedSelection({
      clipKind: "outro",
      catalog: BUILT_IN_INTRO_OUTRO_SEEDS,
      identity,
      randomizationSeed: "stable-10s",
      durationSeconds: 10,
    });
    expect(resolved.seeds.map((s) => s.dimension)).toEqual([
      "outro_entrance",
      "outro_recognition",
      "outro_invitation",
      "outro_farewell",
    ]);

    const legacyResolved = resolveSeedSelection({
      clipKind: "outro",
      catalog: BUILT_IN_INTRO_OUTRO_SEEDS,
      identity,
      randomizationSeed: "legacy-test",
      selectedSeedIds: ["E08", "E01", "F01", "G01"],
      durationSeconds: 10,
    });
    expect(legacyResolved.seeds.find((s) => s.dimension === "outro_entrance")?.id).toBe("J01");
  });

  it("enforces single continuous take, zero cuts, and mount continuity for 10s intro scripts", () => {
    const prompt = buildCreativeGenerationPrompt(
      {
        context: {
          channel: { id: "ch1", display_name: "Quizzy Channel", target_audience: "kids" },
          style: { id: "st1", name: "Playful 3D" },
          mascotReference: { absolutePath: "/tmp/mascot.png", mimeType: "image/png" },
        },
        identity,
        clips: [{ clipKind: "intro", durationSeconds: 10, seeds: [] }],
      },
      "intro",
    );

    expect(prompt).toContain("NO TRANSITION CUTS OR SCENE BREAKS (ABSOLUTE ZERO CUTS)");
    expect(prompt).toContain("SINGLE CONTINUOUS TAKE MANDATE (ZERO CUTS)");
    expect(prompt).toContain("PERSISTENT VEHICLE / MOUNT CONTINUITY (ZERO DISAPPEARING VEHICLES)");
    expect(prompt).toContain("Kinematic Entrance");
    expect(prompt).toContain("Brand Interaction & Spoken Hook");
    expect(prompt).toContain("Energetic Quiz Handoff");
    expect(prompt).toContain("Single continuous shot, zero cuts (Wide-to-Medium Steadicam Glide)");
    expect(prompt).toContain("The hard cut into Question 1 occurs outside this clip during final timeline editing.");
    expect(prompt).toContain("CINEMATIC SCENE ARCHITECTURE MANDATE");
    expect(prompt).toContain("flooring physics and reflections");
    expect(prompt).toContain("Polished mirror-gloss epoxy arena floor");
    expect(prompt).toContain("INTRO SPOKEN HOOK DIVERSITY & ANTI-CLICHÉ MANDATE");
    expect(prompt).toContain("STRICTLY BANNED BOILERPLATE CLICHÉS");
  });

  it("compiles production prompt with single unbroken continuous take camera for intro", () => {
    const content = creativeContent();
    content.production.clip_kind = "intro";
    content.production.target_duration_seconds = 10;
    content.camera = [
      { start_seconds: 0, end_seconds: 3.5, framing: "Wide shot", movement: "Tracking dynamic entrance" },
      { start_seconds: 3.5, end_seconds: 10, framing: "Medium hero", movement: "Gliding beside logo and pushing forward" },
    ];
    const compiled = compileCreativeProductionPrompt({
      schema_version: 1,
      revision_id: "rev-intro-1",
      project_id: "proj-1",
      channel_id: "ch-1",
      style_preset_id: "preset-1",
      clip_kind: "intro",
      revision_number: 1,
      origin: "generated",
      content,
      identity_snapshot: identity,
      seed_selection: { randomization_seed: "seed", selected_seed_ids: [], locked_dimensions: [], algorithm_version: "1" },
      seed_snapshot: [],
      references: [{ role: "mascot_subject", asset_id: "a", url: "/a.png", sha256: "a".repeat(64), mime_type: "image/png" }],
      context_fingerprint: "a".repeat(64),
      template_version: "intro-outro-script-v13",
      requested_model: "test",
      effective_model: null,
      validation_issues: [],
      warning_acknowledgements: [],
      created_at: identity.created_at,
    });

    expect(compiled).toContain(
      "CAMERA\n[0-10s] Single unbroken continuous take, zero camera cuts: Wide shot; Tracking dynamic entrance -> seamlessly continuing into Medium hero; Gliding beside logo and pushing forward",
    );
    expect(compiled).toContain(
      "Single continuous unbroken camera take: absolute zero camera cuts, zero scene transitions, and zero shot edits. The entire 10s video must remain in one uninterrupted take.",
    );
    expect(compiled).toContain("Hard cut into the quiz occurs outside this clip during final timeline editing.");
  });
});

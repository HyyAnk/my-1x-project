import { describe, expect, it } from "vitest";
import { identity, productionContent } from "./fixtures/introOutroDomainFixture.js";
import { assembleChoreography } from "../src/introOutroScripts/generatedChoreography.js";
import { finalActionText } from "../src/introOutroScripts/choreographyPolicy.js";
import { validateChoreography } from "../src/introOutroScripts/choreographyValidation.js";
import { compileCompactProductionPrompt } from "../src/introOutroScripts/compactProductionPrompt.js";
import { buildIntroGenerationPrompt } from "../src/introOutroScripts/introGenerationPrompt.js";
import { buildOutroGenerationPrompt } from "../src/introOutroScripts/outroGenerationPrompt.js";
import { introBeatStructure, outroBeatStructure } from "../src/introOutroScripts/generationStructure.js";
import { normalizeGeneratedContent } from "../src/introOutroScripts/generatedNormalization.js";
import { IntroOutroScriptRevisionSchema } from "@studio/shared";

describe("Decoupled Intro & Outro Generation Architecture", () => {
  it("decouples final action text between intro (peak dynamic energy) and outro (settled hold)", () => {
    const plan = {
      primary_action: "celebrate",
      expression: "confident",
      secondary_motion: "none" as const,
      end_pose: "dynamic_point" as const,
    };
    const introText = finalActionText(plan, 7, "intro");
    const outroText = finalActionText(plan, 7, "outro");

    expect(introText).toContain("maintain peak dynamic energy through the final frame before a hard cut into the quiz");
    expect(introText).not.toContain("remain still through the end");

    expect(outroText).toContain("settle by 7s and remain still through the end");
  });

  it("assembleChoreography assigns clip-specific closing action", () => {
    const rawBeats = [
      {
        action: "Fast run and slide",
        choreography: { primary_action: "slide", expression: "eager", secondary_motion: "none", end_pose: "playful_crouch" },
      },
      {
        action: "Catches energy ball",
        choreography: { primary_action: "reveal", expression: "surprised", secondary_motion: "none", end_pose: "hero_landing" },
      },
      {
        action: "Shouts let's quiz",
        choreography: { primary_action: "celebrate", expression: "confident", secondary_motion: "none", end_pose: "dynamic_point" },
      },
    ];

    const assembledIntro = assembleChoreography(rawBeats, 8, "intro");
    const assembledOutro = assembleChoreography(rawBeats, 8, "outro");

    expect(assembledIntro[2].action).toContain("hard cut into the quiz");
    expect(assembledOutro[2].action).toContain("remain still through the end");
  });

  it("validates intro with dynamic punch-in camera and peak energy closing action", () => {
    const content = productionContent();
    content.production.clip_kind = "intro";
    content.production_policy = "dynamic-micro-narrative-v2";
    content.production_directions!.end_hold_seconds = 1;
    content.timeline[0].action = "Mascot sprints into frame with a comedic shoe-skid stop";
    content.timeline[0].capability_ids = ["locomotion"];
    content.timeline[0].choreography = {
      primary_action: "slide",
      expression: "eager",
      secondary_motion: "natural_follow_through",
      end_pose: "playful_crouch",
    };
    content.timeline[1].action = "Energy spark pops into a burst of stars revealing the logo";
    content.timeline[1].choreography = {
      primary_action: "reveal",
      expression: "surprised",
      secondary_motion: "natural_follow_through",
      end_pose: "hero_landing",
    };
    content.timeline[2].choreography = {
      primary_action: "celebrate",
      expression: "confident",
      secondary_motion: "tail_wag",
      end_pose: "dynamic_point",
    };
    content.timeline[2].action = finalActionText(content.timeline[2].choreography, 7, "intro");
    content.camera = [
      { start_seconds: 0, end_seconds: 7, framing: "Medium", movement: "Dynamic push-in" },
      { start_seconds: 7, end_seconds: 8, framing: "Medium", movement: "Fast subtle punch-in" },
    ];

    const issues = validateChoreography(content, {
      ...identity,
      capabilities: { ...identity.capabilities, locomotion: "supported", waving: "supported", pointing: "supported" },
    });
    expect(issues).toEqual([]);
  });

  it("compiles specialized compact production prompt with clear separation of duties", () => {
    const contentIntro = productionContent();
    contentIntro.production.clip_kind = "intro";
    contentIntro.production_policy = "dynamic-micro-narrative-v2";

    const contentOutro = productionContent();
    contentOutro.production.clip_kind = "outro";
    contentOutro.production_policy = "dynamic-micro-narrative-v2";

    const baseRevision = {
      schema_version: 1 as const,
      revision_id: "r1",
      project_id: "p1",
      channel_id: "c1",
      style_preset_id: "s1",
      revision_number: 1,
      origin: "generated" as const,
      identity_snapshot: identity,
      seed_selection: { randomization_seed: "seed", selected_seed_ids: [], locked_dimensions: [], algorithm_version: "1" as const },
      seed_snapshot: [],
      references: [
        { role: "mascot_subject" as const, asset_id: "asset", url: "/asset.png", sha256: "a".repeat(64), mime_type: "image/png" as const },
      ],
      context_fingerprint: "a".repeat(64),
      template_version: "intro-outro-script-v8",
      requested_model: "test",
      effective_model: null,
      validation_issues: [],
      created_at: identity.created_at,
    };

    const introRevision = IntroOutroScriptRevisionSchema.parse({
      ...baseRevision,
      clip_kind: "intro",
      content: contentIntro,
    });
    const outroRevision = IntroOutroScriptRevisionSchema.parse({
      ...baseRevision,
      clip_kind: "outro",
      content: contentOutro,
    });

    const introPrompt = compileCompactProductionPrompt(introRevision);
    const outroPrompt = compileCompactProductionPrompt(outroRevision);

    expect(introPrompt).toContain("Maintain peak dynamic energy through the final frame before an immediate hard cut into the quiz");
    expect(introPrompt).not.toContain("Keep pose and camera stable for the last second");

    expect(outroPrompt).toContain("Finish with a warm farewell");
    expect(outroPrompt).not.toContain("end-screen cards");
  });

  it("builds distinct specialized prompts for intro and outro", () => {
    const mockContext = {
      channel: { display_name: "Quiz Champion", target_audience: "children" },
      style: { name: "Cartoon 3D" },
      logoReference: null,
    } as any;

    const mockInput = {
      context: mockContext,
      identity: {
        summary: "Energetic dragon",
        morphology: ["Bipedal"],
        features: [],
        capabilities: { locomotion: "supported", pointing: "supported", waving: "supported" },
        palette: ["#FF0000"],
        motion_constraints: [],
        style_description: "Fun 3D",
        allowed_accessories: [],
      },
      clips: [
        {
          clipKind: "intro" as const,
          durationSeconds: 8,
          logoMode: "none" as const,
          seeds: [],
        },
      ],
    } as any;

    const introPrompt = buildIntroGenerationPrompt(mockInput);
    expect(introPrompt).toContain("CREATIVE BRIEF");
    expect(introPrompt).toContain("three groups in the example are illustrative, not required");
    expect(introPrompt).toContain("Other rhythms are welcome");
    expect(introPrompt).toContain("hard-cutting into Question 1");

    const outroPrompt = buildOutroGenerationPrompt({
      ...mockInput,
      clips: [{ ...mockInput.clips[0], clipKind: "outro" }],
    });
    expect(outroPrompt).toContain("warm, playful farewell");
    expect(outroPrompt).toContain("Make subscribing the only call to action");
    expect(outroPrompt).toContain("Use the full frame for the performance");
    expect(outroPrompt).toContain("Do not reserve space, move the mascot aside");
    expect(outroPrompt).toContain("Retain the visual identity, not the old reserved-space layout");
    expect(outroPrompt).not.toContain("Leave useful negative space for YouTube End-Screen cards");
    expect(outroPrompt).toContain("final hold is optional");
  });

  it("exposes distinct beat structures with matching roles", () => {
    const introBeats = introBeatStructure(8);
    const outroBeats = outroBeatStructure(8);

    expect(introBeats.map((b) => b.role)).toEqual(["entrance", "brand_interaction", "handoff"]);
    expect(outroBeats.map((b) => b.role)).toEqual(["recognition", "invitation", "farewell"]);
  });

  it("supports action descriptions > 200 characters and truncates cleanly if > 500", () => {
    const longAction =
      "Novy rushes into frame chasing a glowing energy ball, then comically slides across the stage with an exaggerated shoe-skid stop and looks back with wide eyes at the glowing sparks floating playfully just out of reach.".repeat(
        2,
      ); // ~430 chars
    const extraLongAction = "Novy sprints with high energy across the playground stage. ".repeat(15); // ~885 chars

    const rawBeats = [
      {
        action: longAction,
        choreography: { primary_action: "slide", expression: "eager", secondary_motion: "none", end_pose: "playful_crouch" },
      },
      {
        action: extraLongAction,
        choreography: { primary_action: "reveal", expression: "surprised", secondary_motion: "none", end_pose: "hero_landing" },
      },
      {
        action: "Normal celebration",
        choreography: { primary_action: "celebrate", expression: "confident", secondary_motion: "none", end_pose: "dynamic_point" },
      },
    ];

    const assembled = assembleChoreography(rawBeats, 8, "intro");
    expect(assembled[0].action).toBe(longAction);
    expect((assembled[1].action as string).length).toBeLessThanOrEqual(500);
    expect((assembled[1].action as string).endsWith("...")).toBe(true);

    const testContent = productionContent();
    testContent.production_policy = "dynamic-micro-narrative-v2";
    testContent.timeline[0].action = longAction;
    testContent.timeline[0].choreography = {
      primary_action: "slide",
      expression: "eager",
      secondary_motion: "none",
      end_pose: "playful_crouch",
    };
    testContent.timeline[0].capability_ids = ["locomotion"];
    const issues = validateChoreography(testContent, identity);
    expect(issues.find((i) => i.path.includes("action") && i.message.includes("200"))).toBeUndefined();
  });

  it("normalizes and validates restrictions when LLM or fallback returns more than 3 restrictions", () => {
    const testContent = productionContent();
    testContent.production_policy = "dynamic-micro-narrative-v2";
    testContent.consistency.restrictions = [
      "Dorsal wing root mounting behind shoulders limits rearward arm rotation",
      "Rigid sneaker soles prevent extreme ankle roll",
      "Tail root restricts sitting posture",
      "No scary elements",
      "No random watermark text",
      "Preserve exact cream belly",
      "Extra restriction 7",
    ];

    const normalized = normalizeGeneratedContent(testContent, identity);
    expect(normalized.consistency.restrictions.length).toBeLessThanOrEqual(5);

    const issues = validateChoreography(normalized, identity);
    expect(issues.find((i) => i.path.includes("restrictions"))).toBeUndefined();
  });
});

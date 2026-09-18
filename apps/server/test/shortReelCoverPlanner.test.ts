import { describe, expect, it, vi } from "vitest";
import type { ShortReelRecord } from "@studio/shared";
import {
  buildReelCoverPlannerPrompt,
  createFallbackPersona,
  planReelCoverWithAI,
  type ReelCoverPersona,
} from "../src/shortReel/coverAiPlanner.js";
import { buildReelCoverPrompt } from "../src/shortReel/coverPrompt.js";
import { MASCOT_ARCHETYPES_CATALOG } from "../src/quiz/thumbnail/thumbnailArchetypes.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

function makeMockShortReel(): ShortReelRecord {
  return {
    schema_version: 2,
    reel_id: "reel-planner-test",
    channel_id: "channel-1",
    topic_id: "topic-1",
    topic: {
      topic_id: "topic-1",
      channel_id: "channel-1",
      title: "Deep Sea Giants Battle",
      premise: "Colossal squid versus sperm whale in the abyss",
      hook: "Who rules the midnight zone?",
      origin: "discovery",
    },
    aspect_ratio: "9:16",
    units: {
      references: {
        state: "ready",
        current_attempt: null,
        last_accepted_payload: {
          references: [
            { role: "mascot", path: "assets/mascot.png", checksum: "mascot-sha", byte_size: 1000 },
            { role: "style", path: "assets/style.png", checksum: "style-sha", byte_size: 2000 },
          ],
        },
      },
      script: {
        state: "ready",
        current_attempt: null,
        last_accepted_payload: null,
      },
      cover: {
        state: "missing",
        current_attempt: null,
        last_accepted_payload: null,
      },
      publishing: {
        state: "missing",
        current_attempt: null,
        last_accepted_payload: null,
      },
    },
    source: {
      bank_question_id: "bq-1",
      source_id: "src-1",
      origin_type: "curated",
      status: "applied",
      question_text: "Which creature has the largest eye in the animal kingdom?",
      selected_answer_text: "Colossal Squid",
      choices: [
        { id: "A", text: "Colossal Squid", is_correct: true },
        { id: "B", text: "Blue Whale", is_correct: false },
      ],
      difficulty: "medium",
      content_hash: "hash123",
      source_revision: 1,
      fingerprint: "fp123",
      confirmed_at: "2026-09-09T00:00:00.000Z",
      archetype_id: "deep_trivia",
    },
    script: {
      segments: [
        {
          index: 1,
          narrative: "3,000 meters down, pitch black waters hide an impossible titan.",
          cues: [],
          target_duration_sec: 8,
        },
        {
          index: 2,
          narrative: "Eyes the size of dinner plates peer through the abyss.",
          cues: [],
          target_duration_sec: 8,
        },
        {
          index: 3,
          narrative: "The colossal squid claims the throne!",
          cues: [],
          target_duration_sec: 8,
        },
      ],
    },
    visual_context: {
      mascot_name: "Finny the Fox",
      art_direction: "3D stylized Pixar cinematic underwater lighting",
      fingerprint: "vc-fp-1",
      mascot_checksum: "mascot-sha",
      mascot_asset_path: "assets/mascot.png",
    },
    publishing: null,
    revision: 1,
    created_at: "2026-09-09T00:00:00.000Z",
    updated_at: "2026-09-09T00:00:00.000Z",
    last_receipt: null,
  };
}

describe("ShortReel Cover AI Planner & Diversity Engine", () => {
  it("generates valid fallback persona without LLM using archetypes catalog", () => {
    const archetype = MASCOT_ARCHETYPES_CATALOG[0];
    const persona = createFallbackPersona(archetype, "Finny");

    expect(persona.archetypeId).toBe(archetype.id);
    expect(persona.archetypeName).toBe(archetype.name);
    expect(persona.expression).toBe(archetype.guideline);
    expect(persona.poseDescription).toContain("Finny");
  });

  it("selects diverse archetypes across repeated planReelCoverWithAI calls", async () => {
    const reel = makeMockShortReel();

    // Rng sequence picking archetype 0 then archetype 2
    let step = 0;
    const _deterministicRng = () => {
      step++;
      return step % 2 === 0 ? 0.99 : 0.01;
    };

    const personaA = await planReelCoverWithAI({
      record: reel,
      rng: () => 0.05,
    });
    const personaB = await planReelCoverWithAI({
      record: reel,
      rng: () => 0.95,
    });

    expect(personaA.archetypeName).toBeDefined();
    expect(personaB.archetypeName).toBeDefined();
    // Different rng seeds select different archetypes
    expect(personaA.archetypeId).not.toBe(personaB.archetypeId);
  });

  it("buildReelCoverPlannerPrompt incorporates topic, question, narrative, and archetypes with prompt defense", () => {
    const reel = makeMockShortReel();
    const archetypes = [MASCOT_ARCHETYPES_CATALOG[0], MASCOT_ARCHETYPES_CATALOG[1]];
    const prompt = buildReelCoverPlannerPrompt(reel, archetypes);

    expect(prompt).toContain("Deep Sea Giants Battle");
    expect(prompt).toContain("Which creature has the largest eye");
    expect(prompt).toContain("Finny the Fox");
    expect(prompt).toContain("3,000 meters down");
    expect(prompt).toContain(archetypes[0].name);
    expect(prompt).toContain(archetypes[1].name);
    expect(prompt).toContain("DO NOT reveal the correct answer");
    expect(prompt).toContain("9:16 portrait");
  });

  it("successfully plans creative variations with LLM client", async () => {
    const reel = makeMockShortReel();
    const mockLlm: LLMClient = {
      connect: vi.fn(async () => {}),
      generateContent: vi.fn(async () =>
        JSON.stringify({
          variations: [
            {
              id: 1,
              archetypeId: 1,
              archetypeName: "The Mind-Blown / Shocked Reactor",
              role: "Deep-Sea Explorer",
              costume: "high-tech glowing diving helmet",
              prop: "depth pressure gauge",
              expression: "jaw dropped in absolute awe at the massive silhouette",
              poseDescription: "staggering backward swimming posture with palms pressed against glass",
              dramaticHook: "Confronting a giant glowing eye in the deep trench",
            },
          ],
        }),
      ),
    };

    const persona = await planReelCoverWithAI({
      record: reel,
      llmClient: mockLlm,
      archetypesOverride: [MASCOT_ARCHETYPES_CATALOG[0]],
      rng: () => 0,
    });

    expect(mockLlm.generateContent).toHaveBeenCalledOnce();
    expect(persona.archetypeName).toBe("The Mind-Blown / Shocked Reactor");
    expect(persona.role).toBe("Deep-Sea Explorer");
    expect(persona.costume).toBe("high-tech glowing diving helmet");
    expect(persona.prop).toBe("depth pressure gauge");
    expect(persona.expression).toContain("jaw dropped");
    expect(persona.poseDescription).toContain("staggering backward");
    expect(persona.dramaticHook).toContain("Confronting a giant glowing eye");
  });

  it("gracefully falls back when LLM output is malformed or invalid JSON", async () => {
    const reel = makeMockShortReel();
    const brokenLlm: LLMClient = {
      connect: vi.fn(async () => {}),
      generateContent: vi.fn(async () => "This is not JSON at all! Error happened!"),
    };

    const persona = await planReelCoverWithAI({
      record: reel,
      llmClient: brokenLlm,
      archetypesOverride: [MASCOT_ARCHETYPES_CATALOG[2]], // The Dilemma / Conflicted Agonizer
      rng: () => 0,
    });

    expect(persona.archetypeId).toBe(MASCOT_ARCHETYPES_CATALOG[2].id);
    expect(persona.archetypeName).toBe(MASCOT_ARCHETYPES_CATALOG[2].name);
    expect(persona.expression).toBe(MASCOT_ARCHETYPES_CATALOG[2].guideline);
  });

  it("buildReelCoverPrompt injects persona details while preserving safety and style constraints", () => {
    const reel = makeMockShortReel();
    const persona: ReelCoverPersona = {
      archetypeId: 4,
      archetypeName: "The Cheeky Challenger / Secret Keeper",
      role: "Mischievous Ocean Riddler",
      costume: "submersible captain jacket",
      prop: "antique brass mystery compass",
      expression: "playful conspiratorial wink with a knowing grin",
      poseDescription: "leaning forward with one finger raised in challenge",
      dramaticHook: "Daring the viewer to guess the titan's identity",
    };

    const promptWithPersona = buildReelCoverPrompt(reel, { persona });

    expect(promptWithPersona).toContain("The Cheeky Challenger / Secret Keeper");
    expect(promptWithPersona).toContain("Mischievous Ocean Riddler");
    expect(promptWithPersona).toContain("playful conspiratorial wink");
    expect(promptWithPersona).toContain("leaning forward with one finger raised in challenge");
    expect(promptWithPersona).toContain("antique brass mystery compass");
    expect(promptWithPersona).toContain("submersible captain jacket");
    expect(promptWithPersona).toContain("Daring the viewer to guess the titan's identity");

    // Standard constraints must still hold
    expect(promptWithPersona).toContain("9:16 vertical portrait");
    expect(promptWithPersona).toContain("440px safe buffer");
    expect(promptWithPersona).toContain("DO NOT reveal");
    expect(promptWithPersona).toContain("Finny the Fox");
    expect(promptWithPersona).toContain("3D stylized Pixar cinematic underwater lighting");
  });

  it("produces two completely distinct prompts for two different archetypes", () => {
    const reel = makeMockShortReel();
    const personaShocked: ReelCoverPersona = {
      archetypeId: 1,
      archetypeName: "The Mind-Blown / Shocked Reactor",
      role: "Shocked Explorer",
      expression: "overwhelmed shock with dropped jaw",
      poseDescription: "clutching head in disbelief",
    };
    const personaInvestigator: ReelCoverPersona = {
      archetypeId: 2,
      archetypeName: "The Deep Investigator / Deduction Master",
      role: "Deduction Sleuth",
      expression: "narrowed observant analytical gaze",
      poseDescription: "crouching low inspecting tiny bioluminescent clues",
    };

    const promptA = buildReelCoverPrompt(reel, { persona: personaShocked });
    const promptB = buildReelCoverPrompt(reel, { persona: personaInvestigator });

    expect(promptA).not.toBe(promptB);
    expect(promptA).toContain("Shocked Reactor");
    expect(promptB).toContain("Deep Investigator");
    expect(promptA).toContain("clutching head in disbelief");
    expect(promptB).toContain("inspecting tiny bioluminescent clues");
  });
});

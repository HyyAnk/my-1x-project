import { describe, expect, it } from "vitest";
import type { BankTaxonomy } from "@studio/shared";
import { planTopicSuggestionMatrix, formatTopicMatrixPrompt } from "../src/context/topicMatrixPlanner.js";
import { ARCHETYPE_SLOT_DEFINITIONS } from "../src/context/topicMatrix.constants.js";
import { parseTopicCandidates } from "../src/tasks/parsers.js";

describe("topicSuggestionMatrix", () => {
  const mockTaxonomy: BankTaxonomy = {
    schema_version: 2,
    domains: [
      {
        id: "nature_animals",
        title: "Nature & Animals",
        description: "Wildlife and creatures",
        icon: "PawPrint",
        subtopics: [
          { id: "mammals", title: "Mammals", description: "" },
          { id: "birds", title: "Birds", description: "" },
        ],
      },
      {
        id: "careers_occupations",
        title: "Careers & Occupations",
        description: "Jobs, doctors, emergency services",
        icon: "Briefcase",
        subtopics: [{ id: "emergency_services", title: "Emergency", description: "" }],
      },
      {
        id: "space_earth",
        title: "Space & Earth",
        description: "Planets and stars",
        icon: "Compass",
        subtopics: [{ id: "solar_system", title: "Solar System", description: "" }],
      },
      {
        id: "food_gastronomy",
        title: "Food & Gastronomy",
        description: "Cuisine and cooking",
        icon: "Utensils",
        subtopics: [{ id: "desserts", title: "Desserts", description: "" }],
      },
      {
        id: "countries_nations",
        title: "Countries & Nations",
        description: "World geography and flags",
        icon: "Globe",
        subtopics: [{ id: "landmarks", title: "Landmarks", description: "" }],
      },
      {
        id: "human_body",
        title: "Human Body & Biology",
        description: "Anatomy and organs",
        icon: "Heart",
        subtopics: [{ id: "organs", title: "Organs", description: "" }],
      },
    ],
  };

  const mockIndex = {
    schema_version: 2 as const,
    target_total: 20000,
    current_total: 150,
    by_archetype: {},
    by_domain: {
      nature_animals: 50,
      space_earth: 30,
      food_gastronomy: 25,
      countries_nations: 20,
      careers_occupations: 15,
      human_body: 10,
    },
  };

  it("produces 4 Episode and 4 Short-Reel slots with randomized archetypes and independent domain rotation", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
    });

    expect(plan.slots).toHaveLength(8);

    const contentKinds = plan.slots.map((s) => s.contentKind);
    expect(contentKinds).toEqual([
      "episode",
      "episode",
      "episode",
      "episode",
      "short_reel",
      "short_reel",
      "short_reel",
      "short_reel",
    ]);

    // Episode slots (1-4) choose 4 distinct archetypes from the 7 episode pool
    const episodeArchetypes = plan.slots.slice(0, 4).map((s) => s.archetype);
    expect(new Set(episodeArchetypes).size).toBe(4);
    for (const a of episodeArchetypes) {
      expect([
        "deep_trivia",
        "mystery_reveal",
        "verdict_true_false",
        "visual_spotting",
        "visual_identification",
        "speed_blitz",
        "versus_faceoff",
      ]).toContain(a);
    }

    // Short-Reel slots (5-8) choose archetypes from the 3 short-reel pool and cover all 3
    const shortReelArchetypes = plan.slots.slice(4, 8).map((s) => s.archetype);
    expect(new Set(shortReelArchetypes).size).toBe(3);
    for (const a of shortReelArchetypes) {
      expect(["versus_faceoff", "deep_trivia", "verdict_true_false"]).toContain(a);
    }

    // Episode slots must have 4 distinct domains
    const episodeDomains = plan.slots.slice(0, 4).map((s) => s.domainId);
    expect(new Set(episodeDomains).size).toBe(4);

    // Short-Reel slots must have 4 distinct domains
    const shortReelDomains = plan.slots.slice(4, 8).map((s) => s.domainId);
    expect(new Set(shortReelDomains).size).toBe(4);

    // All slots must have valid non-empty domain_id and title
    for (const slot of plan.slots) {
      expect(slot.domainId).toBeTruthy();
      expect(slot.domainTitle).toBeTruthy();
      expect(slot.isKeySteered).toBe(false);
    }
  });

  it("supports fixed slot definitions when deterministic slots are requested", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      slotDefinitions: ARCHETYPE_SLOT_DEFINITIONS,
    });

    const archetypes = plan.slots.map((s) => s.archetype);
    expect(archetypes).toEqual([
      "deep_trivia",
      "mystery_reveal",
      "verdict_true_false",
      "visual_identification",
      "versus_faceoff",
      "deep_trivia",
      "verdict_true_false",
      "versus_faceoff",
    ]);
  });

  it("rotates domains randomly across distinct taxonomy domains in default unsteered mode", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
    });

    const episodeDomains = plan.slots.slice(0, 4).map((s) => s.domainId);
    const shortReelDomains = plan.slots.slice(4, 8).map((s) => s.domainId);
    expect(new Set(episodeDomains).size).toBe(4);
    expect(new Set(shortReelDomains).size).toBe(4);
    for (const d of [...episodeDomains, ...shortReelDomains]) {
      expect(typeof d).toBe("string");
      expect(d.length).toBeGreaterThan(0);
    }
  });

  it("applies keyword steering to slot 1 (Episode) and slot 5 (Short-Reel) while keeping other slots diverse", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      topicHint: "Emergency doctor jobs",
    });

    expect(plan.slots).toHaveLength(8);
    expect(plan.steeredKeyword).toBe("Emergency doctor jobs");

    // Slot 1 (Episode) & Slot 5 (Short-Reel) must be steered
    expect(plan.slots[0].isKeySteered).toBe(true);
    expect(plan.slots[4].isKeySteered).toBe(true);

    // Careers & Occupations matches "doctor jobs emergency"
    expect(plan.slots[0].domainId).toBe("careers_occupations");
    expect(plan.slots[4].domainId).toBe("careers_occupations");

    // Remaining slots must NOT be steered
    expect(plan.slots[1].isKeySteered).toBe(false);
    expect(plan.slots[2].isKeySteered).toBe(false);
    expect(plan.slots[3].isKeySteered).toBe(false);
    expect(plan.slots[5].isKeySteered).toBe(false);
    expect(plan.slots[6].isKeySteered).toBe(false);
    expect(plan.slots[7].isKeySteered).toBe(false);

    // Episode slots must have 4 distinct domains
    const episodeDomains = plan.slots.slice(0, 4).map((s) => s.domainId);
    expect(new Set(episodeDomains).size).toBe(4);

    // Short-Reel slots must have 4 distinct domains
    const shortReelDomains = plan.slots.slice(4, 8).map((s) => s.domainId);
    expect(new Set(shortReelDomains).size).toBe(4);
  });

  it("steers slots 1 and 5 to anime_manga when topicHint is 'Anime Legends'", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      topicHint: "Anime Legends",
    });

    expect(plan.slots).toHaveLength(8);
    expect(plan.steeredKeyword).toBe("Anime Legends");
    expect(plan.slots[0].isKeySteered).toBe(true);
    expect(plan.slots[4].isKeySteered).toBe(true);
    expect(plan.slots[0].domainId).toBe("anime_manga");
    expect(plan.slots[0].domainTitle).toBe("Anime & Manga Universe");
    expect(plan.slots[4].domainId).toBe("anime_manga");
    expect(plan.slots[4].domainTitle).toBe("Anime & Manga Universe");
  });

  it("formats prompt instructions with domain_id, blueprints, and keyword steering", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      topicHint: "Astronomy Planets",
      slotDefinitions: ARCHETYPE_SLOT_DEFINITIONS,
    });

    const { hintGuidance, blueprintGuidance, outputContract } = formatTopicMatrixPrompt(plan, "Astronomy Planets");

    // Verify hint guidance
    expect(hintGuidance).toContain("IMPORTANT TOPIC THEME REQUIREMENT");
    expect(hintGuidance).toContain("Astronomy Planets");
    expect(hintGuidance).toContain("Exactly 2 candidates MUST be directly inspired by");
    expect(hintGuidance).toContain("Slot 1 (Episode) is steered to domain");
    expect(hintGuidance).toContain("Slot 5 (Short-Reel) is steered to domain");
    expect(hintGuidance).toContain("The remaining candidates should be diverse");

    // Verify blueprint guidance
    expect(blueprintGuidance).toContain("GAMEPLAY ARCHETYPE BLUEPRINTS FOR DIVERSITY");
    expect(blueprintGuidance).toContain("domain_id:");
    expect(blueprintGuidance).toContain("Slot 1 (Episode - Deep Trivia");
    expect(blueprintGuidance).toContain("Slot 2 (Episode - Silhouette / Mystery Reveal");
    expect(blueprintGuidance).toContain("Slot 3 (Episode - True or False");
    expect(blueprintGuidance).toContain("Slot 4 (Episode - Visual Identification");
    expect(blueprintGuidance).toContain("Slot 5 (Short-Reel - Versus Face-off");
    expect(blueprintGuidance).toContain("Slot 6 (Short-Reel - Deep Trivia");
    expect(blueprintGuidance).toContain("Slot 7 (Short-Reel - True or False");
    expect(blueprintGuidance).toContain("Slot 8 (Short-Reel - Versus Clash");

    // Verify output contract
    expect(outputContract).toContain("domain_id");
    expect(outputContract).toContain("Return exactly 8 JSON candidates");
  });

  it("parses domain_id and subtopic_id from topic candidates JSON", () => {
    const assignedPlan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      topicHint: "Medical Careers",
      slotDefinitions: ARCHETYPE_SLOT_DEFINITIONS,
    });

    const mockOutput = JSON.stringify({
      candidates: [
        {
          topic_id: "topic-1",
          content_kind: "episode",
          title: "Doctor Heroes",
          premise: "Everyday medical heroes",
          why_it_fits: "Engaging and educational",
          hook: "Can you name this life-saving tool?",
          estimated_potential: "High",
          quiz_format: "multiple_choice",
          archetype: "deep_trivia",
          suggested_layout: "media_left_choices_right",
          domain_id: assignedPlan.slots[0].domainId,
          subtopic_id: "emergency_services",
          theme_hint: "Medical Careers",
        },
        {
          topic_id: "topic-2",
          content_kind: "episode",
          title: "Shadow Stethoscope",
          premise: "Guess the tool from silhouette",
          why_it_fits: "Visual deduction",
          hook: "What object is casting this shadow?",
          estimated_potential: "Very High",
          quiz_format: "image_guess",
          archetype: "mystery_reveal",
          suggested_layout: "mystery_reveal",
          domain_id: assignedPlan.slots[1].domainId,
          subtopic_id: "emergency_services",
        },
        {
          topic_id: "topic-3",
          content_kind: "episode",
          title: "Planet Myths",
          premise: "True or false about Mars",
          why_it_fits: "Fast paced",
          hook: "Is Mars really red due to rust?",
          estimated_potential: "High",
          quiz_format: "true_false",
          archetype: "verdict_true_false",
          suggested_layout: "verdict_true_false",
          domain_id: assignedPlan.slots[2].domainId,
          subtopic_id: "solar_system",
        },
        {
          topic_id: "topic-4",
          content_kind: "episode",
          title: "Emergency Rush",
          premise: "Rapid fire emergency questions",
          why_it_fits: "Fast paced reflex test",
          hook: "Can you think fast under pressure?",
          estimated_potential: "High",
          quiz_format: "multiple_choice",
          archetype: "visual_identification",
          suggested_layout: "visual_choices_three",
          domain_id: assignedPlan.slots[3].domainId,
          subtopic_id: "emergency_services",
        },
        {
          topic_id: "topic-5",
          content_kind: "short_reel",
          title: "Chef's Secret",
          premise: "Guess the pastry from ingredients",
          why_it_fits: "Tasty puzzle",
          hook: "Flour, butter, sugar... what treat is this?",
          estimated_potential: "Medium",
          quiz_format: "multiple_choice",
          archetype: "versus_faceoff",
          suggested_layout: "split_versus_two",
          domain_id: assignedPlan.slots[4].domainId,
          subtopic_id: "desserts",
        },
        {
          topic_id: "topic-6",
          content_kind: "short_reel",
          title: "Tiger vs Lion",
          premise: "Apex predator showdown",
          why_it_fits: "Action packed",
          hook: "Who reigns supreme in strength?",
          estimated_potential: "Viral",
          quiz_format: "multiple_choice",
          archetype: "deep_trivia",
          suggested_layout: "media_left_choices_right",
          domain_id: assignedPlan.slots[5].domainId,
          subtopic_id: "mammals",
        },
        {
          topic_id: "topic-7",
          content_kind: "short_reel",
          title: "Myth or Fact: Lightning",
          premise: "Does lightning strike twice?",
          why_it_fits: "Common misconception",
          hook: "Is this classic storm belief true or false?",
          estimated_potential: "Viral",
          quiz_format: "true_false",
          archetype: "verdict_true_false",
          suggested_layout: "verdict_true_false",
          domain_id: assignedPlan.slots[6].domainId,
          subtopic_id: "solar_system",
        },
        {
          topic_id: "topic-8",
          content_kind: "short_reel",
          title: "Eagle vs Hawk",
          premise: "Sky raptor face-off",
          why_it_fits: "High velocity aerial duel",
          hook: "Which raptor has superior dive speed?",
          estimated_potential: "Viral",
          quiz_format: "multiple_choice",
          archetype: "versus_faceoff",
          suggested_layout: "split_versus_two",
          domain_id: assignedPlan.slots[7].domainId,
          subtopic_id: "landmarks",
        },
      ],
    });
    const parsed = parseTopicCandidates(mockOutput, "ch_test_123", assignedPlan);

    expect(parsed).toHaveLength(8);
    expect(parsed[0].domain_id).toBe(assignedPlan.slots[0].domainId);
    expect(parsed[0].subtopic_id).toBe("emergency_services");
    expect(parsed[0].archetype).toBe("deep_trivia");
    expect(parsed[0].suggested_layout).toBe("media_left_choices_right");
    expect(parsed[0].theme_hint).toBe("Medical Careers");

    expect(parsed[1].domain_id).toBe(assignedPlan.slots[1].domainId);
    expect(parsed[1].subtopic_id).toBe("emergency_services");
    expect(parsed[1].archetype).toBe("mystery_reveal");
    expect(parsed[1].suggested_layout).toBe("mystery_reveal");

    expect(parsed[2].domain_id).toBe(assignedPlan.slots[2].domainId);
    expect(parsed[2].archetype).toBe("verdict_true_false");
    expect(parsed[2].suggested_layout).toBe("verdict_true_false");

    expect(parsed[3].content_kind).toBe("episode");
    expect(parsed[3].domain_id).toBe(assignedPlan.slots[3].domainId);
    expect(parsed[3].archetype).toBe("visual_identification");
    expect(parsed[3].suggested_layout).toBe("visual_choices_three");

    expect(parsed[4].content_kind).toBe("short_reel");
    expect(parsed[4].domain_id).toBe(assignedPlan.slots[4].domainId);
    expect(parsed[4].archetype).toBe("versus_faceoff");
    expect(parsed[4].question_count).toBe(1);
    expect(parsed[4].aspect_ratio).toBe("9:16");

    expect(parsed[5].content_kind).toBe("short_reel");
    expect(parsed[5].domain_id).toBe(assignedPlan.slots[5].domainId);
    expect(parsed[5].archetype).toBe("deep_trivia");
    expect(parsed[5].question_count).toBe(1);
    expect(parsed[5].aspect_ratio).toBe("9:16");

    expect(parsed[6].content_kind).toBe("short_reel");
    expect(parsed[6].domain_id).toBe(assignedPlan.slots[6].domainId);
    expect(parsed[6].archetype).toBe("verdict_true_false");
    expect(parsed[6].question_count).toBe(1);
    expect(parsed[6].aspect_ratio).toBe("9:16");

    expect(parsed[7].content_kind).toBe("short_reel");
    expect(parsed[7].domain_id).toBe(assignedPlan.slots[7].domainId);
    expect(parsed[7].archetype).toBe("versus_faceoff");
    expect(parsed[7].question_count).toBe(1);
    expect(parsed[7].aspect_ratio).toBe("9:16");
  });

  it("ignores legacy portrait Episode matrix requests and preserves the 4:4 content matrix", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      aspectRatio: "9:16",
    });

    expect(plan.aspectRatio).toBe("16:9");
    expect(plan.slots).toHaveLength(8);

    expect(plan.slots.slice(0, 4).every((slot) => slot.contentKind === "episode")).toBe(true);
    expect(plan.slots.slice(0, 4).every((slot) => !slot.suggestedLayout.startsWith("portrait_"))).toBe(true);
    expect(plan.slots.slice(4).every((slot) => slot.contentKind === "short_reel")).toBe(true);
  });

  it("formats landscape Episode guidance and vertical Short-Reel guidance for legacy ratio input", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      topicHint: "Emergency doctor jobs",
      aspectRatio: "9:16",
      slotDefinitions: ARCHETYPE_SLOT_DEFINITIONS,
    });

    const { blueprintGuidance, outputContract } = formatTopicMatrixPrompt(plan, "Emergency doctor jobs", "9:16");

    expect(blueprintGuidance).toContain("Slot 1 (Episode - Deep Trivia");
    expect(blueprintGuidance).toContain('suggested_layout: "media_left_choices_right"');
    expect(blueprintGuidance).toContain("Slot 2 (Episode - Silhouette / Mystery Reveal");
    expect(blueprintGuidance).toContain("Slot 3 (Episode - True or False");
    expect(blueprintGuidance).toContain('suggested_layout: "verdict_true_false"');
    expect(blueprintGuidance).toContain("Slot 4 (Episode - Visual Identification");
    expect(blueprintGuidance).toContain("Slot 5 (Short-Reel - Versus Face-off");
    expect(blueprintGuidance).toContain("Slot 6 (Short-Reel - Deep Trivia");
    expect(blueprintGuidance).toContain("Slot 7 (Short-Reel - True or False");
    expect(blueprintGuidance).toContain("Slot 8 (Short-Reel - Versus Clash");

    expect(blueprintGuidance).not.toContain("portrait_");

    // Verify output contract
    expect(outputContract).toContain("Slots 1-4 are Episode concepts");
    expect(outputContract).toContain("Slots 5-8 are Short-Reel concepts");

    expect(outputContract).not.toContain("portrait_");
  });

  it("infers the canonical mixed matrix from the normalized plan", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      aspectRatio: "9:16",
    });

    const { blueprintGuidance, outputContract } = formatTopicMatrixPrompt(plan);

    expect(blueprintGuidance).toContain("Slot 1 (Episode");
    expect(blueprintGuidance).toContain("Slot 5 (Short-Reel");
    expect(blueprintGuidance).not.toContain("portrait_");
    expect(outputContract).toContain("Slots 1-4 are Episode concepts");
    expect(outputContract).toContain("Slots 5-8 are Short-Reel concepts");
  });
});

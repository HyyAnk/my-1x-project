import { describe, expect, it } from "vitest";
import type { BankTaxonomy } from "@studio/shared";
import { planTopicSuggestionMatrix, formatTopicMatrixPrompt } from "../src/context/topicMatrixPlanner.js";
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

  it("produces 3 Episode and 2 Short-Reel slots across 5 distinct domains", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
    });

    expect(plan.slots).toHaveLength(5);

    const contentKinds = plan.slots.map((s) => s.contentKind);
    expect(contentKinds).toEqual(["episode", "episode", "episode", "short_reel", "short_reel"]);

    const archetypes = plan.slots.map((s) => s.archetype);
    expect(archetypes).toEqual(["deep_trivia", "mystery_reveal", "verdict_true_false", "versus_faceoff", "deep_trivia"]);

    const layouts = plan.slots.map((s) => s.suggestedLayout);
    expect(layouts).toEqual([
      "media_left_choices_right",
      "mystery_reveal",
      "verdict_true_false",
      "split_versus_two",
      "media_left_choices_right",
    ]);

    const domainIds = plan.slots.map((s) => s.domainId);
    const uniqueDomains = new Set(domainIds);
    expect(uniqueDomains.size).toBe(5);

    // All slots must have valid non-empty domain_id and title
    for (const slot of plan.slots) {
      expect(slot.domainId).toBeTruthy();
      expect(slot.domainTitle).toBeTruthy();
      expect(slot.isKeySteered).toBe(false);
    }
  });

  it("prioritizes domains with higher question/entity counts in default unsteered mode", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
    });

    // nature_animals has 50 questions, space_earth has 30 questions
    expect(plan.slots[0].domainId).toBe("nature_animals");
    expect(plan.slots[1].domainId).toBe("space_earth");
  });

  it("applies keyword steering to slot 1 (Episode) and slot 4 (Short-Reel) while keeping slots 2, 3, 5 diverse", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      topicHint: "Emergency doctor jobs",
    });

    expect(plan.slots).toHaveLength(5);
    expect(plan.steeredKeyword).toBe("Emergency doctor jobs");

    // Slot 1 (Episode) & Slot 4 (Short-Reel) must be steered
    expect(plan.slots[0].isKeySteered).toBe(true);
    expect(plan.slots[3].isKeySteered).toBe(true);

    // Careers & Occupations matches "doctor jobs emergency"
    expect(plan.slots[0].domainId).toBe("careers_occupations");

    // Slots 2, 3, 5 must NOT be steered and must be from 3 different domains
    expect(plan.slots[1].isKeySteered).toBe(false);
    expect(plan.slots[2].isKeySteered).toBe(false);
    expect(plan.slots[4].isKeySteered).toBe(false);

    const domainIds = plan.slots.map((s) => s.domainId);
    const uniqueDomains = new Set(domainIds);
    expect(uniqueDomains.size).toBe(5);
  });

  it("formats prompt instructions with domain_id, blueprints, and keyword steering", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      topicHint: "Astronomy Planets",
    });

    const { hintGuidance, blueprintGuidance, outputContract } = formatTopicMatrixPrompt(plan, "Astronomy Planets");

    // Verify hint guidance
    expect(hintGuidance).toContain("IMPORTANT TOPIC THEME REQUIREMENT");
    expect(hintGuidance).toContain("Astronomy Planets");
    expect(hintGuidance).toContain("Exactly 2 candidates MUST be directly inspired by");
    expect(hintGuidance).toContain("Slot 1 (Episode) is steered to domain");
    expect(hintGuidance).toContain("Slot 4 (Short-Reel) is steered to domain");
    expect(hintGuidance).toContain("The remaining 3 candidates should be diverse");

    // Verify blueprint guidance
    expect(blueprintGuidance).toContain("GAMEPLAY ARCHETYPE BLUEPRINTS FOR DIVERSITY");
    expect(blueprintGuidance).toContain("domain_id:");
    expect(blueprintGuidance).toContain("Slot 1 (Episode - Deep Trivia)");
    expect(blueprintGuidance).toContain("Slot 2 (Episode - Mystery Reveal)");
    expect(blueprintGuidance).toContain("Slot 3 (Episode - True or False)");
    expect(blueprintGuidance).toContain("Slot 4 (Short-Reel - Versus Face-off)");
    expect(blueprintGuidance).toContain("Slot 5 (Short-Reel - Deep Trivia)");

    // Verify output contract
    expect(outputContract).toContain("domain_id");
    expect(outputContract).toContain("Return exactly 5 JSON candidates");
  });

  it("parses domain_id and subtopic_id from topic candidates JSON", () => {
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
          domain_id: "careers_occupations",
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
          domain_id: "nature_animals",
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
          domain_id: "space_earth",
          subtopic_id: "solar_system",
        },
        {
          topic_id: "topic-4",
          content_kind: "short_reel",
          title: "Chef's Secret",
          premise: "Guess the pastry from ingredients",
          why_it_fits: "Tasty puzzle",
          hook: "Flour, butter, sugar... what treat is this?",
          estimated_potential: "Medium",
          quiz_format: "multiple_choice",
          archetype: "versus_faceoff",
          suggested_layout: "split_versus_two",
          domain_id: "vehicles_technology",
          subtopic_id: "desserts",
        },
        {
          topic_id: "topic-5",
          content_kind: "short_reel",
          title: "Tiger vs Lion",
          premise: "Apex predator showdown",
          why_it_fits: "Action packed",
          hook: "Who reigns supreme in strength?",
          estimated_potential: "Viral",
          quiz_format: "multiple_choice",
          archetype: "deep_trivia",
          suggested_layout: "media_left_choices_right",
          domain_id: "food_gastronomy",
          subtopic_id: "mammals",
        },
      ],
    });

    const assignedPlan = planTopicSuggestionMatrix({ taxonomy: mockTaxonomy, index: mockIndex, topicHint: "Medical Careers" });
    const parsed = parseTopicCandidates(mockOutput, "ch_test_123", assignedPlan);

    expect(parsed).toHaveLength(5);
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

    expect(parsed[3].content_kind).toBe("short_reel");
    expect(parsed[3].domain_id).toBe(assignedPlan.slots[3].domainId);
    expect(parsed[3].archetype).toBe("versus_faceoff");
    expect(parsed[3].question_count).toBe(1);
    expect(parsed[3].aspect_ratio).toBe("9:16");

    expect(parsed[4].content_kind).toBe("short_reel");
    expect(parsed[4].domain_id).toBe(assignedPlan.slots[4].domainId);
    expect(parsed[4].archetype).toBe("deep_trivia");
    expect(parsed[4].question_count).toBe(1);
    expect(parsed[4].aspect_ratio).toBe("9:16");
  });

  it("ignores legacy portrait Episode matrix requests and preserves the 3:2 content matrix", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      aspectRatio: "9:16",
    });

    expect(plan.aspectRatio).toBe("16:9");
    expect(plan.slots).toHaveLength(5);

    expect(plan.slots.slice(0, 3).every((slot) => slot.contentKind === "episode")).toBe(true);
    expect(plan.slots.slice(0, 3).every((slot) => !slot.suggestedLayout.startsWith("portrait_"))).toBe(true);
    expect(plan.slots.slice(3).every((slot) => slot.contentKind === "short_reel")).toBe(true);
  });

  it("formats landscape Episode guidance and vertical Short-Reel guidance for legacy ratio input", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      topicHint: "Emergency doctor jobs",
      aspectRatio: "9:16",
    });

    const { blueprintGuidance, outputContract } = formatTopicMatrixPrompt(plan, "Emergency doctor jobs", "9:16");

    expect(blueprintGuidance).toContain("Slot 1 (Episode - Deep Trivia):");
    expect(blueprintGuidance).toContain('suggested_layout: "media_left_choices_right"');
    expect(blueprintGuidance).toContain("Slot 2 (Episode - Mystery Reveal):");
    expect(blueprintGuidance).toContain("Slot 3 (Episode - True or False):");
    expect(blueprintGuidance).toContain('suggested_layout: "verdict_true_false"');
    expect(blueprintGuidance).toContain("Slot 4 (Short-Reel - Versus Face-off):");
    expect(blueprintGuidance).toContain("Slot 5 (Short-Reel - Deep Trivia):");

    expect(blueprintGuidance).not.toContain("portrait_");

    // Verify output contract
    expect(outputContract).toContain("Slots 1-3 are Episode concepts");
    expect(outputContract).toContain("Slots 4-5 are Short-Reel concepts");

    expect(outputContract).not.toContain("portrait_");
  });

  it("infers the canonical mixed matrix from the normalized plan", () => {
    const plan = planTopicSuggestionMatrix({
      taxonomy: mockTaxonomy,
      index: mockIndex,
      aspectRatio: "9:16",
    });

    const { blueprintGuidance, outputContract } = formatTopicMatrixPrompt(plan);

    expect(blueprintGuidance).toContain('suggested_layout: "media_left_choices_right"');
    expect(blueprintGuidance).not.toContain("portrait_");
    expect(outputContract).toContain("Slots 1-3 are Episode concepts");
    expect(outputContract).toContain("Slots 4-5 are Short-Reel concepts");
  });
});

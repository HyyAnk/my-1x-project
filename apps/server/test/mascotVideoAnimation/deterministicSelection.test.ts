import { describe, expect, it } from "vitest";
import {
  QuizV2Schema,
  computeSelectionSeed,
  selectAnimationVariant,
  type ChannelMascotConfig,
  type MascotAnimationAssetV1,
  type MascotProfile,
  type MascotStateVariant,
} from "@studio/shared";
import { createDefaultDirectorPlan } from "../../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../../src/quiz/timeline/compileTimeline.js";
import { buildCandyArcadeCompositionBundle } from "../../src/quiz/render/candyArcadeComposition.js";
import { HyperframesRenderer } from "../../src/quiz/render/hyperframesRenderer.js";
import {
  adaptMascotForQuestion,
  createMascotAnimationRenderSnapshot,
  findSnapshotEntry,
} from "../../src/quiz/render/productionMascotRenderer.js";

function createMockAnimationAsset(state: "thinking" | "celebrate", slotIndex: number, revision = 1): MascotAnimationAssetV1 {
  return {
    version: 1,
    state,
    atlas_url: `/mascot/assets/owl/${state}_slot_${slotIndex}_r${revision}/atlas.png`,
    manifest_url: `/mascot/assets/owl/${state}_slot_${slotIndex}_r${revision}/manifest.json`,
    frame_count: 12,
    fps: 8,
    loop: state === "thinking",
    loop_policy: state === "thinking" ? "loop" : "one_shot_rest",
    frames: Array.from({ length: 12 }, (_, i) => ({
      index: i,
      x: (i % 4) * 128,
      y: Math.floor(i / 4) * 128,
      width: 128,
      height: 128,
      duration_ms: 125,
    })),
    registration: {
      source_width: 512,
      source_height: 384,
      content_bounds: { x: 10, y: 10, width: 108, height: 108 },
      pivot: { x: 64, y: 128 },
      offset_x: 0,
      offset_y: 0,
    },
    content_fingerprint: `content-${state}-slot-${slotIndex}-rev-${revision}`,
    source_fingerprint: `source-${state}-slot-${slotIndex}-rev-${revision}`,
    slot_index: slotIndex,
    recipe_id: `${state}-recipe-${slotIndex}`,
  };
}

function createTenSlotMascot(options: { thinkingCount?: number; celebrateCount?: number } = {}): MascotProfile {
  const thinkingCount = options.thinkingCount ?? 10;
  const celebrateCount = options.celebrateCount ?? 10;

  const thinkingVariants: MascotStateVariant[] = Array.from({ length: thinkingCount }, (_, i) => {
    const slotIndex = i + 1;
    return {
      id: `owl-thinking-${slotIndex}`,
      slot_index: slotIndex,
      image_url: `/mascot/assets/owl/thinking_${slotIndex}.png`,
      status: "ready",
      generation_revision: 1,
      animation: createMockAnimationAsset("thinking", slotIndex, 1),
    };
  });

  const celebrateVariants: MascotStateVariant[] = Array.from({ length: celebrateCount }, (_, i) => {
    const slotIndex = i + 1;
    return {
      id: `owl-celebrate-${slotIndex}`,
      slot_index: slotIndex,
      image_url: `/mascot/assets/owl/celebrate_${slotIndex}.png`,
      status: "ready",
      generation_revision: 1,
      animation: createMockAnimationAsset("celebrate", slotIndex, 1),
    };
  });

  return {
    id: "owl-ten-slots",
    name: "Professor Owl",
    description: "Multi-slot animated scholar owl",
    visual_style: "pixar_3d",
    master_prompt: "Scholarly owl",
    master_image_url: "/mascot/assets/owl/master.png",
    color_theme: "#4f46e5",
    assigned_channel_ids: [],
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    actions: {},
    styles: [
      {
        id: "style-academic",
        name: "Academic Core",
        keyword: "scholarly",
        anchor_image_url: "/mascot/assets/owl/anchor.png",
        is_default: true,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
        states: {
          thinking: thinkingVariants,
          celebrate: celebrateVariants,
        },
      },
    ],
  };
}

function createFiveQuestionQuiz(episodeId = "ep-science-101") {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "q-astro-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "What is the closest planet to the Sun?",
        choices: [
          { id: "c1", text: "Mercury" },
          { id: "c2", text: "Venus" },
          { id: "c3", text: "Mars" },
        ],
        correct_choice_id: "c1",
        explanation: "Mercury orbits closest to the Sun.",
        fun_fact: "",
        source_ids: ["S1"],
        visual_opportunity: "Solar system",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-astro-02",
        number: 2,
        format: "multiple_choice",
        difficulty: 1,
        question: "Which planet is known as the Red Planet?",
        choices: [
          { id: "c1", text: "Mars" },
          { id: "c2", text: "Jupiter" },
          { id: "c3", text: "Saturn" },
        ],
        correct_choice_id: "c1",
        explanation: "Iron oxide gives Mars its reddish hue.",
        fun_fact: "",
        source_ids: ["S2"],
        visual_opportunity: "Mars surface",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-astro-03",
        number: 3,
        format: "multiple_choice",
        difficulty: 1,
        question: "What is the largest planet in our solar system?",
        choices: [
          { id: "c1", text: "Jupiter" },
          { id: "c2", text: "Neptune" },
          { id: "c3", text: "Uranus" },
        ],
        correct_choice_id: "c1",
        explanation: "Jupiter is over twice as massive as all other planets combined.",
        fun_fact: "",
        source_ids: ["S3"],
        visual_opportunity: "Jupiter storm",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-astro-04",
        number: 4,
        format: "multiple_choice",
        difficulty: 1,
        question: "Which planet has prominent rings?",
        choices: [
          { id: "c1", text: "Saturn" },
          { id: "c2", text: "Earth" },
          { id: "c3", text: "Venus" },
        ],
        correct_choice_id: "c1",
        explanation: "Saturn features stunning rings of ice and rock.",
        fun_fact: "",
        source_ids: ["S4"],
        visual_opportunity: "Saturn rings",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-astro-05",
        number: 5,
        format: "multiple_choice",
        difficulty: 1,
        question: "What star sits at the center of our solar system?",
        choices: [
          { id: "c1", text: "The Sun" },
          { id: "c2", text: "Polaris" },
          { id: "c3", text: "Sirius" },
        ],
        correct_choice_id: "c1",
        explanation: "The Sun holds 99.8% of the system's mass.",
        fun_fact: "",
        source_ids: ["S5"],
        visual_opportunity: "Sun flare",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

const channelConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_left",
  scale: 1.5,
  offset_x: 20,
  offset_y: 40,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

describe("Deterministic Variant Selection & Resume/Rerender Parity (Stage 15)", () => {
  it("computes deterministic selection seed and variant without unseeded randomness", () => {
    const mascot = createTenSlotMascot();
    const style = mascot.styles[0];

    const input = {
      videoId: "ep-science-101",
      questionId: "q-astro-01",
      state: "thinking" as const,
      styleId: style.id,
      readyVariants: style.states.thinking,
    };

    const res1 = selectAnimationVariant(input);
    const res2 = selectAnimationVariant(input);

    expect(res1.slot_index).toBe(res2.slot_index);
    expect(res1.seed).toBe(res2.seed);
    expect(res1.candidate_index).toBe(res2.candidate_index);
    expect(res1.revision).toBe(res2.revision);
    expect(res1.variant.animation?.atlas_url).toBe(res2.variant.animation?.atlas_url);

    // Verify seed is derived from FNV-1a hash
    const expectedSeed = computeSelectionSeed("ep-science-101", "q-astro-01", "thinking", style.id);
    expect(res1.seed).toBe(expectedSeed);
  });

  it("prevents immediate consecutive repeats when multiple ready variants are available", () => {
    const mascot = createTenSlotMascot();
    const style = mascot.styles[0];

    // Force selection with previousSlotIndex matching initial candidate
    const initialSeed = computeSelectionSeed("video-x", "q-dup", "thinking", style.id);
    const initialIndex = Math.abs(initialSeed) % style.states.thinking.length;
    const initialCandidateSlot = style.states.thinking[initialIndex].slot_index;

    // Without previousSlotIndex, candidate matches initialIndex
    const selectionWithoutPrev = selectAnimationVariant({
      videoId: "video-x",
      questionId: "q-dup",
      state: "thinking",
      styleId: style.id,
      readyVariants: style.states.thinking,
    });
    expect(selectionWithoutPrev.slot_index).toBe(initialCandidateSlot);

    // With previousSlotIndex matching candidate, selector must advance 1 slot
    const selectionWithPrev = selectAnimationVariant({
      videoId: "video-x",
      questionId: "q-dup",
      state: "thinking",
      styleId: style.id,
      readyVariants: style.states.thinking,
      previousSlotIndex: initialCandidateSlot,
    });

    expect(selectionWithPrev.slot_index).not.toBe(initialCandidateSlot);
    const expectedAdvancedIndex = (initialIndex + 1) % style.states.thinking.length;
    expect(selectionWithPrev.slot_index).toBe(style.states.thinking[expectedAdvancedIndex].slot_index);
  });

  it("records revision, candidate index, seed, and fingerprints in render snapshot", () => {
    const mascot = createTenSlotMascot();
    const snapshot = createMascotAnimationRenderSnapshot("ep-science-101");

    adaptMascotForQuestion(mascot, "style-academic", 0, {
      videoId: "ep-science-101",
      questionId: "q-astro-01",
      snapshot,
    });

    expect(snapshot.entries.length).toBe(2); // Thinking + Celebrate

    const thinkingEntry = findSnapshotEntry(snapshot, {
      videoId: "ep-science-101",
      questionId: "q-astro-01",
      state: "thinking",
      styleId: "style-academic",
    });
    expect(thinkingEntry).toBeDefined();
    expect(thinkingEntry!.slot_index).toBeGreaterThanOrEqual(1);
    expect(thinkingEntry!.slot_index).toBeLessThanOrEqual(10);
    expect(thinkingEntry!.revision).toBe(1);
    expect(thinkingEntry!.atlas_url).toContain("thinking_slot_");
    expect(thinkingEntry!.fingerprint).toContain("content-thinking-slot-");

    const celebrateEntry = findSnapshotEntry(snapshot, {
      videoId: "ep-science-101",
      questionId: "q-astro-01",
      state: "celebrate",
      styleId: "style-academic",
    });
    expect(celebrateEntry).toBeDefined();
    expect(celebrateEntry!.slot_index).toBeGreaterThanOrEqual(1);
    expect(celebrateEntry!.slot_index).toBeLessThanOrEqual(10);
    expect(celebrateEntry!.revision).toBe(1);
    expect(celebrateEntry!.atlas_url).toContain("celebrate_slot_");
    expect(celebrateEntry!.fingerprint).toContain("content-celebrate-slot-");
  });

  it("guarantees rerender equality across composition bundles using the snapshot", () => {
    const quiz = createFiveQuestionQuiz("ep-science-101");
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan });
    const mascot = createTenSlotMascot();

    // First render build: generates snapshot
    const bundle1 = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./audio/narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot,
      mascotConfig: channelConfig,
    });

    const snapshot = bundle1.mascotAnimationSnapshot;
    expect(snapshot).toBeDefined();
    expect(snapshot!.entries.length).toBe(10); // 5 questions * 2 states (thinking + celebrate)

    // Second render build: passes existing snapshot (re-render / resume)
    const bundle2 = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./audio/narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot,
      mascotConfig: channelConfig,
      mascotAnimationSnapshot: snapshot,
    });

    // Verify main HTML equality
    expect(bundle1.html).toBe(bundle2.html);

    // Verify all subcompositions are bit-for-bit identical
    const files1 = bundle1.files ?? {};
    const files2 = bundle2.files ?? {};
    expect(Object.keys(files1).sort()).toEqual(Object.keys(files2).sort());

    for (const key of Object.keys(files1)) {
      expect(files1[key]).toBe(files2[key]);
    }

    // Verify no consecutive questions repeated the exact same thinking or celebrate slot
    for (let q = 1; q <= 4; q++) {
      const qCurrentThinking = findSnapshotEntry(snapshot, {
        videoId: "ep-science-101",
        questionId: `q-astro-0${q}`,
        state: "thinking",
        styleId: "style-academic",
      })!;
      const qNextThinking = findSnapshotEntry(snapshot, {
        videoId: "ep-science-101",
        questionId: `q-astro-0${q + 1}`,
        state: "thinking",
        styleId: "style-academic",
      })!;
      expect(qCurrentThinking.slot_index).not.toBe(qNextThinking.slot_index);

      const qCurrentCelebrate = findSnapshotEntry(snapshot, {
        videoId: "ep-science-101",
        questionId: `q-astro-0${q}`,
        state: "celebrate",
        styleId: "style-academic",
      })!;
      const qNextCelebrate = findSnapshotEntry(snapshot, {
        videoId: "ep-science-101",
        questionId: `q-astro-0${q + 1}`,
        state: "celebrate",
        styleId: "style-academic",
      })!;
      expect(qCurrentCelebrate.slot_index).not.toBe(qNextCelebrate.slot_index);
    }
  });

  it("pins selections on resume even when mascot profile publishes new slots", () => {
    const quiz = createFiveQuestionQuiz("ep-science-pinned");
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan });

    // Initial mascot had only 3 thinking and 3 celebrate slots
    const originalMascot = createTenSlotMascot({ thinkingCount: 3, celebrateCount: 3 });

    const bundleOriginal = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./audio/narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: originalMascot,
      mascotConfig: channelConfig,
    });

    const snapshot = bundleOriginal.mascotAnimationSnapshot!;
    expect(snapshot).toBeDefined();

    // Later: mascot is updated to 10 slots (slots 4..10 published)
    const expandedMascot = createTenSlotMascot({ thinkingCount: 10, celebrateCount: 10 });

    // Resume render: using original snapshot with expanded mascot
    const bundleResumed = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./audio/narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: expandedMascot,
      mascotConfig: channelConfig,
      mascotAnimationSnapshot: snapshot,
    });

    // Resumed render must strictly retain the original selected slots (all <= 3)
    const filesOriginal = bundleOriginal.files ?? {};
    const filesResumed = bundleResumed.files ?? {};

    for (const key of Object.keys(filesOriginal)) {
      expect(filesResumed[key]).toBe(filesOriginal[key]);
    }

    // Verify all slots in the resumed snapshot are still within the original 3 slots
    for (let q = 1; q <= 5; q++) {
      const entry = findSnapshotEntry(snapshot, {
        videoId: "ep-science-pinned",
        questionId: `q-astro-0${q}`,
        state: "thinking",
        styleId: "style-academic",
      })!;
      expect(entry.slot_index).toBeLessThanOrEqual(3);
    }
  });

  it("integrates seamlessly through HyperframesRenderer with snapshot round-trip", async () => {
    const quiz = createFiveQuestionQuiz("ep-hyperframes-test");
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan });
    const mascot = createTenSlotMascot();

    const renderer = new HyperframesRenderer();

    // First preparation
    const prepared1 = await renderer.prepare({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./audio/narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot,
      mascotConfig: channelConfig,
    });

    expect(prepared1.mascotAnimationSnapshot).toBeDefined();
    expect(prepared1.mascotAnimationSnapshot!.entries.length).toBe(10);

    // Second preparation with snapshot
    const prepared2 = await renderer.prepare({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./audio/narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot,
      mascotConfig: channelConfig,
      mascotAnimationSnapshot: prepared1.mascotAnimationSnapshot,
    });

    expect(prepared1.html).toBe(prepared2.html);
    expect(prepared1.durationSeconds).toBe(prepared2.durationSeconds);
    expect(prepared1.questionCount).toBe(prepared2.questionCount);
    expect(prepared1.compositionFiles).toEqual(prepared2.compositionFiles);
  });
});

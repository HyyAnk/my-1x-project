import { describe, expect, it } from "vitest";
import { QuizV2Schema, type QuizV2 } from "@studio/shared";
import { extractBridgeShowcaseItems } from "../src/quiz/assets/bridgeTopicEntityExtractor.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";

const e2eQuiz: QuizV2 = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "ep-prehistoric-showcase-e2e",
  age_band: "7-9",
  language: "English",
  topic: {
    title: "Prehistoric Predators & Giants",
  },
  questions: [
    {
      id: "q-1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which predator had the strongest recorded bite force?",
      choices: [
        { id: "c-1", text: "Tyrannosaurus Rex" },
        { id: "c-2", text: "Spinosaurus" },
        { id: "c-3", text: "Velociraptor" },
      ],
      correct_choice_id: "c-1",
      explanation: "Tyrannosaurus Rex possessed a bone-crushing bite.",
      fun_fact: "T-Rex teeth were up to 30 centimeters long.",
      source_ids: ["S01"],
      visual_opportunity: "Tyrannosaurus Rex Skull",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q-2",
      number: 2,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which dinosaur was equipped with three massive protective horns?",
      choices: [
        { id: "c-1", text: "Triceratops" },
        { id: "c-2", text: "Stegosaurus" },
        { id: "c-3", text: "Ankylosaurus" },
      ],
      correct_choice_id: "c-1",
      explanation: "Triceratops used its three horns for defense.",
      fun_fact: "Its skull was over two meters long.",
      source_ids: ["S02"],
      visual_opportunity: "Triceratops Shield",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q-3",
      number: 3,
      format: "multiple_choice",
      difficulty: 2,
      question: "Which gigantic marine predator ruled the prehistoric oceans?",
      choices: [
        { id: "c-1", text: "Megalodon" },
        { id: "c-2", text: "Mosasaurus" },
        { id: "c-3", text: "Plesiosaur" },
      ],
      correct_choice_id: "c-1",
      explanation: "Megalodon was the largest shark that ever lived.",
      fun_fact: "Its jaws could easily swallow two adults standing.",
      source_ids: ["S03"],
      visual_opportunity: "Megalodon Giant Tooth",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q-4",
      number: 4,
      format: "multiple_choice",
      difficulty: 2,
      question: "Which colossal predator possessed a giant neural sail on its back?",
      choices: [
        { id: "c-1", text: "Spinosaurus" },
        { id: "c-2", text: "Carnotaurus" },
        { id: "c-3", text: "Allosaurus" },
      ],
      correct_choice_id: "c-1",
      explanation: "Spinosaurus was an agile swimmer with a signature dorsal sail.",
      fun_fact: "It was longer than a Tyrannosaurus Rex.",
      source_ids: ["S04"],
      visual_opportunity: "Spinosaurus Dorsal Sail",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Phase 8: End-to-End Integration & Regression QA", () => {
  const styleContext = {
    imageStyle: "mixed" as const,
    thinkingBarStyle: "auto" as const,
    questionBoxStyle: "auto" as const,
    answerCardStyle: "auto" as const,
    counterStyle: "auto" as const,
    backgroundStyle: "auto" as const,
    paletteId: "auto" as const,
    topicWheelEnabled: false,
    musicStyle: "upbeat" as const,
    thumbnailRatio: "16:9" as const,
  };

  it("executes the entire End-to-End Topic Bridge showcase upgrade workflow seamlessly", async () => {
    // 1. EXTRACT 4 SHOWCASE ITEMS
    const showcaseItems = extractBridgeShowcaseItems(e2eQuiz);
    expect(showcaseItems).toHaveLength(4);
    expect(showcaseItems.every((it) => it.subject.length > 0)).toBe(true);
    expect(showcaseItems.every((it) => it.asset_id.startsWith("asset-bridge-item-"))).toBe(true);

    // 2. PLAN QUIZ ASSETS (including Bridge Showcase items)
    const director = createDefaultDirectorPlan(e2eQuiz);
    const bridgeConfig = {
      enabled: true,
      enableTopicScene: true,
      enableCtaScene: true,
      showcaseItems,
    };

    const assetPlan = planQuizAssets(e2eQuiz, director, "pixar_3d", {
      includeBridgeShowcase: true,
      bridgeConfig,
    });

    const bridgeAssets = assetPlan.assets.filter((a) => a.purpose === "bridge_topic_item");
    expect(bridgeAssets).toHaveLength(4);
    expect(bridgeAssets.map((a) => a.asset_id)).toEqual([
      "asset-bridge-item-1",
      "asset-bridge-item-2",
      "asset-bridge-item-3",
      "asset-bridge-item-4",
    ]);

    // 3. COMPILE PROMPTS (verifying framing rules and cache version)
    for (const bridgeAsset of bridgeAssets) {
      const promptResult = compileQuizAssetPrompt(bridgeAsset);
      expect(promptResult.cacheVersion).toContain("-v1-bridge-showcase");
      expect(promptResult.prompt).toContain("Bridge topic showcase item");
      if (bridgeAsset.transparent_background) {
        expect(promptResult.prompt).toContain("isolated centered subject on a pure solid white studio backdrop");
        expect(promptResult.prompt).toContain("Bridge showcase sticker contract");
      } else {
        expect(promptResult.prompt).toContain("Bridge showcase card vignette contract");
      }
    }

    // 4. TIMELINE COMPILATION (verifying staggered pop audio SFX)
    const voicePlan = buildQuizVoicePlan(e2eQuiz, {
      director,
      includeBridgeSegments: true,
      skipIntro: true,
      skipOutro: true,
      topicNarration: "Welcome to the ultimate prehistoric showdown!",
      ctaNarration: "Subscribe now for daily prehistoric adventures!",
    });

    const audioDurations = {
      intro_topic: 4.0,
      intro_cta: 3.0,
      "q-1:question": 3.0,
      "q-1:reveal": 2.0,
      "q-1:explanation": 2.5,
      "q-2:question": 3.0,
      "q-2:reveal": 2.0,
      "q-2:explanation": 2.5,
      "q-3:question": 3.0,
      "q-3:reveal": 2.0,
      "q-3:explanation": 2.5,
      "q-4:question": 3.0,
      "q-4:reveal": 2.0,
      "q-4:explanation": 2.5,
    };

    const timeline = compileQuizTimeline({
      quiz: e2eQuiz,
      director,
      voicePlan,
      introDuration: 6.0,
      audioDurations,
      channelName: "DinoMaster",
      topic: "Prehistoric Predators & Giants",
      bridgeConfig,
    });

    // Verify bridge.topic.enter event
    const topicEnter = timeline.events.find((e) => e.type === "bridge.topic.enter");
    expect(topicEnter).toBeDefined();
    expect(topicEnter!.payload.showcaseItems).toHaveLength(4);

    // Verify 4 staggered ui_pop SFX events at +0.30s, +0.42s, +0.54s, +0.66s
    const topicSfxEvents = timeline.events.filter(
      (e) => e.type === "sfx.play" && e.segment_id === "intro_topic",
    );
    expect(topicSfxEvents).toHaveLength(6); // whoosh + 4 pops + sparkle
    expect(topicSfxEvents[0].payload.sound).toBe("transition_fast");

    const expectedPops = [6.30, 6.42, 6.54, 6.66];
    for (let i = 0; i < 4; i++) {
      const popEvent = topicSfxEvents[i + 1];
      expect(popEvent.payload.sound).toBe("ui_pop");
      expect(popEvent.at_seconds).toBe(expectedPops[i]);
      expect(popEvent.payload.volume).toBe(0.7);
      expect(popEvent.payload.name).toBe(`showcase_item_pop_${i + 1}`);
    }

    // 5. ASSEMBLE CANDY ARCADE COMPOSITION BUNDLE
    const mockAssets: Record<string, string> = {
      "asset-bridge-item-1": "./assets/showcase/dino_1.png",
      "asset-bridge-item-2": "./assets/showcase/dino_2.png",
      "asset-bridge-item-3": "./assets/showcase/dino_3.png",
      "asset-bridge-item-4": "./assets/showcase/dino_4.png",
    };

    const bundle = buildCandyArcadeCompositionBundle({
      quiz: e2eQuiz,
      director,
      timeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      introVideoPath: "./intro.mp4",
      assets: mockAssets,
    });

    const topicFile = Object.entries(bundle.files).find(([name]) => name.includes("candy-bridge-topic"))?.[1];
    expect(topicFile).toBeDefined();

    // Items render as unified framed photo cards, so no inline SVG sticker filter is emitted
    expect(topicFile).not.toContain('id="bridge-sticker-filter"');
    expect(topicFile).not.toContain("feMorphology");
    expect(topicFile).not.toContain("bridge-svg-filters");

    // Layout classes
    expect(topicFile).toContain("bridge-topic-scene has-showcase");
    expect(topicFile).toContain("bridge-topic-card has-showcase");

    // Showcase row & 4 items
    expect(topicFile).toContain('class="bridge-showcase-row" data-count="4"');
    expect(topicFile).toContain('class="bridge-showcase-item item-1" data-asset-id="asset-bridge-item-1"');
    expect(topicFile).toContain('class="bridge-showcase-item item-2" data-asset-id="asset-bridge-item-2"');
    expect(topicFile).toContain('class="bridge-showcase-item item-3" data-asset-id="asset-bridge-item-3"');
    expect(topicFile).toContain('class="bridge-showcase-item item-4" data-asset-id="asset-bridge-item-4"');
    expect(topicFile).not.toContain("is-sticker");
    expect(topicFile).not.toContain("is-photo-card");

    // Image URLs properly resolved (rootRelativeSubCompositionAssets normalizes ./ to root-relative)
    expect(topicFile).toContain('src="assets/showcase/dino_1.png"');
    expect(topicFile).toContain('src="assets/showcase/dino_2.png"');
    expect(topicFile).toContain('src="assets/showcase/dino_3.png"');
    expect(topicFile).toContain('src="assets/showcase/dino_4.png"');
  });

  it("preserves 100% backward compatibility when showcase items are disabled or omitted", () => {
    // 1. Asset planning with options omitted
    const director = createDefaultDirectorPlan(e2eQuiz);
    const legacyPlan = planQuizAssets(e2eQuiz, director, "pixar_3d");
    const bridgeAssets = legacyPlan.assets.filter((a) => a.purpose === "bridge_topic_item");
    expect(bridgeAssets).toHaveLength(0);

    // 2. Timeline without showcase items
    const voicePlan = buildQuizVoicePlan(e2eQuiz, {
      director,
      includeBridgeSegments: true,
      skipIntro: true,
      skipOutro: true,
    });

    const timeline = compileQuizTimeline({
      quiz: e2eQuiz,
      director,
      voicePlan,
      introDuration: 5.0,
      audioDurations: {
        intro_topic: 3.0,
        intro_cta: 2.5,
        "q-1:question": 2.5,
        "q-1:reveal": 1.5,
        "q-1:explanation": 2.0,
        "q-2:question": 2.5,
        "q-2:reveal": 1.5,
        "q-2:explanation": 2.0,
        "q-3:question": 2.5,
        "q-3:reveal": 1.5,
        "q-3:explanation": 2.0,
        "q-4:question": 2.5,
        "q-4:reveal": 1.5,
        "q-4:explanation": 2.0,
      },
      bridgeConfig: {
        enabled: true,
        enableTopicScene: true,
        enableCtaScene: true,
        enableShowcase: false,
      },
    });

    // Exactly 3 SFX events: whoosh, single counter pop, sparkle
    const topicSfxEvents = timeline.events.filter(
      (e) => e.type === "sfx.play" && e.segment_id === "intro_topic",
    );
    expect(topicSfxEvents).toHaveLength(3);
    expect(topicSfxEvents[1].payload.name).toBe("count_sticker_bounce");

    // 3. CandyArcade bundle without showcase items
    const bundle = buildCandyArcadeCompositionBundle({
      quiz: e2eQuiz,
      director,
      timeline,
      styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      introVideoPath: "./intro.mp4",
    });

    const topicFile = Object.entries(bundle.files).find(([name]) => name.includes("candy-bridge-topic"))?.[1];
    expect(topicFile).toBeDefined();
    expect(topicFile).not.toContain("bridge-showcase-row");
    expect(topicFile).not.toContain("has-showcase");
    expect(topicFile).toContain('class="bridge-topic-card"');
  });
});

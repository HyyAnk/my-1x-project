import { describe, it, expect } from "vitest";
import { bridgeTopicClip, cleanTopicForDisplay } from "../src/quiz/render/candyArcade/bridgeTopicClip.js";
import { candyArcadeBridgeTopicStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeBridgeTopicStyles.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";

describe("Stage 5: CandyArcade Bridge Scene 1 (Topic Teaser)", () => {
  describe("cleanTopicForDisplay", () => {
    it("strips subtitle following a colon cleanly", () => {
      expect(cleanTopicForDisplay("Anime Detective & Spy Mystery: Can You Spot the Truth?")).toBe("Anime Detective & Spy Mystery");
      expect(cleanTopicForDisplay("World Geography: Ultimate Country Trivia!")).toBe("World Geography");
      expect(cleanTopicForDisplay("Science Lab：Chemistry Basics")).toBe("Science Lab");
    });

    it("strips subtitle following a hyphen separator", () => {
      expect(cleanTopicForDisplay("Dinosaur Giants - Triassic to Cretaceous")).toBe("Dinosaur Giants");
    });

    it("preserves titles without colon or subtitle", () => {
      expect(cleanTopicForDisplay("World Capitals & Wonders")).toBe("World Capitals & Wonders");
      expect(cleanTopicForDisplay("Space Explorers")).toBe("Space Explorers");
    });
  });

  describe("bridgeTopicClip", () => {
    it("renders valid HTML markup with topic, question count, and timestamps", () => {
      const html = bridgeTopicClip({
        start: 4.25,
        duration: 3.5,
        topic: "World Capitals & Wonders",
        questionCount: 10,
      });

      expect(html).toContain('class="clip candy-scene bridge-topic-scene"');
      expect(html).toContain('data-start="4.250"');
      expect(html).toContain('data-duration="3.500"');
      expect(html).toContain("World Capitals &amp; Wonders");
      expect(html).toContain("10 QUESTIONS");
      expect(html).not.toContain("TODAY&#39;S CHALLENGE");
      expect(html).not.toContain("Can you get them all right?");
      expect(html).toContain("bridge-ambient-orb");
      expect(html).toContain("bridge-ambient-drift-icons");
      expect(html).toContain("bridge-drift-icon");
      expect(html).not.toContain("bridge-topic-rays");
      expect(html).toContain("bridge-kinetic-monogram");
      expect(html).toContain("bridge-monogram-column");
      expect(html).toContain("bridge-star-tl");
      expect(html).toContain("bridge-star-br");
    });

    it("handles singular question count cleanly", () => {
      const html = bridgeTopicClip({
        start: 0,
        duration: 2.0,
        topic: "Quick Warmup",
        questionCount: 1,
      });

      expect(html).toContain("1 QUESTION");
      expect(html).not.toContain("1 QUESTIONS");
    });

    it("customizes badge text and prompt text when provided", () => {
      const html = bridgeTopicClip({
        start: 1.0,
        duration: 2.5,
        topic: "Super Cars",
        questionCount: 5,
        badgeText: "SPECIAL ROUND",
        promptText: "Buckle up and test your knowledge!",
      });

      expect(html).toContain("SPECIAL ROUND");
      expect(html).toContain("Buckle up and test your knowledge!");
    });

    it("renders smoothly in 9:16 vertical aspect ratio with sparkles and sticker pill", () => {
      const html = bridgeTopicClip({
        start: 0.5,
        duration: 3.0,
        topic: "Space Explorers",
        questionCount: 7,
        aspectRatio: "9:16",
        badgeText: "KIDS QUIZ",
      });

      expect(html).toContain("Space Explorers");
      expect(html).toContain("7 QUESTIONS");
      expect(html).toContain("KIDS QUIZ");
      expect(html).toContain("bridge-floating-sparkles");
      expect(html).toContain("bridge-count-pill");
    });

    it("cleanly strips colon and subtitle from topic title for punchy display", () => {
      const html = bridgeTopicClip({
        start: 0,
        duration: 3.0,
        topic: "Anime Detective & Spy Mystery: Can You Spot the Truth?",
        questionCount: 3,
      });

      expect(html).toContain("Anime Detective &amp; Spy Mystery");
      expect(html).not.toContain("Can You Spot the Truth");
    });

    it("renders kinetic monogram wallpaper with channel name and quiz accents", () => {
      const html = bridgeTopicClip({
        start: 0,
        duration: 3.0,
        topic: "Science Lab",
        questionCount: 5,
        channelName: "AstroQuiz",
      });

      expect(html).toContain("bridge-kinetic-monogram");
      expect(html).toContain("bridge-monogram-track");
      expect(html).toContain("bridge-monogram-group");
      expect(html).toContain("AstroQuiz");
      expect(html).toContain("monogram-initial-badge");
      expect(html).toContain("bridge-spotlight-halo");
      expect(html).toContain("bridge-topic-shockwave sw-1");
      expect(html).toContain("bridge-topic-shockwave sw-2");
      expect(html).toContain("bridge-vignette-overlay");
    });

    it("renders custom channel logo image in monogram when available", () => {
      const html = bridgeTopicClip({
        start: 0,
        duration: 3.0,
        topic: "World History",
        questionCount: 8,
        channelName: "Chronos",
        hasCustomLogo: true,
        logoUrl: "assets/brand/chronos-logo.png",
      });

      expect(html).toContain('class="monogram-logo-img"');
      expect(html).toContain("background-image:url('assets/brand/chronos-logo.png')");
    });

    it("guarantees zero-based --clip-start:0s regardless of non-zero start time", () => {
      const html = bridgeTopicClip({
        start: 8.0,
        duration: 8.58,
        topic: "Sensory System",
        questionCount: 3,
      });

      expect(html).toContain('data-start="8.000"');
      expect(html).toContain('data-duration="8.580"');
      expect(html).toContain('style="--clip-start:0s;"');
      expect(html).not.toContain("--clip-start:8.000s");
    });

    it("renders 4 showcase items with stickers, photo-cards, and SVG sticker filter", () => {
      const html = bridgeTopicClip({
        start: 0,
        duration: 3.5,
        topic: "Prehistoric Predators",
        questionCount: 4,
        showcaseItems: [
          {
            asset_id: "predator-1",
            subject: "T-Rex Skull",
            presentation: "die_cut_sticker",
            rotation_deg: -2,
            transparent_background: true,
          },
          {
            asset_id: "predator-2",
            subject: "Velociraptor Claw",
            presentation: "die_cut_sticker",
            rotation_deg: 3,
            transparent_background: true,
          },
          {
            asset_id: "predator-3",
            subject: "Megalodon Tooth",
            presentation: "photo_card",
            rotation_deg: -1,
            transparent_background: false,
            caption: "Fossilized",
          },
          {
            asset_id: "predator-4",
            subject: "Spinosaurus Sail",
            presentation: "die_cut_sticker",
            rotation_deg: 2,
            transparent_background: true,
          },
        ],
        assets: {
          "predator-1": "./assets/showcase/trex.png",
          "predator-2": "./assets/showcase/raptor.png",
          "predator-3": "./assets/showcase/megalodon.png",
          "predator-4": "./assets/showcase/spino.png",
        },
      });

      // No sticker SVG filter — all items are unified photo card blocks
      expect(html).not.toContain('id="bridge-sticker-filter"');
      expect(html).not.toContain("feMorphology");
      expect(html).not.toContain("bridge-svg-filters");

      // Scene layout classes
      expect(html).toContain('class="clip candy-scene bridge-topic-scene has-showcase"');
      expect(html).toContain('class="bridge-topic-card has-showcase"');

      // Showcase row container
      expect(html).toContain('class="bridge-showcase-row" data-count="4"');

      // All items use the unified class — no is-sticker / is-photo-card / rotation style
      expect(html).toContain('class="bridge-showcase-item item-1" data-asset-id="predator-1"');
      expect(html).toContain('class="bridge-showcase-item item-2" data-asset-id="predator-2"');
      expect(html).toContain('class="bridge-showcase-item item-3" data-asset-id="predator-3"');
      expect(html).toContain('class="bridge-showcase-item item-4" data-asset-id="predator-4"');
      expect(html).not.toContain("is-sticker");
      expect(html).not.toContain("is-photo-card");
      expect(html).not.toContain("rotate(-2deg)");
      expect(html).not.toContain("rotate(3deg)");

      // Image URLs resolved correctly
      expect(html).toContain('src="./assets/showcase/trex.png"');
      expect(html).toContain('src="./assets/showcase/raptor.png"');
      expect(html).toContain('src="./assets/showcase/megalodon.png"');
      expect(html).toContain('src="./assets/showcase/spino.png"');

      // Caption still works
      expect(html).toContain('<span class="bridge-item-caption">Fossilized</span>');
    });

    it("renders placeholder when asset path cannot be resolved", () => {
      const html = bridgeTopicClip({
        start: 0,
        duration: 3.0,
        topic: "Mystery Animals",
        questionCount: 3,
        showcaseItems: [
          {
            asset_id: "missing-1",
            subject: "Unknown Creature",
            presentation: "die_cut_sticker",
            rotation_deg: 0,
            transparent_background: true,
          },
        ],
      });

      expect(html).toContain('class="bridge-item-placeholder" aria-label="Unknown Creature"');
      expect(html).toContain("Unknown Creature</span>");
    });

    it("gracefully falls back when showcaseItems is not provided", () => {
      const html = bridgeTopicClip({
        start: 0,
        duration: 3.0,
        topic: "General Knowledge",
        questionCount: 5,
      });

      expect(html).not.toContain("bridge-showcase-row");
      expect(html).not.toContain("has-showcase");
      expect(html).toContain('class="bridge-topic-card"');
    });
  });

  describe("candyArcadeBridgeTopicStylesCss", () => {
    it("generates CSS with required selectors and animations", () => {
      const css = candyArcadeBridgeTopicStylesCss();

      expect(css).toContain(".bridge-topic-scene");
      expect(css).toContain(".bridge-topic-card");
      expect(css).toContain(".bridge-topic-title");
      expect(css).toContain(".bridge-count-pill");
      expect(css).toContain(".bridge-ambient-drift-icons");
      expect(css).toContain(".bridge-kinetic-monogram");
      expect(css).toContain(".bridge-spotlight-halo");
      expect(css).toContain(".bridge-topic-shockwave");
      expect(css).toContain("@keyframes bridge-card-pop");
      expect(css).toContain("@keyframes bridge-pill-pulse");
      expect(css).toContain("@keyframes bridge-monogram-drift-up");
      expect(css).toContain("@keyframes bridge-shockwave-burst");
      expect(css).toContain("@keyframes bridge-spotlight-breathe");
      expect(css).toContain("@keyframes bridge-icon-drift-loop-1");
      expect(css).toContain("@media (max-aspect-ratio: 1/1)");
    });

    it("is properly integrated into full candyArcadeCss output", () => {
      const fullCss = candyArcadeCss({ aspectRatio: "16:9" });

      expect(fullCss).toContain(".bridge-topic-scene");
      expect(fullCss).toContain("bridge-card-pop");
      expect(fullCss).toContain("star-wobble");
      expect(fullCss).toContain("bridge-monogram-drift-up");
    });
  });
});

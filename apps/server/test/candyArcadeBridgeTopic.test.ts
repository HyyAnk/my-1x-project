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
      expect(html).toContain('src="assets/brand/chronos-logo.png"');
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

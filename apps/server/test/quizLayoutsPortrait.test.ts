import { describe, expect, it } from "vitest";
import { QUIZ_LAYOUT_CATALOG, type QuizLayoutSlots, type QuizV2 } from "@studio/shared";
import {
  getQuizLayoutRenderer,
  QUIZ_LAYOUT_REGISTRY,
  QUIZ_LAYOUT_RENDERERS,
  renderQuizLayoutBody,
} from "../src/quiz/render/layouts/registry.js";
import { portraitHeroChoicesLayout } from "../src/quiz/render/layouts/portrait/portraitHeroChoices.js";
import { portraitSplitVersusLayout } from "../src/quiz/render/layouts/portrait/portraitSplitVersus.js";
import { portraitVerdictTfLayout } from "../src/quiz/render/layouts/portrait/portraitVerdictTf.js";
import { portraitStackListLayout } from "../src/quiz/render/layouts/portrait/portraitStackList.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { channelBrandMarkCss } from "../src/quiz/render/candyArcade/channelBrandMarkStyles.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";

describe("Portrait Hero Choices Layout (portrait_hero_choices)", () => {
  const mockSlots: QuizLayoutSlots = {
    questionBoxHtml: '<header class="question-title"><div class="question-card-inner"><h1>Which planet has the most moons?</h1></div></header>',
    heroHtml: '<figure class="image-card hero-image"><img src="saturn.png" alt="Saturn"><span class="image-shine"></span></figure>',
    choicesHtml: '<div class="choice-group choice-group-text answer-grid answer-count-3"><div class="choice-card">Jupiter</div><div class="choice-card">Saturn</div><div class="choice-card">Uranus</div></div>',
    phaseHtml: '<div class="thinking-bar"><div class="thinking-track"></div></div><div class="fact-card"><p>Saturn has 146 confirmed moons!</p></div>',
  };

  describe("Layout Capability & Registration", () => {
    it("is registered in QUIZ_LAYOUT_CATALOG with 9:16 portrait specifications", () => {
      const capability = QUIZ_LAYOUT_CATALOG.portrait_hero_choices;
      expect(capability).toBeDefined();
      expect(capability.id).toBe("portrait_hero_choices");
      expect(capability.supportedAspectRatios).toEqual(["9:16"]);
      expect(capability.supportedChoiceCounts).toEqual([2, 3]);
      expect(capability.metrics.render).toEqual({
        width: 860,
        height: 500,
        itemCount: 1,
      });
      expect(capability.media.required).toContain("question");
      expect(capability.media.supported).toContain("question");
    });

    it("is registered in layout renderers and registry export", () => {
      expect(QUIZ_LAYOUT_RENDERERS.portrait_hero_choices).toBe(portraitHeroChoicesLayout);
      expect(QUIZ_LAYOUT_REGISTRY.portrait_hero_choices).toBe(portraitHeroChoicesLayout);
      expect(getQuizLayoutRenderer("portrait_hero_choices")).toBe(portraitHeroChoicesLayout);
      expect(portraitHeroChoicesLayout.id).toBe("portrait_hero_choices");
    });
  });

  describe("Body & Slot Rendering", () => {
    it("renders expected HTML structure with question box, hero image, choices, and embedded phase region", () => {
      const rendered = renderQuizLayoutBody("portrait_hero_choices", mockSlots);

      expect(rendered).toContain("question-title");
      expect(rendered).toContain("Which planet has the most moons?");
      expect(rendered).toContain("hero-image");
      expect(rendered).toContain("saturn.png");
      expect(rendered).toContain("choice-group");
      expect(rendered).toContain("phase-region");
      expect(rendered).toContain("portrait-phase-embedded");
      expect(rendered).toContain("thinking-bar");
      expect(rendered).toContain("Saturn has 146 confirmed moons!");

      // Verify sequence: Question Box -> Hero Image -> Answer Choices -> Embedded Phase Region
      const questionIndex = rendered.indexOf("question-title");
      const heroIndex = rendered.indexOf("hero-image");
      const choicesIndex = rendered.indexOf("choice-group");
      const phaseIndex = rendered.indexOf("phase-region");

      expect(questionIndex).toBeGreaterThanOrEqual(0);
      expect(heroIndex).toBeGreaterThan(questionIndex);
      expect(choicesIndex).toBeGreaterThan(heroIndex);
      expect(phaseIndex).toBeGreaterThan(choicesIndex);
    });
  });

  describe("9:16 Safe-Zone & Candy Arcade CSS Rules", () => {
    const css = portraitHeroChoicesLayout.css("9:16");

    it("contains question box styling centered with max-width 800px", () => {
      expect(css).toContain(".layout-portrait_hero_choices .question-title");
      expect(css).toMatch(/max-width:\s*800px/);
      expect(css).toMatch(/margin:\s*0 auto/);
    });

    it("contains prominent hero image styling with 800px width, 450px height (exact 16:9), rounded-3xl border, and glowing candy arcade shadows", () => {
      expect(css).toContain(".layout-portrait_hero_choices .game-stage > .hero-image");
      expect(css).toMatch(/width:\s*800px/);
      expect(css).toMatch(/height:\s*450px/);
      expect(css).toMatch(/border-radius:\s*28px/);
      expect(css).toMatch(/border:\s*8px solid/);
      expect(css).toContain("box-shadow:");
      expect(css).toContain("rgba(255, 215, 0, 0.24)");
    });

    it("enforces at least 140px safe-zone clearance on both sides via 800px centered column", () => {
      expect(css).toContain(".layout-portrait_hero_choices .answer-grid");
      expect(css).toMatch(/max-width:\s*800px/);
      expect(css).toMatch(/margin:\s*0 auto/);
      // Stage is 800px centered on 1080px canvas -> (1080 - 800) / 2 = 140px clearance on left and right
      expect(css).toContain("margin: 196px auto 0");
    });

    it("embeds phase region directly below choices and does not pin it to absolute screen bottom", () => {
      expect(css).toContain(".layout-portrait_hero_choices .phase-region");
      expect(css).toContain("position: relative");
      expect(css).toContain("bottom: auto");

      // Verifies thinking bar calibrated to 660px ensuring marker star tip stops at x = 940px
      expect(css).toContain(".layout-portrait_hero_choices .phase-region > .thinking-bar");
      expect(css).toMatch(/width:\s*min\(660px,\s*100%\)/);
      expect(css).toContain(".layout-portrait_hero_choices .phase-region > .fact-card");
    });

    it("guarantees staggered entrance animations for choice cards in Phase 2", () => {
      expect(css).toContain(".layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(1)");
      expect(css).toContain(".layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(2)");
      expect(css).toContain(".layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(3)");
      expect(css).toContain("choice-card-enter");
      expect(css).toContain("@keyframes choice-card-enter");
    });

    it("integrates seamlessly into global candyArcadeCss output for 9:16 aspect ratio", () => {
      const fullCss = candyArcadeCss({ fontMode: "production", aspectRatio: "9:16" });
      expect(fullCss).toContain(".layout-portrait_hero_choices");
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-portrait_hero_choices .game-stage");
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-portrait_hero_choices .phase-region");
      expect(fullCss).toMatch(/margin:\s*196px auto 0/);
    });
  });
});

describe("Portrait Split Versus Layout (portrait_split_versus)", () => {
  const mockSlots: QuizLayoutSlots = {
    questionBoxHtml: '<header class="question-title"><div class="question-card-inner"><h1>Which animal is faster?</h1></div></header>',
    heroHtml: "",
    choicesHtml: '<div class="choice-group choice-group-visual visual-answer-grid answer-count-2"><div class="choice-card choice-card-visual visual-answer-card"><figure class="choice-media"><img src="cheetah.png" alt="Cheetah"></figure><div class="visual-answer-label"><b class="choice-label">A</b><span>Cheetah</span></div></div><div class="choice-card choice-card-visual visual-answer-card"><figure class="choice-media"><img src="falcon.png" alt="Peregrine Falcon"></figure><div class="visual-answer-label"><b class="choice-label">B</b><span>Peregrine Falcon</span></div></div></div>',
    phaseHtml: '<div class="thinking-bar"><div class="thinking-track"></div></div><div class="fact-card"><p>The Peregrine Falcon dives at over 240 mph!</p></div>',
  };

  describe("Layout Capability & Registration", () => {
    it("is registered in QUIZ_LAYOUT_CATALOG with 9:16 portrait specifications", () => {
      const capability = QUIZ_LAYOUT_CATALOG.portrait_split_versus;
      expect(capability).toBeDefined();
      expect(capability.id).toBe("portrait_split_versus");
      expect(capability.supportedAspectRatios).toEqual(["9:16"]);
      expect(capability.supportedChoiceCounts).toEqual([2]);
      expect(capability.supportedPresentations).toContain("visual");
      expect(capability.supportedPresentations).toContain("text");
      expect(capability.metrics.render).toEqual({
        width: 860,
        height: 360,
        itemCount: 2,
      });
      expect(capability.media.supported).toContain("choice");
    });

    it("is registered in layout renderers and registry export", () => {
      expect(QUIZ_LAYOUT_RENDERERS.portrait_split_versus).toBe(portraitSplitVersusLayout);
      expect(QUIZ_LAYOUT_REGISTRY.portrait_split_versus).toBe(portraitSplitVersusLayout);
      expect(getQuizLayoutRenderer("portrait_split_versus")).toBe(portraitSplitVersusLayout);
      expect(portraitSplitVersusLayout.id).toBe("portrait_split_versus");
    });
  });

  describe("Body & Slot Rendering", () => {
    it("renders expected HTML structure with question box, versus choices stage, and embedded phase region", () => {
      const rendered = renderQuizLayoutBody("portrait_split_versus", mockSlots);

      expect(rendered).toContain("question-title");
      expect(rendered).toContain("Which animal is faster?");
      expect(rendered).toContain("choice-group");
      expect(rendered).toContain("cheetah.png");
      expect(rendered).toContain("falcon.png");
      expect(rendered).toContain("phase-region");
      expect(rendered).toContain("portrait-phase-embedded");
      expect(rendered).toContain("thinking-bar");
      expect(rendered).toContain("The Peregrine Falcon dives at over 240 mph!");

      // Verify sequence: Question Box -> Versus Comparison Stage -> Embedded Phase Region
      const questionIndex = rendered.indexOf("question-title");
      const choicesIndex = rendered.indexOf("choice-group");
      const phaseIndex = rendered.indexOf("phase-region");

      expect(questionIndex).toBeGreaterThanOrEqual(0);
      expect(choicesIndex).toBeGreaterThan(questionIndex);
      expect(phaseIndex).toBeGreaterThan(choicesIndex);
    });
  });

  describe("9:16 Safe-Zone & Candy Arcade CSS Rules", () => {
    const css = portraitSplitVersusLayout.css("9:16");

    it("contains question box styling centered with compact height and max-width 860px", () => {
      expect(css).toContain(".layout-portrait_split_versus .question-title");
      expect(css).toMatch(/max-width:\s*860px/);
      expect(css).toMatch(/min-height:\s*140px/);
      expect(css).toMatch(/margin:\s*0 auto/);
    });

    it("contains 2-card vertically stacked versus grid with 358px card height, 64px gap, and rival duel shadows", () => {
      expect(css).toContain(".layout-portrait_split_versus .answer-grid");
      expect(css).toContain(".layout-portrait_split_versus .visual-answer-grid");
      expect(css).toMatch(/flex-direction:\s*column/);
      expect(css).toMatch(/--choice-card-height:\s*358px/);
      expect(css).toMatch(/gap:\s*64px/);
      expect(css).toMatch(/border-radius:\s*34px/);
      expect(css).toContain("box-shadow:");
      expect(css).toContain("rgba(255, 30, 86, 0.25)");
      expect(css).toContain("rgba(0, 210, 255, 0.25)");
    });

    it("contains high-impact glowing VS badge with vs-slam-pop entrance and vs-badge-pulse", () => {
      expect(css).toContain(".layout-portrait_split_versus .answer-grid::after");
      expect(css).toMatch(/content:\s*"VS"/);
      expect(css).toContain("linear-gradient(135deg, #FF1361 0%, #FFB703 50%, #00F2FE 100%)");
      expect(css).toContain("vs-slam-pop");
      expect(css).toContain("@keyframes vs-slam-pop");
      expect(css).toContain("vs-badge-pulse");
      expect(css).toContain("@keyframes vs-badge-pulse");
    });

    it("enforces right safe-zone clearance >= 164px via 860px column and stage margin", () => {
      expect(css).toContain(".layout-portrait_split_versus .game-stage");
      // 56px left margin + 860px width = 916px right boundary -> 1080 - 916 = 164px right rail margin!
      expect(css).toMatch(/margin:\s*184px auto 0 56px/);
    });

    it("fixes Phase 2 animation delay bug by coupling entrance to var(--choices-at)", () => {
      expect(css).toContain(".layout-portrait_split_versus.quiz-question-clip .choice-card:nth-child(1)");
      expect(css).toMatch(/calc\(var\(--clip-start,\s*0s\)\s*\+\s*var\(--choices-at,\s*0s\)\s*\+\s*0\.08s\)/);
      expect(css).toMatch(/calc\(var\(--clip-start,\s*0s\)\s*\+\s*var\(--choices-at,\s*0s\)\s*\+\s*0\.22s\)/);
    });

    it("crowns winning contestant card with golden neon aura and dims loser in Phase 4", () => {
      expect(css).toContain(".quiz-question-clip[data-reveal-at] .choice-card.answer-reveal-correct");
      expect(css).toContain("#FFD700");
      expect(css).toContain("0 0 46px rgba(255, 215, 0, 0.9)");
      expect(css).toContain(".quiz-question-clip[data-reveal-at] .choice-card.answer-reveal-incorrect");
      expect(css).toContain("opacity: 0.55");
    });

    it("embeds phase region directly below versus cards and does not pin it to absolute screen bottom", () => {
      expect(css).toContain(".layout-portrait_split_versus .phase-region");
      expect(css).toContain("position: relative");
      expect(css).toContain("bottom: auto");

      // Verifies thinking bar elevated right under cards inside the embedded phase region
      expect(css).toContain(".layout-portrait_split_versus .phase-region > .thinking-bar");
      expect(css).toContain(".layout-portrait_split_versus .phase-region > .fact-card");
    });

    it("integrates seamlessly into global candyArcadeCss output for 9:16 aspect ratio", () => {
      const fullCss = candyArcadeCss({ fontMode: "production", aspectRatio: "9:16" });
      expect(fullCss).toContain(".layout-portrait_split_versus");
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-portrait_split_versus .game-stage");
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-portrait_split_versus .phase-region");
      expect(fullCss).toContain("vs-badge-pulse");
      expect(fullCss).toMatch(/margin:\s*184px auto 0 56px/);
    });
  });
});

describe("Portrait Verdict True/False Layout (portrait_verdict_tf)", () => {
  const mockSlots: QuizLayoutSlots = {
    questionBoxHtml: '<header class="question-title"><div class="question-card-inner"><h1>The Great Wall of China is visible from space with the naked eye.</h1></div></header>',
    heroHtml: '<figure class="image-card hero-image"><img src="great-wall.png" alt="Great Wall"><span class="image-shine"></span></figure>',
    choicesHtml: '<div class="choice-group choice-group-text answer-grid answer-count-2"><div class="choice-card choice-card-text answer-card"><b class="choice-label">A</b><span class="choice-text">True</span></div><div class="choice-card choice-card-text answer-card"><b class="choice-label">B</b><span class="choice-text">False</span></div></div>',
    phaseHtml: '<div class="thinking-bar"><div class="thinking-track"></div></div><div class="fact-card"><p>Astronauts confirm the Great Wall is not visible to the naked eye from orbit!</p></div>',
  };

  describe("Layout Capability & Registration", () => {
    it("is registered in QUIZ_LAYOUT_CATALOG with 9:16 portrait specifications", () => {
      const capability = QUIZ_LAYOUT_CATALOG.portrait_verdict_tf;
      expect(capability).toBeDefined();
      expect(capability.id).toBe("portrait_verdict_tf");
      expect(capability.supportedAspectRatios).toEqual(["9:16"]);
      expect(capability.supportedChoiceCounts).toEqual([2]);
      expect(capability.supportedFormats).toEqual(["true_false"]);
      expect(capability.recommendedFormats).toEqual(["true_false"]);
      expect(capability.supportedPresentations).toEqual(["text"]);
      expect(capability.metrics.render).toEqual({
        width: 860,
        height: 540,
        itemCount: 1,
      });
      expect(capability.media.required).toContain("question");
      expect(capability.media.supported).toContain("question");
    });

    it("is registered in layout renderers and registry export", () => {
      expect(QUIZ_LAYOUT_RENDERERS.portrait_verdict_tf).toBe(portraitVerdictTfLayout);
      expect(QUIZ_LAYOUT_REGISTRY.portrait_verdict_tf).toBe(portraitVerdictTfLayout);
      expect(getQuizLayoutRenderer("portrait_verdict_tf")).toBe(portraitVerdictTfLayout);
      expect(portraitVerdictTfLayout.id).toBe("portrait_verdict_tf");
    });
  });

  describe("Body & Slot Rendering", () => {
    it("renders expected HTML structure with question statement card, hero image, verdict choices, and embedded phase region", () => {
      const rendered = renderQuizLayoutBody("portrait_verdict_tf", mockSlots);

      expect(rendered).toContain("question-title");
      expect(rendered).toContain("The Great Wall of China is visible from space with the naked eye.");
      expect(rendered).toContain("hero-image");
      expect(rendered).toContain("great-wall.png");
      expect(rendered).toContain("choice-group");
      expect(rendered).toContain("True");
      expect(rendered).toContain("False");
      expect(rendered).toContain("phase-region");
      expect(rendered).toContain("portrait-phase-embedded");
      expect(rendered).toContain("thinking-bar");
      expect(rendered).toContain("Astronauts confirm the Great Wall is not visible to the naked eye from orbit!");

      // Verify sequence: Question Statement Card -> Central Visual Hero -> Verdict Choices -> Embedded Phase Region
      const questionIndex = rendered.indexOf("question-title");
      const heroIndex = rendered.indexOf("hero-image");
      const choicesIndex = rendered.indexOf("choice-group");
      const phaseIndex = rendered.indexOf("phase-region");

      expect(questionIndex).toBeGreaterThanOrEqual(0);
      expect(heroIndex).toBeGreaterThan(questionIndex);
      expect(choicesIndex).toBeGreaterThan(heroIndex);
      expect(phaseIndex).toBeGreaterThan(choicesIndex);
    });
  });

  describe("9:16 Safe-Zone & Candy Arcade CSS Rules", () => {
    const css = portraitVerdictTfLayout.css("9:16");

    it("contains question box styling centered statement card style with max-width ~880px", () => {
      expect(css).toContain(".layout-portrait_verdict_tf .question-title");
      expect(css).toMatch(/max-width:\s*880px/);
      expect(css).toMatch(/margin:\s*0 auto/);
    });

    it("contains central visual hero styling with 860px width, 540px height, rounded-3xl border, and glowing depth shadows", () => {
      expect(css).toContain(".layout-portrait_verdict_tf .game-stage > .hero-image");
      expect(css).toMatch(/width:\s*860px/);
      expect(css).toMatch(/height:\s*540px/);
      expect(css).toMatch(/border-radius:\s*(?:32|36)px/);
      expect(css).toMatch(/border:\s*10px solid/);
      expect(css).toContain("box-shadow:");
      expect(css).toContain("rgba(255, 215, 0, 0.28)");
    });

    it("contains 2 oversized high-contrast pill buttons with TRUE and FALSE styling", () => {
      // Pill shape
      expect(css).toContain(".layout-portrait_verdict_tf .choice-card");
      expect(css).toMatch(/border-radius:\s*9999px/);

      // TRUE: Emerald Green styling (#10B981 / #059669 gradient) with bold text and checkmark
      expect(css).toContain("#10B981");
      expect(css).toContain("#059669");
      expect(css).toContain("✓");

      // FALSE: Rose Red styling (#F43F5E / #E11D48 gradient) with bold text and cross
      expect(css).toContain("#F43F5E");
      expect(css).toContain("#E11D48");
      expect(css).toContain("✕");

      // Bold text
      expect(css).toMatch(/font-weight:\s*900/);
    });

    it("enforces at least 140px right safe-zone clearance for TikTok/Reels action rail", () => {
      expect(css).toContain(".layout-portrait_verdict_tf .answer-grid");
      const paddingRightMatches = [...css.matchAll(/padding-right:\s*(\d+)px/g)];
      expect(paddingRightMatches.length).toBeGreaterThan(0);
      for (const match of paddingRightMatches) {
        const paddingRight = Number.parseInt(match[1], 10);
        expect(paddingRight).toBeGreaterThanOrEqual(140);
      }
    });

    it("embeds phase region directly below choices and does not pin it to absolute screen bottom", () => {
      expect(css).toContain(".layout-portrait_verdict_tf .phase-region");
      expect(css).toContain("position: relative");
      expect(css).toContain("bottom: auto");

      // Verifies thinking bar elevated right under choices inside the embedded phase region
      expect(css).toContain(".layout-portrait_verdict_tf .phase-region > .thinking-bar");
      expect(css).toContain(".layout-portrait_verdict_tf .phase-region > .fact-card");
    });

    it("fixes Phase 2 animation delay bug by coupling entrance to var(--choices-at) with spring overshoot", () => {
      expect(css).toContain(".layout-portrait_verdict_tf.quiz-question-clip .choice-card:nth-child(1)");
      expect(css).toMatch(/calc\(var\(--clip-start,\s*0s\)\s*\+\s*var\(--choices-at,\s*0s\)\s*\+\s*0\.06s\)/);
      expect(css).toMatch(/calc\(var\(--clip-start,\s*0s\)\s*\+\s*var\(--choices-at,\s*0s\)\s*\+\s*0\.16s\)/);
    });

    it("crowns winning verdict button with victory bloom and settles losing button in Phase 4", () => {
      expect(css).toContain(".layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-reveal-correct");
      expect(css).toContain("verdict-correct-pop");
      expect(css).toContain("@keyframes verdict-correct-pop");
      expect(css).toContain(".layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-reveal-incorrect");
      expect(css).toContain("verdict-incorrect-settle");
      expect(css).toContain("@keyframes verdict-incorrect-settle");
    });

    it("standardizes embedded phase region alignment sharing x = 470px vertical center line with buttons", () => {
      expect(css).toContain("left: calc((100% - 140px) / 2)");
      expect(css).toContain(".layout-portrait_verdict_tf .phase-region > .thinking-bar");
      expect(css).toContain(".layout-portrait_verdict_tf .phase-region > .fact-card");
      expect(css).toContain("verdict-fact-enter");
    });

    it("guarantees at least 440px bottom clearance buffer for TikTok/Reels creator handle and captions", () => {
      const clearanceMatch = css.match(/margin-bottom:\s*(\d+)px/);
      expect(clearanceMatch).not.toBeNull();
      const bottomClearance = Number.parseInt(clearanceMatch?.[1] ?? "0", 10);
      expect(bottomClearance).toBeGreaterThanOrEqual(440);
    });

    it("integrates seamlessly into global candyArcadeCss output for 9:16 aspect ratio", () => {
      const fullCss = candyArcadeCss({ fontMode: "production", aspectRatio: "9:16" });
      expect(fullCss).toContain(".layout-portrait_verdict_tf");
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-portrait_verdict_tf .game-stage");
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-portrait_verdict_tf .phase-region");
      expect(fullCss).toContain("#10B981");
      expect(fullCss).toContain("#F43F5E");
      expect(fullCss).toMatch(/padding-right:\s*140px/);
      expect(fullCss).toMatch(/margin-bottom:\s*440px/);
    });
  });
});

describe("Portrait Stack List Layout (portrait_stack_list)", () => {
  const mockSlots4Choices: QuizLayoutSlots = {
    questionBoxHtml: '<header class="question-title"><div class="question-card-inner"><h1>What is the chemical symbol for Gold?</h1></div></header>',
    heroHtml: "",
    choicesHtml: '<div class="choice-group choice-group-text answer-grid answer-count-4"><div class="choice-card choice-card-text answer-card"><b class="choice-label">A</b><span class="choice-text">Ag</span></div><div class="choice-card choice-card-text answer-card"><b class="choice-label">B</b><span class="choice-text">Au</span></div><div class="choice-card choice-card-text answer-card"><b class="choice-label">C</b><span class="choice-text">Fe</span></div><div class="choice-card choice-card-text answer-card"><b class="choice-label">D</b><span class="choice-text">Cu</span></div></div>',
    phaseHtml: '<div class="thinking-bar"><div class="thinking-track"></div></div><div class="fact-card"><p>Au comes from the Latin word aurum, meaning shining dawn!</p></div>',
  };

  describe("Layout Capability & Registration", () => {
    it("is registered in QUIZ_LAYOUT_CATALOG with 9:16 portrait specifications", () => {
      const capability = QUIZ_LAYOUT_CATALOG.portrait_stack_list;
      expect(capability).toBeDefined();
      expect(capability.id).toBe("portrait_stack_list");
      expect(capability.supportedAspectRatios).toEqual(["9:16"]);
      expect(capability.supportedChoiceCounts).toEqual([2, 3, 4]);
      expect(capability.supportedFormats).toEqual(["multiple_choice", "true_false"]);
      expect(capability.recommendedFormats).toEqual(["multiple_choice", "true_false"]);
      expect(capability.supportedPresentations).toEqual(["text"]);
      expect(capability.metrics.render).toEqual({
        width: 860,
        height: 720,
        itemCount: 1,
      });
      expect(capability.media.required).toEqual([]);
      expect(capability.media.supported).toEqual([]);
    });

    it("is registered in layout renderers and registry export", () => {
      expect(QUIZ_LAYOUT_RENDERERS.portrait_stack_list).toBe(portraitStackListLayout);
      expect(QUIZ_LAYOUT_REGISTRY.portrait_stack_list).toBe(portraitStackListLayout);
      expect(getQuizLayoutRenderer("portrait_stack_list")).toBe(portraitStackListLayout);
      expect(portraitStackListLayout.id).toBe("portrait_stack_list");
    });
  });

  describe("Body & Slot Rendering", () => {
    it("renders expected HTML structure with question box, choices list, and embedded phase region", () => {
      const rendered = renderQuizLayoutBody("portrait_stack_list", mockSlots4Choices);

      expect(rendered).toContain("question-title");
      expect(rendered).toContain("What is the chemical symbol for Gold?");
      expect(rendered).toContain("choice-group");
      expect(rendered).toContain("answer-count-4");
      expect(rendered).toContain("Au");
      expect(rendered).toContain("phase-region");
      expect(rendered).toContain("portrait-phase-embedded");
      expect(rendered).toContain("thinking-bar");
      expect(rendered).toContain("Au comes from the Latin word aurum");

      // Verify sequence: Question Box -> Choice Group -> Embedded Phase Region
      const questionIndex = rendered.indexOf("question-title");
      const choicesIndex = rendered.indexOf("choice-group");
      const phaseIndex = rendered.indexOf("phase-region");

      expect(questionIndex).toBeGreaterThanOrEqual(0);
      expect(choicesIndex).toBeGreaterThan(questionIndex);
      expect(phaseIndex).toBeGreaterThan(choicesIndex);
    });
  });

  describe("9:16 Safe-Zone & Candy Arcade CSS Rules", () => {
    const css = portraitStackListLayout.css("9:16");

    it("contains question box styling centered with max-width 820px", () => {
      expect(css).toContain(".layout-portrait_stack_list .question-title");
      expect(css).toMatch(/max-width:\s*820px/);
      expect(css).toMatch(/margin:\s*0 auto/);
    });

    it("contains full-width text option list styling supporting 3 or 4 pills", () => {
      expect(css).toContain(".layout-portrait_stack_list .answer-grid");
      expect(css).toContain(".layout-portrait_stack_list .choice-card");
      expect(css).toMatch(/border-radius:\s*9999px/);
      expect(css).toContain(".layout-portrait_stack_list .answer-grid.answer-count-3");
      expect(css).toContain(".layout-portrait_stack_list .answer-grid.answer-count-4");
    });

    it("enforces safe-zone clearance for TikTok/Reels action rail via 820px centered column", () => {
      expect(css).toContain(".layout-portrait_stack_list .answer-grid");
      expect(css).toMatch(/max-width:\s*820px/);
      expect(css).toMatch(/margin:\s*0 auto/);
      // Stage is 820px centered on 1080px canvas -> (1080 - 820) / 2 = 130px clearance on left and right, stage margin-top 184px
      expect(css).toContain("margin: 184px auto 0");
    });

    it("fixes Phase 2 animation delay bug by coupling entrance to var(--choices-at)", () => {
      expect(css).toContain(".layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(1)");
      expect(css).toMatch(/calc\(var\(--clip-start,\s*0s\)\s*\+\s*var\(--choices-at,\s*0s\)\s*\+\s*0\.06s\)/);
      expect(css).toMatch(/calc\(var\(--clip-start,\s*0s\)\s*\+\s*var\(--choices-at,\s*0s\)\s*\+\s*0\.12s\)/);
      expect(css).toMatch(/calc\(var\(--clip-start,\s*0s\)\s*\+\s*var\(--choices-at,\s*0s\)\s*\+\s*0\.18s\)/);
      expect(css).toMatch(/calc\(var\(--clip-start,\s*0s\)\s*\+\s*var\(--choices-at,\s*0s\)\s*\+\s*0\.24s\)/);
    });

    it("wires canonical Choice D (4th choice) arcade palette tokens", () => {
      expect(css).toContain(".layout-portrait_stack_list .choice-card:nth-child(4)");
      expect(css).toContain("--choice-stroke-shadow: #581C87");
      expect(css).toContain("--choice-depth-shadow: #7E22CE");
      expect(css).toContain("#A855F7");
      expect(css).toContain("#3B0764");
    });

    it("implements adaptive vertical rhythm for 2, 3, and 4 choices", () => {
      expect(css).toContain(".layout-portrait_stack_list .answer-grid.answer-count-2");
      expect(css).toMatch(/--choice-card-min-height:\s*156px/);
      expect(css).toMatch(/gap:\s*32px/);

      expect(css).toContain(".layout-portrait_stack_list .answer-grid.answer-count-3");
      expect(css).toMatch(/--choice-card-min-height:\s*132px/);
      expect(css).toMatch(/gap:\s*22px/);

      expect(css).toContain(".layout-portrait_stack_list .answer-grid.answer-count-4");
      expect(css).toMatch(/--choice-card-min-height:\s*114px/);
      expect(css).toMatch(/gap:\s*16px/);
    });

    it("embeds phase region directly below choices and does not pin it to absolute screen bottom", () => {
      expect(css).toContain(".layout-portrait_stack_list .phase-region");
      expect(css).toContain("position: relative");
      expect(css).toContain("bottom: auto");

      // Verifies thinking bar elevated right under choices inside the embedded phase region
      expect(css).toContain(".layout-portrait_stack_list .phase-region > .thinking-bar");
      expect(css).toContain(".layout-portrait_stack_list .phase-region > .fact-card");
    });

    it("guarantees at least 440px bottom clearance buffer for TikTok/Reels creator handle and captions", () => {
      const clearanceMatch = css.match(/margin-bottom:\s*(\d+)px/);
      expect(clearanceMatch).not.toBeNull();
      const bottomClearance = Number.parseInt(clearanceMatch?.[1] ?? "0", 10);
      expect(bottomClearance).toBeGreaterThanOrEqual(440);
    });

    it("anchors mascot container safely above 400px bottom safe zone with safe right rail clearance", () => {
      // Must contain rule anchoring mascot container safely at bottom >= 440px
      expect(css).toContain(".has-mascot.layout-portrait_stack_list .candy-mascot-container");
      expect(css).toMatch(/bottom:\s*440px/);
      expect(css).toMatch(/left:\s*36px/);
      expect(css).toContain("right: var(--safe-zone-right, 140px)");

      const bottomMatches = [...css.matchAll(/bottom:\s*(\d+)px/g)];
      const mascotBottoms = bottomMatches
        .map((m) => Number.parseInt(m[1], 10))
        .filter((val) => val >= 440);
      expect(mascotBottoms.length).toBeGreaterThan(0);
    });

    it("integrates seamlessly into global candyArcadeCss output for 9:16 aspect ratio", () => {
      const fullCss = candyArcadeCss({ fontMode: "production", aspectRatio: "9:16" });
      expect(fullCss).toContain(".layout-portrait_stack_list");
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-portrait_stack_list .game-stage");
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-portrait_stack_list .phase-region");
      expect(fullCss).toMatch(/margin:\s*184px auto 0/);
      expect(fullCss).toMatch(/margin-bottom:\s*440px/);
      expect(fullCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .has-mascot.layout-portrait_stack_list .candy-mascot-container");
      expect(fullCss).toMatch(/bottom:\s*440px/);
    });
  });
});

describe("Step 8: Global 9:16 Safe-Zone CSS & Pipeline Integration", () => {
  const full916Css = candyArcadeCss({ fontMode: "production", aspectRatio: "9:16" });

  describe("Universal 9:16 Safe-Zone Custom Properties", () => {
    it("defines --safe-zone-top, --safe-zone-bottom, and --safe-zone-right on #stage[data-aspect-ratio='9:16']", () => {
      expect(full916Css).toContain("#stage[data-aspect-ratio=\"9:16\"] {");
      expect(full916Css).toContain("--safe-zone-top: 180px;");
      expect(full916Css).toContain("--safe-zone-bottom: 440px;");
      expect(full916Css).toContain("--safe-zone-right: 140px;");
    });

    it("has completely removed legacy conflicting 9:16 rules like bottom: 18px on phase-region", () => {
      expect(full916Css).not.toContain("#stage[data-aspect-ratio=\"9:16\"] .phase-region { left: 36px; right: 36px; bottom: 18px;");
    });

    it("elevates global fallback .phase-region to bottom: var(--safe-zone-bottom, 440px)", () => {
      expect(full916Css).toContain("#stage[data-aspect-ratio=\"9:16\"] .phase-region { left: 36px; right: var(--safe-zone-right, 140px); bottom: var(--safe-zone-bottom, 440px);");
    });

    it("allows .portrait-phase-embedded to reset to natural relative flow", () => {
      expect(full916Css).toContain("#stage[data-aspect-ratio=\"9:16\"] .phase-region.portrait-phase-embedded { position: relative; left: auto; right: auto; bottom: auto; top: auto; width: 100%; transform: none; }");
    });
  });

  describe("Watermark Brand Mark & Counter Badge Safe-Zone Harmony", () => {
    it("positions Counter Badge in top safe zone at top: 0, left: 24px", () => {
      expect(full916Css).toContain("#stage[data-aspect-ratio=\"9:16\"] .game-header { top: 0; left: 24px; transform: none; }");
    });

    it("positions Top-Right Watermark Brand Mark in top safe zone at top: 42px, right: 36px", () => {
      const brandMarkCss = channelBrandMarkCss();
      expect(brandMarkCss).toContain("#stage[data-aspect-ratio=\"9:16\"] .channel-brand-mark {");
      expect(brandMarkCss).toMatch(/top:\s*42px;/);
      expect(brandMarkCss).toMatch(/right:\s*36px;/);
      expect(brandMarkCss).toMatch(/left:\s*auto;/);
    });
  });

  describe("Preview Pipeline (buildSandboxComposition) on 9:16", () => {
    const portraitLayoutScenarios = [
      { layoutId: "portrait_hero_choices" as const, choices: ["Option A", "Option B", "Option C"] },
      { layoutId: "portrait_split_versus" as const, choices: ["Card A", "Card B"], question_format: "multiple_choice" as const },
      { layoutId: "portrait_verdict_tf" as const, choices: ["True", "False"], question_format: "true_false" as const },
      { layoutId: "portrait_stack_list" as const, choices: ["Alpha", "Beta", "Gamma"] },
    ];

    for (const scenario of portraitLayoutScenarios) {
      it(`renders 9:16 preview successfully with layout ${scenario.layoutId}`, () => {
        const preview = buildSandboxComposition({
          aspect_ratio: "9:16",
          layout_id: scenario.layoutId,
          choices: scenario.choices,
          question_format: scenario.question_format,
          question_text: `Testing preview for ${scenario.layoutId}?`,
        });

        expect(preview.html).toContain('data-aspect-ratio="9:16"');
        expect(preview.html).toContain(`layout-${scenario.layoutId}`);
        expect(preview.html).toContain("portrait-phase-embedded");
        expect(preview.css).toContain("--safe-zone-bottom: 440px;");
        expect(preview.css).toContain("--safe-zone-right: 140px;");
        expect(preview.contrast_report.ok).toBe(true);
      });
    }
  });

  describe("Production Pipeline (buildCandyArcadeCompositionBundle) on 9:16", () => {
    it("renders 9:16 production composition with correct aspect ratio markers, canvas size, and portrait layout classes", () => {
      const sampleQuiz: QuizV2 = {
        schema_version: 2,
        episode_id: "ep-portrait-step8",
        age_band: "7-9",
        language: "English",
        questions: [
          {
            id: "q-hero",
            number: 1,
            format: "multiple_choice",
            difficulty: 1,
            question: "What is the tallest tree on Earth?",
            choices: [
              { id: "c1", text: "Coast Redwood" },
              { id: "c2", text: "Giant Sequoia" },
              { id: "c3", text: "Douglas Fir" },
            ],
            correct_choice_id: "c1",
            explanation: "Coast redwoods can exceed 380 feet!",
            fun_fact: "They live for over 2,000 years.",
            source_ids: ["S1"],
            visual_opportunity: "Towering redwood forest",
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
          },
          {
            id: "q-tf",
            number: 2,
            format: "true_false",
            difficulty: 1,
            question: "Lightning is hotter than the sun's surface.",
            choices: [
              { id: "c-t", text: "True" },
              { id: "c-f", text: "False" },
            ],
            correct_choice_id: "c-t",
            explanation: "Lightning can reach 30,000 kelvins, five times hotter than the sun surface.",
            fun_fact: "",
            source_ids: ["S2"],
            visual_opportunity: "Dramatic lightning strike",
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
          },
        ],
      };

      const director = createDefaultDirectorPlan(sampleQuiz);
      director.beats[0].layout_id = "portrait_hero_choices";
      director.beats[0].asset_intents = ["question_illustration"];
      director.beats[1].layout_id = "portrait_verdict_tf";
      director.beats[1].asset_intents = ["question_illustration"];

      const timeline = compileQuizTimeline({
        quiz: sampleQuiz,
        director,
        voicePlan: buildQuizVoicePlan(sampleQuiz, director),
      });

      const bundle = buildCandyArcadeCompositionBundle({
        quiz: sampleQuiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./soundtrack.mp3",
        narrationDurationSeconds: timeline.duration_seconds,
        aspectRatio: "9:16",
        fps: 30,
      });

      expect(bundle.html).toContain('data-aspect-ratio="9:16"');
      expect(bundle.html).toContain('data-width="1080"');
      expect(bundle.html).toContain('data-height="1920"');
      expect(bundle.html).toContain("--safe-zone-top: 180px;");
      expect(bundle.html).toContain("--safe-zone-bottom: 440px;");
      expect(bundle.html).toContain("--safe-zone-right: 140px;");

      const questionFiles = Object.values(bundle.files).join("\n");
      expect(questionFiles).toContain("layout-portrait_hero_choices");
      expect(questionFiles).toContain("layout-portrait_verdict_tf");
      expect(questionFiles).toContain("portrait-phase-embedded");
    });
  });
});


